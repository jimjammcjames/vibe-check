#!/usr/bin/env node

/**
 * Base-Commit Tripwire
 * 
 * Verifies that new/changed tests actually capture behavioral changes by
 * ensuring they FAIL on the base commit (origin/main).
 * 
 * Algorithm:
 * 1. Check if learned entry present AND test files changed
 * 2. If not → exit with "not applicable" status
 * 3. Create a temp worktree at base commit
 * 4. Generate test-only patch from PR changes
 * 5. Apply patch to base worktree
 * 6. Run changed tests on base worktree
 * 7. Classify: strong_pass (assertion fail), weak_pass (compile fail), fail (tests pass)
 * 
 * Exit codes:
 *   0 - Pass (tests fail on base as expected)
 *   1 - Fail (tests pass on base = potential gaming)
 *   2 - Error (git/setup issues)
 *   3 - Not applicable (no learned entry or no test changes)
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { minimatch } from './minimatch.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(HARNESS_ROOT, '..');

// ============================================================================
// Utilities
// ============================================================================

const QUIET = process.env.HARNESS_QUIET === '1';

function log(msg) {
    if (!QUIET) console.log(msg);
}

function logError(msg) {
    console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function logSuccess(msg) {
    console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

function logWarning(msg) {
    console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
}

function logInfo(msg) {
    if (!QUIET) console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
}

function loadConfig() {
    const configPath = join(HARNESS_ROOT, 'config.yml');
    if (!existsSync(configPath)) {
        throw new Error(`Config not found: ${configPath}`);
    }
    const content = readFileSync(configPath, 'utf-8');
    return parseSimpleYaml(content);
}

function parseSimpleYaml(content) {
    const config = { globs: {}, reviewers: {} };
    let currentSection = null;
    let currentGlob = null;
    let currentReviewer = null;

    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed === 'globs:') {
            currentSection = 'globs';
            currentReviewer = null;
            continue;
        }
        if (trimmed === 'reviewers:') {
            currentSection = 'reviewers';
            currentGlob = null;
            continue;
        }
        if (trimmed === 'stages:') {
            currentSection = 'stages';
            continue;
        }

        if (currentSection === 'globs') {
            const globKeyMatch = trimmed.match(/^(\w+):(.*)$/);
            if (globKeyMatch) {
                const key = globKeyMatch[1];
                const value = globKeyMatch[2].trim();
                if (value && value !== '') {
                    config.globs[key] = value.replace(/^["']|["']$/g, '');
                } else {
                    currentGlob = key;
                    config.globs[key] = [];
                }
                continue;
            }

            if (currentGlob && trimmed.startsWith('-')) {
                const pattern = trimmed.slice(1).trim().replace(/^["']|["']$/g, '');
                config.globs[currentGlob].push(pattern);
            }
        }

        if (currentSection === 'reviewers') {
            // Check for reviewer name (e.g., "base_tripwire:")
            const reviewerMatch = trimmed.match(/^(\w+):$/);
            if (reviewerMatch) {
                currentReviewer = reviewerMatch[1];
                config.reviewers[currentReviewer] = {};
                continue;
            }

            // Check for key-value within a reviewer
            if (currentReviewer) {
                const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
                if (kvMatch) {
                    const key = kvMatch[1];
                    let value = kvMatch[2].replace(/^["']|["']$/g, '');
                    // Parse booleans
                    if (value === 'true') value = true;
                    if (value === 'false') value = false;
                    config.reviewers[currentReviewer][key] = value;
                }
            }
        }
    }

    return config;
}

function getDiffFiles(baseRef = 'origin/main') {
    try {
        const base = execSync(`git merge-base HEAD ${baseRef}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        const files = execSync(`git diff --name-only ${base}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8'
        }).trim().split('\n').filter(Boolean);

        // Also include staged files
        const staged = execSync('git diff --cached --name-only', {
            cwd: REPO_ROOT,
            encoding: 'utf-8'
        }).trim().split('\n').filter(Boolean);

        return [...new Set([...files, ...staged])];
    } catch {
        return [];
    }
}

function matchesAnyGlob(file, patterns) {
    if (!patterns) return false;
    if (typeof patterns === 'string') {
        patterns = [patterns];
    }
    return patterns.some(pattern => minimatch(file, pattern));
}

function getLearnedEntries(diffFiles, config) {
    return diffFiles
        .filter(f => matchesAnyGlob(f, config.globs.learned))
        .filter(f => existsSync(join(REPO_ROOT, f)));
}

function getTestFiles(diffFiles, config) {
    const testGlobs = config.globs.testSide || config.globs.tests || [];
    return diffFiles.filter(f => matchesAnyGlob(f, testGlobs));
}

function checkExemption(learnedFiles, exemptTag) {
    for (const file of learnedFiles) {
        const fullPath = join(REPO_ROOT, file);
        if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf-8');
            if (content.includes(exemptTag)) {
                return { exempt: true, file, reason: extractExemptReason(content, exemptTag) };
            }
        }
    }
    return { exempt: false };
}

function extractExemptReason(content, tag) {
    // Look for text after the tag on the same line or next line
    const tagIndex = content.indexOf(tag);
    if (tagIndex === -1) return null;

    const afterTag = content.slice(tagIndex + tag.length, tagIndex + tag.length + 200);
    const firstLine = afterTag.split('\n')[0].trim();
    if (firstLine.startsWith(':') || firstLine.startsWith('-')) {
        return firstLine.replace(/^[:-]\s*/, '').trim();
    }
    return null;
}

// ============================================================================
// Git Worktree Operations
// ============================================================================

function createWorktree(baseRef) {
    const worktreePath = mkdtempSync(join(tmpdir(), 'harness-tripwire-'));

    try {
        // Unset GIT_INDEX_FILE and GIT_DIR to avoid conflicts with commit hooks.
        // During a commit, Git sets these env vars which can interfere with worktree creation.
        const cleanEnv = { ...process.env };
        delete cleanEnv.GIT_INDEX_FILE;
        delete cleanEnv.GIT_DIR;

        execSync(`git worktree add --detach "${worktreePath}" ${baseRef}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: cleanEnv
        });
        return worktreePath;
    } catch (error) {
        rmSync(worktreePath, { recursive: true, force: true });
        throw new Error(`Failed to create worktree: ${error.message}`);
    }
}

function cleanupWorktree(worktreePath) {
    try {
        execSync(`git worktree remove --force "${worktreePath}"`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch {
        // Force cleanup if git worktree remove fails
        rmSync(worktreePath, { recursive: true, force: true });
    }
}

function generateTestOnlyPatch(testFiles) {
    // Generate patch for test files only
    if (!testFiles || testFiles.length === 0) return null;
    const files = testFiles.join(' ');

    try {
        const patch = execSync(`git diff origin/main -- ${files}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large diffs
        });
        return patch;
    } catch (error) {
        throw new Error(`Failed to generate patch: ${error.message}`);
    }
}

function applyPatch(worktreePath, patch) {
    if (!patch || patch.trim() === '') {
        return { success: true, noChanges: true };
    }

    try {
        const result = spawnSync('git', ['apply', '--3way', '-'], {
            cwd: worktreePath,
            input: patch,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.status !== 0) {
            // Try without 3-way merge
            const fallback = spawnSync('git', ['apply', '-'], {
                cwd: worktreePath,
                input: patch,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (fallback.status !== 0) {
                return { success: false, error: fallback.stderr || 'Patch failed to apply' };
            }
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function runTestsOnWorktree(worktreePath, testFiles, config) {
    const testCommand = config.reviewers?.base_tripwire?.run_tests_cmd || 'npm test';

    // Link node_modules instead of slow npm install
    try {
        const hostNodeModules = join(REPO_ROOT, 'node_modules');
        if (existsSync(hostNodeModules)) {
            execSync(`ln -s "${hostNodeModules}" "${join(worktreePath, 'node_modules')}"`, {
                cwd: worktreePath,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        }
    } catch (e) {
        logWarning(`Failed to symlink node_modules: ${e.message}`);
    }

    // Run the tests
    const result = spawnSync('sh', ['-c', testCommand], {
        cwd: worktreePath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000 // 5 min timeout for tests
    });

    return {
        exitCode: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        signal: result.signal
    };
}

function classifyResult(testResult) {
    const { exitCode, stdout, stderr } = testResult;
    const output = (stdout || '') + (stderr || '');

    // Tests passed = BAD (potential gaming)
    if (exitCode === 0) {
        return {
            classification: 'fail',
            reason: 'Tests passed on base commit - they should have failed to catch the regression'
        };
    }

    // Check for compilation/type errors (weak pass)
    const compileErrorPatterns = [
        /cannot find module/i,
        /cannot find name/i,
        /module not found/i,
        /does not exist on type/i,
        /property .* does not exist/i,
        /has no exported member/i,
        /is not assignable to/i,
        /TS\d{4}:/,  // TypeScript error codes
        /SyntaxError/i,
        /ReferenceError.*is not defined/i
    ];

    for (const pattern of compileErrorPatterns) {
        if (pattern.test(output)) {
            return {
                classification: 'weak_pass',
                reason: 'Tests failed to compile on base (depends on new production code)'
            };
        }
    }

    // Assertion/runtime error = strong pass
    return {
        classification: 'strong_pass',
        reason: 'Tests failed with assertion/runtime error on base commit'
    };
}

// ============================================================================
// Main
// ============================================================================

// Track worktree path for cleanup on unexpected termination
let activeWorktreePath = null;

function cleanupOnExit() {
    if (activeWorktreePath) {
        try {
            execSync(`git worktree remove --force "${activeWorktreePath}"`, {
                cwd: REPO_ROOT,
                stdio: 'ignore'
            });
        } catch {
            // Best-effort cleanup, ignore errors
        }
        activeWorktreePath = null;
    }
}

// Register cleanup handlers for unexpected termination
process.on('SIGINT', () => {
    cleanupOnExit();
    process.exit(130);
});
process.on('SIGTERM', () => {
    cleanupOnExit();
    process.exit(143);
});

async function main() {
    log('\n\x1b[36m=== Base-Commit Tripwire ===\x1b[0m\n');

    const config = loadConfig();
    const tripwireConfig = config.reviewers?.base_tripwire || {};

    // Check if tripwire is enabled
    if (tripwireConfig.enabled === false) {
        logInfo('Base tripwire is disabled in config');
        process.exit(0);
    }

    const baseRef = tripwireConfig.base_ref || 'origin/main';
    const exemptTag = tripwireConfig.exempt_tag || '#basefail-exempt';
    const allowWeakPass = tripwireConfig.allow_weak_pass !== false;

    // Get diff files
    const diffFiles = getDiffFiles(baseRef);
    if (diffFiles.length === 0) {
        logInfo('No changed files detected');
        process.exit(0);
    }

    // Check for learned entries
    const learnedFiles = getLearnedEntries(diffFiles, config);
    if (learnedFiles.length === 0) {
        logInfo('No learned entries - tripwire not applicable');
        process.exit(0);
    }

    // Check for test files
    const testFiles = getTestFiles(diffFiles, config);
    if (testFiles.length === 0) {
        logInfo('No test files changed - tripwire not applicable');
        process.exit(0);
    }

    log(`Found ${learnedFiles.length} learned entries and ${testFiles.length} test files\n`);

    // Check for exemption
    const exemption = checkExemption(learnedFiles, exemptTag);
    if (exemption.exempt) {
        logWarning(`Tripwire exempted via ${exemptTag} in ${exemption.file}`);
        if (exemption.reason) {
            log(`  Reason: ${exemption.reason}`);
        }
        process.exit(0);
    }

    // Create worktree
    log(`Creating worktree at ${baseRef}...`);
    let worktreePath;
    try {
        worktreePath = createWorktree(baseRef);
        activeWorktreePath = worktreePath; // Track for signal handler cleanup
        logSuccess(`Worktree created at ${worktreePath}`);
    } catch (error) {
        logError(`Failed to create worktree: ${error.message}`);
        process.exit(2);
    }

    try {
        // Generate and apply test-only patch
        log('\nGenerating test-only patch...');
        const patch = generateTestOnlyPatch(testFiles, config);

        if (!patch || patch.trim() === '') {
            logWarning('No patch to apply (tests may be new files)');
        } else {
            log('Applying patch to base worktree...');
            const patchResult = applyPatch(worktreePath, patch);

            if (!patchResult.success) {
                logError(`Patch failed: ${patchResult.error}`);
                process.exit(2);
            }
            logSuccess('Patch applied');
        }

        // Copy new test files that don't exist on base
        for (const testFile of testFiles) {
            const srcPath = join(REPO_ROOT, testFile);
            const destPath = join(worktreePath, testFile);

            if (existsSync(srcPath) && !existsSync(destPath)) {
                const destDir = dirname(destPath);
                execSync(`mkdir -p "${destDir}"`, { cwd: worktreePath });
                execSync(`cp "${srcPath}" "${destPath}"`, { cwd: REPO_ROOT });
            }
        }

        // Run tests on base
        log('\nRunning tests on base worktree...');
        const testResult = runTestsOnWorktree(worktreePath, testFiles, config);

        // Classify result
        const classification = classifyResult(testResult);
        log('');

        if (classification.classification === 'strong_pass') {
            logSuccess(`STRONG PASS: ${classification.reason}`);
            process.exit(0);
        } else if (classification.classification === 'weak_pass') {
            if (allowWeakPass) {
                logWarning(`WEAK PASS: ${classification.reason}`);
                log('  Consider: Can you write a test that fails behaviorally, not just at compile time?');
                process.exit(0);
            } else {
                logError(`WEAK PASS (not allowed): ${classification.reason}`);
                process.exit(1);
            }
        } else {
            logError(`FAIL: ${classification.reason}`);
            log('\nThis suggests the tests may not actually verify the bug/feature.');
            log('Either:');
            log('  1. Rewrite tests to actually fail on the base commit');
            log(`  2. Add ${exemptTag} to your learned entry with justification`);
            process.exit(1);
        }

    } finally {
        // Cleanup
        log('\nCleaning up worktree...');
        cleanupWorktree(worktreePath);
        activeWorktreePath = null; // Clear tracked path after cleanup
    }
}

main().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(2);
});

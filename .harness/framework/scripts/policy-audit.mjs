#!/usr/bin/env node

/**
 * Policy Audit - Deterministic Compounding Enforcement
 * 
 * Rules:
 *   A: Real code change → Must include learned OR decision entry
 *   B: Learned entry → Must include test delta
 *   C: Memory entry → Must have required fields (Search terms, Related, Tags)
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minimatch } from './minimatch.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(HARNESS_ROOT, '..');

// ============================================================================
// Utilities
// ============================================================================

function log(msg) {
    console.log(msg);
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

function printRecoveryPointers() {
    log(`
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
\x1b[33mRecovery:\x1b[0m
  1. Rerun the right stage:
     - \x1b[36mnpm run harness:iterate\x1b[0m (format + lint fix on changed files)
     - \x1b[36mnpm run harness:post\x1b[0m (full local verification)
  2. If you didn't run prep (or you're stuck):
     - \x1b[36mnpm run harness:prep\x1b[0m (prints MUST summary + grep recipe)
  3. For details:
     - open \x1b[36m.harness/Harness.md\x1b[0m
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
`);
}

function loadConfig() {
    const configPath = join(HARNESS_ROOT, 'harness.yml');
    if (!existsSync(configPath)) {
        throw new Error(`Config not found: ${configPath}`);
    }
    const content = readFileSync(configPath, 'utf-8');
    return parseSimpleYaml(content);
}

function parseSimpleYaml(content) {
    const config = { stages: {}, globs: {} };
    let currentSection = null;
    let currentGlob = null;

    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed === 'stages:') {
            currentSection = 'stages';
            continue;
        }
        if (trimmed === 'globs:') {
            currentSection = 'globs';
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
    }

    return config;
}

function getDiffFiles() {
    try {
        // Get files changed compared to the merge base (for PRs)
        // Fall back to HEAD~1 if no merge base exists
        let base;
        try {
            base = execSync('git merge-base HEAD origin/main', {
                cwd: REPO_ROOT,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
        } catch {
            try {
                base = execSync('git merge-base HEAD main', {
                    cwd: REPO_ROOT,
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe']
                }).trim();
            } catch {
                // Fall back to comparing against parent commit
                base = 'HEAD~1';
            }
        }

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

function getAddedEntryContent(file) {
    try {
        // Check if file exists and read it
        const fullPath = join(REPO_ROOT, file);
        if (existsSync(fullPath)) {
            return readFileSync(fullPath, 'utf-8');
        }
        return null;
    } catch {
        return null;
    }
}

// ============================================================================
// Rule Checks
// ============================================================================

function checkRuleA(diffFiles, config) {
    // Real code change → learned OR decision
    const realCodeFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.realCode));
    const exemptFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.exempt));

    // Check if we have real code changes (not just exempt files)
    const nonExemptRealCode = realCodeFiles.filter(f => !matchesAnyGlob(f, config.globs.exempt));

    if (nonExemptRealCode.length === 0) {
        return { passed: true, message: 'No real code changes detected' };
    }

    // Check for memory entries
    const learnedFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.learned));
    const decisionFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.decisions));

    if (learnedFiles.length === 0 && decisionFiles.length === 0) {
        return {
            passed: false,
            message: `Rule A violated: Real code changed but no memory entry found.
      
Changed code files:
${nonExemptRealCode.map(f => `  - ${f}`).join('\n')}

Fix: Create a learned OR decision entry:
  npm run harness:new:learned -- --slug "your-slug"
  npm run harness:new:decision -- --slug "your-slug"`
        };
    }

    return {
        passed: true,
        message: `Real code changes accompanied by memory entries`,
        learnedFiles,
        decisionFiles
    };
}

function checkRuleB(diffFiles, config, learnedFiles) {
    // Learned entry → test delta
    if (!learnedFiles || learnedFiles.length === 0) {
        return { passed: true, message: 'No learned entries to check' };
    }

    const testFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.tests));

    if (testFiles.length === 0) {
        return {
            passed: false,
            message: `Rule B violated: Learned entry added but no test delta found.
      
Learned entries:
${learnedFiles.map(f => `  - ${f}`).join('\n')}

Fix: Add a test that covers this learning.
If truly untestable, document why in the learned entry.`
        };
    }

    return { passed: true, message: 'Learned entries have accompanying tests' };
}

function checkRuleC(diffFiles, config) {
    // Memory entry → required fields
    const learnedFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.learned));
    const decisionFiles = diffFiles.filter(f => matchesAnyGlob(f, config.globs.decisions));
    const memoryFiles = [...learnedFiles, ...decisionFiles];

    if (memoryFiles.length === 0) {
        return { passed: true, message: 'No memory entries to validate' };
    }

    const violations = [];

    for (const file of memoryFiles) {
        const content = getAddedEntryContent(file);
        if (!content) continue;

        const issues = [];

        // Check for Search terms
        const searchTermsMatch = content.match(/## Search terms\s*\n([\s\S]*?)(?=\n##|$)/);
        if (!searchTermsMatch) {
            issues.push('Missing "## Search terms" section');
        } else {
            const searchContent = searchTermsMatch[1].trim();
            const hasContent = searchContent.split('\n').some(line => {
                const cleaned = line.replace(/^[-*]\s*/, '').trim();
                return cleaned.length > 0;
            });
            if (!hasContent) {
                issues.push('"Search terms" section is empty');
            }
        }

        // Check for Related
        const relatedMatch = content.match(/## Related\s*\n([\s\S]*?)(?=\n##|$)/);
        if (!relatedMatch) {
            issues.push('Missing "## Related" section');
        } else {
            const relatedContent = relatedMatch[1].trim();
            if (!relatedContent || relatedContent === '' ||
                (!relatedContent.includes('NONE') && !relatedContent.includes('http') && !relatedContent.includes('.md'))) {
                issues.push('"Related" must contain links OR "NONE"');
            }
        }

        // Check for Tags
        const tagsMatch = content.match(/## Tags\s*\n([\s\S]*?)(?=\n##|$)/);
        if (!tagsMatch) {
            issues.push('Missing "## Tags" section');
        } else {
            const tagsContent = tagsMatch[1].trim();
            if (!tagsContent.includes('#')) {
                issues.push('"Tags" must contain at least one #tag');
            }
        }

        if (issues.length > 0) {
            violations.push({ file, issues });
        }
    }

    if (violations.length > 0) {
        const details = violations.map(v =>
            `  ${v.file}:\n${v.issues.map(i => `    - ${i}`).join('\n')}`
        ).join('\n\n');

        return {
            passed: false,
            message: `Rule C violated: Memory entries missing required fields.

${details}

Required fields in every memory entry:
  - ## Search terms (with at least one keyword)
  - ## Related (with links OR "NONE")
  - ## Tags (with at least one #tag)`
        };
    }

    return { passed: true, message: 'Memory entries have all required fields' };
}

// ============================================================================
// Main
// ============================================================================

function main() {
    log('\n\x1b[36m=== Policy Audit ===\x1b[0m\n');

    const config = loadConfig();
    const diffFiles = getDiffFiles();

    if (diffFiles.length === 0) {
        logWarning('No changes detected in diff');
        logSuccess('Policy audit passed (no changes to check)');
        return;
    }

    log(`Checking ${diffFiles.length} changed files...\n`);

    let failed = false;

    // Rule A: Real code → memory entry
    const ruleA = checkRuleA(diffFiles, config);
    if (ruleA.passed) {
        logSuccess(`Rule A: ${ruleA.message}`);
    } else {
        logError(`Rule A: FAILED`);
        log(ruleA.message);
        failed = true;
    }

    // Rule B: Learned → test delta
    const ruleB = checkRuleB(diffFiles, config, ruleA.learnedFiles);
    if (ruleB.passed) {
        logSuccess(`Rule B: ${ruleB.message}`);
    } else {
        logError(`Rule B: FAILED`);
        log(ruleB.message);
        failed = true;
    }

    // Rule C: Memory entry → required fields
    const ruleC = checkRuleC(diffFiles, config);
    if (ruleC.passed) {
        logSuccess(`Rule C: ${ruleC.message}`);
    } else {
        logError(`Rule C: FAILED`);
        log(ruleC.message);
        failed = true;
    }

    log('');

    if (failed) {
        logError('Policy audit FAILED');
        printRecoveryPointers();
        process.exit(1);
    }

    logSuccess('Policy audit passed');
}

main();

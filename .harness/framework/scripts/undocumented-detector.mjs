#!/usr/bin/env node

/**
 * Undocumented Changes Detector
 * 
 * A focused agent that ONLY checks if all changes in the diff
 * are covered by corresponding learned/decision entries.
 * 
 * This is separate from the compliance review agent to improve reliability.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

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

// ============================================================================
// Main
// ============================================================================

async function main() {
    log('\n\x1b[36m=== Undocumented Changes Detector ===\x1b[0m\n');

    // Get diff - compare against origin/main to see all uncommitted work
    // This avoids false positives from already-committed changes
    let diff = '';
    try {
        // First try staged + unstaged against origin/main
        diff = execSync('git diff origin/main', { cwd: REPO_ROOT, encoding: 'utf-8' });
    } catch {
        try {
            // Fall back to staged changes only
            diff = execSync('git diff --cached', { cwd: REPO_ROOT, encoding: 'utf-8' });
        } catch {
            log('No diff available');
            process.exit(0);
        }
    }

    if (!diff.trim()) {
        logSuccess('No changes to check');
        process.exit(0);
    }

    // Get learned entries content
    const learnedDir = join(HARNESS_ROOT, 'context', 'learned');
    let memoryContent = '';
    if (existsSync(learnedDir)) {
        const files = execSync(`find "${learnedDir}" -name "*.md" -type f`, { encoding: 'utf-8' })
            .trim().split('\n').filter(Boolean);

        for (const file of files) {
            if (file.endsWith('TIMELINE.md')) continue;
            try {
                memoryContent += `\n### [LEARNED] ${file}\n${readFileSync(file, 'utf-8')}\n`;
            } catch { }
        }
    }

    // Get decision entries content
    const decisionsDir = join(HARNESS_ROOT, 'context', 'decisions');
    if (existsSync(decisionsDir)) {
        const files = execSync(`find "${decisionsDir}" -name "*.md" -type f`, { encoding: 'utf-8' })
            .trim().split('\n').filter(Boolean);

        for (const file of files) {
            if (file.endsWith('TIMELINE.md')) continue;
            try {
                memoryContent += `\n### [DECISION] ${file}\n${readFileSync(file, 'utf-8')}\n`;
            } catch { }
        }
    }

    // Create sandbox
    const sandboxBase = join(REPO_ROOT, 'harness-tests', 'simulation', 'temp');
    if (!existsSync(sandboxBase)) {
        mkdirSync(sandboxBase, { recursive: true });
    }
    const sandboxDir = mkdtempSync(join(sandboxBase, 'undocumented-'));

    // Write files to sandbox
    writeFileSync(join(sandboxDir, 'DIFF.txt'), diff);
    writeFileSync(join(sandboxDir, 'MEMORY_ENTRIES.txt'), memoryContent || 'No memory entries found');

    const prompt = `ENVIRONMENT: Use only cat/grep/echo. DO NOT run npm/node commands.

TASK: Detect undocumented CODE changes.

FILES:
- DIFF.txt: All changes (code and documentation)
- MEMORY_ENTRIES.txt: Existing documentation (both [LEARNED] and [DECISION] entries)

CRITICAL DISTINCTION:
- "Documentation files" = README.md, markdown files describing the project, LICENSE
- "Code files" = .js, .ts, .mjs, .py, .yml config, harness scripts, etc.

WHAT NEEDS LEARNED/DECISION ENTRIES:
- Bug fixes, new features, architectural decisions in CODE files
- Changes to harness framework scripts (.harness/framework/*) - these are code!
- Changes to config files that affect behavior

WHAT DOES NOT NEED ENTRIES:
- Updates to README.md that only explain existing functionality
- Purely cosmetic markdown formatting changes
- Documentation that doesn't introduce new code behavior

INSTRUCTIONS:
1. Read DIFF.txt and identify distinct LOGICAL CODE CHANGE CLUSTERS
   (e.g., "error handling improvements", "model validation", "new API endpoint")
   
2. SKIP any clusters that are purely documentation updates (README changes, markdown reformatting)

3. Read MEMORY_ENTRIES.txt and check which CODE clusters are documented
   - LEARNED entries document bug fixes
   - DECISION entries document new features/architectural choices

4. List any CODE clusters that appear in DIFF but NOT in MEMORY_ENTRIES

MANDATORY: Create RESULT.json:
{
  "change_clusters_found": ["list of distinct CODE changes in diff"],
  "documented_clusters": ["which ones have entries"],
  "undocumented_clusters": ["which ones are MISSING entries"],
  "all_documented": true
}

Run: echo '{JSON}' > RESULT.json`;

    writeFileSync(join(sandboxDir, 'PROMPT.txt'), prompt);

    // Invoke Codex
    log('Analyzing changes for documentation coverage...\n');

    let codexOutput = '';
    let codexStderr = '';
    try {
        codexOutput = execSync(
            `codex exec -s workspace-write -c model_reasoning_effort="low" -m gpt-5.1-codex-mini --skip-git-repo-check -C "${sandboxDir}" -`,
            {
                cwd: sandboxDir,
                encoding: 'utf-8',
                timeout: 120000,
                stdio: ['pipe', 'pipe', 'pipe'],
                input: prompt
            }
        );
    } catch (error) {
        codexOutput = error.stdout || '';
        codexStderr = error.stderr || '';
        if (codexStderr) {
            logError(`Codex stderr: ${codexStderr.slice(0, 500)}`);
        }
    }

    // Save debug output
    writeFileSync(join(sandboxDir, 'CODEX_STDOUT.txt'), codexOutput);
    writeFileSync(join(sandboxDir, 'CODEX_STDERR.txt'), codexStderr);

    log(`Codex output saved to: ${sandboxDir}`);

    // Read result
    const resultPath = join(sandboxDir, 'RESULT.json');
    if (existsSync(resultPath)) {
        const result = JSON.parse(readFileSync(resultPath, 'utf-8'));

        log('--- Change Coverage Analysis ---\n');
        log(`Change Clusters Found: ${result.change_clusters_found?.length || 0}`);
        if (result.change_clusters_found) {
            result.change_clusters_found.forEach(c => log(`  • ${c}`));
        }

        log(`\nDocumented: ${result.documented_clusters?.length || 0}`);
        log(`Undocumented: ${result.undocumented_clusters?.length || 0}`);

        if (result.undocumented_clusters && result.undocumented_clusters.length > 0) {
            log('\n\x1b[33mUndocumented changes detected:\x1b[0m');
            result.undocumented_clusters.forEach(c => logWarning(c));
            log('\nCreate learned entries for these changes:');
            log('  npm run harness:new:learned -- --slug "descriptive-slug"');
            process.exit(1);
        } else {
            logSuccess('All changes are documented');
            process.exit(0);
        }
    } else {
        logWarning('Agent did not produce RESULT.json - manual review recommended');
        log(`Sandbox preserved at: ${sandboxDir}`);
        // Show first 500 chars of output for debugging
        if (codexOutput) {
            log(`\nCodex output preview:\n${codexOutput.slice(0, 500)}`);
        }
        process.exit(0); // Don't fail, just warn
    }
}

main().catch(err => {
    logError(`Detector error: ${err.message}`);
    process.exit(1);
});

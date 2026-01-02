#!/usr/bin/env node

/**
 * Memory Coherence Checker
 * 
 * A dedicated agent that validates memory entry hygiene:
 * 1. Entry type correctness (fix → learned, feature → decision)
 * 2. Topic coherence (one logical change per entry, or properly linked)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';

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

function getChangedLearnedEntries() {
    try {
        const diff = execSync('git diff origin/main --name-only', {
            cwd: REPO_ROOT,
            encoding: 'utf-8'
        }).trim().split('\n').filter(Boolean);

        return diff.filter(f => f.includes('.harness/context/learned/') && f.endsWith('.md'));
    } catch {
        return [];
    }
}

function getChangedDecisionEntries() {
    try {
        const diff = execSync('git diff origin/main --name-only', {
            cwd: REPO_ROOT,
            encoding: 'utf-8'
        }).trim().split('\n').filter(Boolean);

        return diff.filter(f => f.includes('.harness/context/decisions/') && f.endsWith('.md'));
    } catch {
        return [];
    }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    log('\n\x1b[36m=== Memory Coherence Checker ===\x1b[0m\n');

    const learnedEntries = getChangedLearnedEntries();
    const decisionEntries = getChangedDecisionEntries();
    const allEntries = [...learnedEntries, ...decisionEntries];

    if (allEntries.length === 0) {
        logSuccess('No memory entries to check');
        process.exit(0);
    }

    log(`Checking ${allEntries.length} memory entries...\n`);

    // Get diff for context
    let diff = '';
    try {
        diff = execSync('git diff origin/main', { cwd: REPO_ROOT, encoding: 'utf-8' });
    } catch {
        diff = '';
    }

    // Build entry contents
    let entryContents = '';
    for (const entry of allEntries) {
        const fullPath = join(REPO_ROOT, entry);
        if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf-8');
            const entryType = entry.includes('/learned/') ? 'LEARNED' : 'DECISION';
            entryContents += `\n### [${entryType}] ${entry}\n${content}\n`;
        }
    }

    // Create sandbox
    const sandboxBase = join(REPO_ROOT, 'harness-tests', 'simulation', 'temp');
    if (!existsSync(sandboxBase)) {
        mkdirSync(sandboxBase, { recursive: true });
    }
    const sandboxDir = mkdtempSync(join(sandboxBase, 'coherence-'));

    // Write files to sandbox
    writeFileSync(join(sandboxDir, 'DIFF.txt'), diff || 'No diff available');
    writeFileSync(join(sandboxDir, 'ENTRIES.txt'), entryContents);

    const prompt = `ENVIRONMENT: Use only cat/grep/echo. DO NOT run npm/node commands.

TASK: Check memory entry coherence.

FILES:
- DIFF.txt: Code changes being committed
- ENTRIES.txt: Memory entries (marked as [LEARNED] or [DECISION])

RULES:
1. ENTRY TYPE CORRECTNESS:
   - "learned" entries are for BUGS/FIXES (something broke, we fixed it)
   - "decision" entries are for FEATURES/CHANGES (new capability, architectural choice)
   - If a learned entry describes a NEW FEATURE → flag as "wrong_entry_type"
   - If a decision entry describes a BUG FIX → flag as "wrong_entry_type"

2. TOPIC COHERENCE:
   - Each entry should cover ONE logical change
   - If entry mixes multiple UNRELATED changes → flag as "multiple_topics"
   - Exception: Related changes (e.g., fix + test for that fix) are OK together
   - If multiple topics are properly linked via "## Related" section → OK

3. Check each entry and report issues.

MANDATORY: Create COHERENCE.json:
{
  "entries_checked": ["list of entry file paths"],
  "issues": [
    {
      "file": "path/to/entry.md",
      "issue_type": "wrong_entry_type | multiple_topics | missing_links",
      "description": "what's wrong",
      "suggestion": "how to fix"
    }
  ],
  "all_coherent": true
}

- If no issues found, set all_coherent=true and issues=[]
- Be pragmatic: minor bundling of closely-related fixes is fine

Run: echo '{JSON}' > COHERENCE.json`;

    writeFileSync(join(sandboxDir, 'PROMPT.txt'), prompt);

    // Invoke Codex
    log('Analyzing entry coherence...\n');

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

    log(`Sandbox: ${sandboxDir}`);

    // Read result
    const resultPath = join(sandboxDir, 'COHERENCE.json');
    if (existsSync(resultPath)) {
        const result = JSON.parse(readFileSync(resultPath, 'utf-8'));

        log('--- Coherence Analysis ---\n');
        log(`Entries Checked: ${result.entries_checked?.length || 0}`);

        if (result.issues && result.issues.length > 0) {
            log(`\nIssues Found: ${result.issues.length}`);
            for (const issue of result.issues) {
                logWarning(`[${issue.issue_type}] ${issue.file}`);
                log(`  ${issue.description}`);
                if (issue.suggestion) {
                    log(`  → ${issue.suggestion}`);
                }
            }
            log('\nFix the issues above or add justification.');
            process.exit(1);
        } else {
            logSuccess('All entries are coherent');
            process.exit(0);
        }
    } else {
        logWarning('Agent did not produce COHERENCE.json - manual review recommended');
        log(`Sandbox preserved at: ${sandboxDir}`);
        if (codexOutput) {
            log(`\nCodex output preview:\n${codexOutput.slice(0, 500)}`);
        }
        process.exit(0); // Don't fail, just warn
    }
}

main().catch(err => {
    logError(`Coherence checker error: ${err.message}`);
    process.exit(1);
});

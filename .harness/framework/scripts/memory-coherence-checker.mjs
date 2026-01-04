#!/usr/bin/env node

/**
 * Memory Coherence Checker
 * 
 * A dedicated agent that validates memory entry hygiene:
 * 1. Entry type correctness (fix → learned, feature → decision)
 * 2. Topic coherence (one logical change per entry, or properly linked)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent, log, logError, logSuccess, logWarning, REPO_ROOT, HARNESS_ROOT } from '../lib/agent-runner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Coherence Prompt
// ============================================================================

const COHERENCE_PROMPT = `ENVIRONMENT: Use only cat/grep/echo. DO NOT run npm/node commands.

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

MANDATORY: Produce COHERENCE.json as a JSON object (no extra text):
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
`;

// ============================================================================
// Helpers
// ============================================================================

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

    log('Analyzing entry coherence...\n');

    // Use the shared agent runner
    const agentResult = await runAgent({
        name: 'coherence',
        files: {
            'DIFF.txt': diff || 'No diff available',
            'ENTRIES.txt': entryContents
        },
        prompt: COHERENCE_PROMPT,
        outputFile: 'COHERENCE.json',
        providerConfig: { timeout: 120000 }
    });

    // Handle result - ALL failures block, no exceptions
    if (agentResult.rateLimited) {
        logError('AI review unavailable (rate limit/network). Cannot proceed.');
        logError(`Sandbox preserved: ${agentResult.sandboxDir}`);
        process.exit(1);
    }

    if (!agentResult.success) {
        logError('Agent did not produce COHERENCE.json. Cannot verify entry coherence.');
        logError(`Sandbox preserved at: ${agentResult.sandboxDir}`);
        process.exit(1);
    }

    const result = agentResult.result;
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
}

main().catch(err => {
    logError(`Coherence checker error: ${err.message}`);
    process.exit(1);
});

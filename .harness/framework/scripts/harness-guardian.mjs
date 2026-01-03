#!/usr/bin/env node

/**
 * Harness Guardian
 * 
 * Protects the harness itself from gaming attempts.
 * If harness files are modified, it delegates review to an AI agent
 * to ensure changes are legitimate and documented with acceptable reasoning.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent, log, logError, logSuccess, logWarning, REPO_ROOT, HARNESS_ROOT } from '../lib/agent-runner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Guardian Prompt
// ============================================================================

const GUARDIAN_PROMPT = `TASK: Review harness framework changes for "gaming" attempts.

"Gaming" is defined as any deliberate attempt to:
- BYPASS review (e.g., exempting the harness from review in config.yml)
- WEAKEN enforcement (e.g., broadening exclusion lists, relaxing regex patterns)
- HIDE changes (e.g., removing logging, obfuscating diffs)

The following are LEGITIMATE improvements, NOT gaming:
- Performance optimizations (parallel execution, caching, faster models)
- Refactoring for maintainability (simplifying prompts, restructuring code)
- Adding or strengthening validation (stricter schemas, better error handling)
- Improving developer experience (timing visibility, cleaner output)

FILES:
- HARNESS_DIFF.txt: The proposed changes to the framework code/config.
- META_ENTRY.txt: The documentation justifying this change (must have #harness-meta).
- RULES.txt: The canonical anti-gaming rules.

INSTRUCTIONS:
1. Review HARNESS_DIFF.txt for any changes that WEAKEN or BYPASS enforcement.
2. Verify META_ENTRY.txt documents the rationale.
3. If changes are performance-related, refactoring, or strengthening validation, that is NOT gaming.

MANDATORY: Create RESULT.json:
{
  "verdict": "pass" | "fail",
  "reasoning": "detailed explanation of your judgment",
  "gaming_detected": boolean
}

If no gaming behavior is found, you MUST return "verdict": "pass" and "gaming_detected": false.

Run: Output ONLY the JSON object.`;

// ============================================================================
// Main
// ============================================================================

async function main() {
    log('\n\x1b[36m=== Harness Guardian ===\x1b[0m\n');

    // Get changed files against origin/main
    let changedFiles = [];
    try {
        changedFiles = execSync('git diff --name-only origin/main', { cwd: REPO_ROOT, encoding: 'utf-8' })
            .trim().split('\n').filter(Boolean);
    } catch {
        try {
            changedFiles = execSync('git diff --cached --name-only', { cwd: REPO_ROOT, encoding: 'utf-8' })
                .trim().split('\n').filter(Boolean);
        } catch {
            logSuccess('No changes to check');
            process.exit(0);
        }
    }

    // Filter for harness-related files
    const harnessWork = changedFiles.filter(f =>
        f.startsWith('.harness/') ||
        f.startsWith('harness-tests/')
    );

    if (harnessWork.length === 0) {
        logSuccess('No harness modifications detected');
        process.exit(0);
    }

    log(`Modifications to harness core detected:\n${harnessWork.map(f => `  - ${f}`).join('\n')}\n`);

    // Verify Meta-Entry exists in the correct folder with the correct tag
    const metaDir = join(HARNESS_ROOT, 'context', 'decisions', 'harness');
    let hasMetaEntry = false;
    let metaContent = '';

    if (existsSync(metaDir)) {
        const metaFiles = execSync(`find "${metaDir}" -name "*.md" -type f`, { encoding: 'utf-8' })
            .trim().split('\n').filter(Boolean);

        const newMetaFiles = metaFiles.filter(f => {
            const relativePath = f.replace(REPO_ROOT + '/', '');
            return changedFiles.includes(relativePath);
        });

        if (newMetaFiles.length > 0) {
            for (const file of newMetaFiles) {
                const content = readFileSync(file, 'utf-8');
                if (content.includes('#harness-meta')) {
                    hasMetaEntry = true;
                    metaContent += `\n### [META-ENTRY] ${file}\n${content}\n`;
                }
            }
        }
    }

    if (!hasMetaEntry) {
        logError('Harness meta-security violation!');
        log('Changes to .harness/ framework require a specialized decision entry.');
        log('Command: npm run harness:new:meta -- --slug "your-change-description"');
        log('Location: .harness/context/decisions/harness/');
        log('Tag: #harness-meta');
        process.exit(1);
    }

    // Get the diff of ONLY the harness files for the agent to review
    const fileArgs = harnessWork.map(f => `"${f}"`).join(' ');
    let harnessDiff = '';
    try {
        harnessDiff = execSync(`git diff origin/main -- ${fileArgs}`, { cwd: REPO_ROOT, encoding: 'utf-8' });
    } catch {
        harnessDiff = execSync(`git diff --cached -- ${fileArgs}`, { cwd: REPO_ROOT, encoding: 'utf-8' });
    }

    // Get Harness.md rules for context
    const harnessMdPath = join(HARNESS_ROOT, 'Harness.md');
    const harnessRules = existsSync(harnessMdPath) ? readFileSync(harnessMdPath, 'utf-8') : 'No rules doc found';

    log('Delegating integrity review to AI agent...\n');

    // Use the shared agent runner
    const agentResult = await runAgent({
        name: 'guardian',
        files: {
            'HARNESS_DIFF.txt': harnessDiff,
            'META_ENTRY.txt': metaContent,
            'RULES.txt': harnessRules
        },
        prompt: GUARDIAN_PROMPT,
        outputFile: 'RESULT.json'
    });

    // Handle result - ALL failures block, no exceptions
    if (agentResult.rateLimited) {
        logError('AI review unavailable (rate limit/network). Cannot proceed.');
        process.exit(1);
    }

    if (!agentResult.success) {
        logError('Agent did not produce verdict. Could not verify integrity of harness changes. Blocking.');
        process.exit(1);
    }

    const result = agentResult.result;
    log('--- Integrity Review Result ---\n');
    log(`Verdict: ${result.verdict === 'pass' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}`);
    log(`Reasoning: ${result.reasoning}`);

    if (result.verdict === 'fail' || result.gaming_detected) {
        logError('\nINTEGRITY BREACH DETECTED: ACCESS DENIED');
        process.exit(1);
    } else {
        logSuccess('\nIntegrity verified. Harness modification approved.');
        process.exit(0);
    }
}

main().catch(err => {
    logError(`Guardian error: ${err.message}`);
    process.exit(1);
});

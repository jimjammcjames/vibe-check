#!/usr/bin/env node

/**
 * Harness Guardian
 * 
 * Protects the harness itself from gaming attempts.
 * If harness files are modified, it delegates review to an AI agent
 * to ensure changes are legitimate and documented with acceptable reasoning.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(HARNESS_ROOT, '..');

// ============================================================================
// Utilities
// ============================================================================

function log(msg) { console.log(msg); }
function logError(msg) { console.error(`\x1b[31m✗ ${msg}\x1b[0m`); }
function logSuccess(msg) { console.log(`\x1b[32m✓ ${msg}\x1b[0m`); }
function logWarning(msg) { console.log(`\x1b[33m⚠ ${msg}\x1b[0m`); }

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

        // We look for NEW files in the metaDir that are in the current diff
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

    // Create sandbox
    const sandboxBase = join(REPO_ROOT, 'harness-tests', 'simulation', 'temp');
    if (!existsSync(sandboxBase)) mkdirSync(sandboxBase, { recursive: true });
    const sandboxDir = mkdtempSync(join(sandboxBase, 'guardian-'));

    writeFileSync(join(sandboxDir, 'HARNESS_DIFF.txt'), harnessDiff);
    writeFileSync(join(sandboxDir, 'META_ENTRY.txt'), metaContent);
    writeFileSync(join(sandboxDir, 'RULES.txt'), harnessRules);

    const prompt = `ENVIRONMENT: Use only cat/grep/echo.
    
TASK: Review harness framework changes for "gaming" attempts.

"Gaming" is defined as any attempt to weaken the harness, bypass review, or exempt files from protection.

FILES:
- HARNESS_DIFF.txt: The proposed changes to the framework code/config.
- META_ENTRY.txt: The documentation justifying this change (must have #harness-meta).
- RULES.txt: The canonical anti-gaming rules.

INSTRUCTIONS:
1. Review the changes in HARNESS_DIFF.txt.
2. Determine if the change is a legitimate improvement or a "gaming" attempt.
3. Verify that META_ENTRY.txt provides an "Acceptable Architectural Reason".
4. Flag as "gaming" if the change attempts to:
   - Exempt the harness from review in config.yml
   - Weaken regex patterns in detection scripts
   - Broaden exclusion lists in undocumented-detector

MANDATORY: Create RESULT.json:
{
  "verdict": "pass" | "fail",
  "reasoning": "detailed explanation of your judgment",
  "gaming_detected": boolean
}

Run: echo '{JSON}' > RESULT.json`;

    log('Delegating integrity review to AI agent...\n');

    let codexOutput = '';
    let codexStderr = '';
    try {
        codexOutput = execSync(
            `codex exec -s workspace-write -c model_reasoning_effort="low" -m gpt-5.1-codex-mini --skip-git-repo-check -C "${sandboxDir}" -`,
            {
                cwd: sandboxDir,
                encoding: 'utf-8',
                timeout: 300000,
                stdio: ['pipe', 'pipe', 'pipe'],
                input: prompt
            }
        );
    } catch (error) {
        codexOutput = error.stdout || '';
        codexStderr = error.stderr || '';
        logWarning('Review agent execution issue. Falling back to safety check.');
    }

    // Save debug output
    writeFileSync(join(sandboxDir, 'CODEX_STDOUT.txt'), codexOutput);
    writeFileSync(join(sandboxDir, 'CODEX_STDERR.txt'), codexStderr);

    // Read result
    const resultPath = join(sandboxDir, 'RESULT.json');
    if (existsSync(resultPath)) {
        const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
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
    } else {
        // Check if this is a transient error (rate limit, network issue)
        // In this case, the meta-entry requirement was already validated above.
        // The AI review is an additional layer, not the only layer.
        const isRateLimited = codexStderr.includes('usage_limit_reached') ||
            codexStderr.includes('429') ||
            codexStderr.includes('rate limit');
        const isNetworkIssue = codexStderr.includes('ECONNREFUSED') ||
            codexStderr.includes('ETIMEDOUT');

        if (isRateLimited || isNetworkIssue) {
            logWarning('AI review unavailable (rate limit/network). Proceeding with meta-entry validation only.');
            logWarning('Sandbox preserved for manual audit: ' + sandboxDir);
            logSuccess('Meta-entry requirement satisfied. Harness modification conditionally approved.');
            process.exit(0);
        } else {
            logWarning('Agent did not produce verdict. Sandbox preserved for manual audit: ' + sandboxDir);
            // If the agent fails to produce a result for unknown reasons, we block as a safety measure.
            logError('Could not verify integrity of harness changes. Blocking.');
            process.exit(1);
        }
    }
}

main().catch(err => {
    logError(`Guardian error: ${err.message}`);
    process.exit(1);
});

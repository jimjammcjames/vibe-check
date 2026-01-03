#!/usr/bin/env node

/**
 * Undocumented Changes Detector
 * 
 * A focused agent that ONLY checks if all changes in the diff
 * are covered by corresponding learned/decision entries.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent, log, logError, logSuccess, logWarning, REPO_ROOT, HARNESS_ROOT } from '../lib/agent-runner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Detector Prompt
// ============================================================================

const DETECTOR_PROMPT = `ENVIRONMENT: Use only cat/grep/echo. DO NOT run npm/node commands.

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

// ============================================================================
// Main
// ============================================================================

async function main() {
    log('\n\x1b[36m=== Undocumented Changes Detector ===\x1b[0m\n');

    // Get diff
    let diff = '';
    try {
        diff = execSync('git diff origin/main', { cwd: REPO_ROOT, encoding: 'utf-8' });
    } catch {
        try {
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

    log('Analyzing changes for documentation coverage...\n');

    // Use the shared agent runner
    const agentResult = await runAgent({
        name: 'undocumented',
        files: {
            'DIFF.txt': diff,
            'MEMORY_ENTRIES.txt': memoryContent || 'No memory entries found'
        },
        prompt: DETECTOR_PROMPT,
        outputFile: 'RESULT.json',
        providerConfig: { timeout: 120000 }
    });

    // Handle result - ALL failures block, no exceptions
    if (agentResult.rateLimited) {
        logError('AI review unavailable (rate limit/network). Cannot proceed.');
        logError(`Sandbox preserved: ${agentResult.sandboxDir}`);
        process.exit(1);
    }

    if (!agentResult.success) {
        logError('Agent did not produce RESULT.json. Cannot verify documentation.');
        logError(`Sandbox preserved at: ${agentResult.sandboxDir}`);
        process.exit(1);
    }

    const result = agentResult.result;
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
}

main().catch(err => {
    logError(`Detector error: ${err.message}`);
    process.exit(1);
});

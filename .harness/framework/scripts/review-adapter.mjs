#!/usr/bin/env node

/**
 * Review Adapter - Pluggable Anti-Gamification Reviewer
 * 
 * Provides an adapter interface for teams to plug in their existing
 * code review tools (OpenAI, Anthropic, CodeRabbit, etc.)
 * 
 * Built-in adapters:
 *   - stub: Default, returns pass with warning to configure a real adapter
 *   - openai: Direct OpenAI API call (requires HARNESS_OPENAI_API_KEY)
 * 
 * Future adapters (extension points):
 *   - anthropic: Claude API
 *   - coderabbit: CodeRabbit integration
 *   - custom: Webhook to custom endpoint
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minimatch } from './minimatch.mjs';
import { getProvider } from '../providers/index.mjs';

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

function logInfo(msg) {
    console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
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
            const reviewerMatch = trimmed.match(/^(\w+):$/);
            if (reviewerMatch) {
                currentReviewer = reviewerMatch[1];
                config.reviewers[currentReviewer] = {};
                continue;
            }

            if (currentReviewer) {
                const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
                if (kvMatch) {
                    const key = kvMatch[1];
                    let value = kvMatch[2].replace(/^["']|["']$/g, '');
                    if (value === 'true') value = true;
                    if (value === 'false') value = false;
                    config.reviewers[currentReviewer][key] = value;
                }
            }
        }
    }

    return config;
}

function getDiff(baseRef = 'origin/main') {
    try {
        // Get diff from base ref to HEAD (committed changes)
        let diff = '';
        try {
            diff = execSync(`git diff ${baseRef}...HEAD`, {
                cwd: REPO_ROOT,
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch {
            // No common ancestor, use direct diff
            diff = execSync(`git diff ${baseRef}`, {
                cwd: REPO_ROOT,
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe']
            });
        }

        // Also get staged and unstaged changes (working directory)
        const stagedDiff = execSync('git diff --cached', {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const unstagedDiff = execSync('git diff', {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        return [diff, stagedDiff, unstagedDiff].filter(Boolean).join('\n');
    } catch {
        return '';
    }
}

function getDiffFiles(baseRef = 'origin/main') {
    try {
        const base = execSync(`git merge-base HEAD ${baseRef}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        return execSync(`git diff --name-only ${base}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8'
        }).trim().split('\n').filter(Boolean);
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

function getTestFiles(diffFiles, config) {
    const testGlobs = config.globs.testSide || config.globs.tests || [];
    return diffFiles.filter(f => matchesAnyGlob(f, testGlobs));
}

function getLearnedContent(diffFiles, config) {
    const learnedGlob = config.globs.learned;
    const learnedFiles = diffFiles.filter(f => matchesAnyGlob(f, learnedGlob));

    return learnedFiles.map(file => {
        const fullPath = join(REPO_ROOT, file);
        if (existsSync(fullPath)) {
            return { file, content: readFileSync(fullPath, 'utf-8') };
        }
        return null;
    }).filter(Boolean);
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * @typedef {Object} ReviewContext
 * @property {string} diff - Git diff of the PR
 * @property {string[]} testFiles - Changed test files
 * @property {Array<{file: string, content: string}>} learnedEntries - Learned entry contents
 * @property {string} testCommand - Command used to run tests
 */

/**
 * @typedef {Object} ReviewFinding
 * @property {string} file - File path
 * @property {number} [line] - Line number
 * @property {string} pattern - Pattern detected
 * @property {string} description - Description of the issue
 * @property {string} [suggestedFix] - Suggested fix
 */

/**
 * @typedef {Object} ReviewResult
 * @property {'none'|'low'|'medium'|'high'} severity - Overall severity
 * @property {ReviewFinding[]} findings - List of findings
 * @property {string} summary - Brief summary
 */

/**
 * @typedef {Object} ReviewerAdapter
 * @property {string} name - Adapter name
 * @property {() => Promise<boolean>} isConfigured - Check if configured
 * @property {(context: ReviewContext) => Promise<ReviewResult>} review - Run review
 */

// ============================================================================
// Built-in Adapters
// ============================================================================

/** @type {ReviewerAdapter} */
const stubAdapter = {
    name: 'stub',

    async isConfigured() {
        return true; // Stub is always available
    },

    async review() {
        return {
            severity: 'none',
            findings: [],
            summary: 'Stub adapter - no real review performed. Configure a real adapter for anti-gamification detection.'
        };
    }
};

/** @type {ReviewerAdapter} */
const openaiAdapter = {
    name: 'openai',

    async isConfigured() {
        return !!process.env.HARNESS_OPENAI_API_KEY;
    },

    async review(context) {
        const apiKey = process.env.HARNESS_OPENAI_API_KEY;
        const model = process.env.HARNESS_OPENAI_MODEL || 'gpt-4o-mini';

        // Truncate diff if too large
        const maxChars = 100000;
        const diff = context.diff.length > maxChars
            ? context.diff.slice(0, maxChars) + '\n... [truncated]'
            : context.diff;

        const learnedContent = context.learnedEntries
            .map(e => `### ${e.file}\n${e.content}`)
            .join('\n\n');

        const prompt = `You are a code review expert specialized in detecting test gaming patterns.

CONTEXT:
- This PR adds a "learned" entry claiming to fix a bug/issue
- Your job is to verify the accompanying tests actually capture the regression

INPUTS:

<diff>
${diff}
</diff>

<learned_entries>
${learnedContent || 'None'}
</learned_entries>

<test_files>
${context.testFiles.join('\n')}
</test_files>

DETECTION PATTERNS:
1. Meaningless assertions (expect(true), assert(1===1))
2. Over-mocking that bypasses real code paths
3. Tests that would pass before the fix
4. Swallowed exceptions / disabled error handling
5. Snapshot-only tests without behavioral verification
6. "Fix" that loosens validation rather than handling the edge case

OUTPUT (JSON only, no markdown):
{
  "severity": "none|low|medium|high",
  "findings": [
    {
      "file": "path/to/file",
      "line": 42,
      "pattern": "pattern_name",
      "description": "what's wrong",
      "suggestedFix": "how to fix"
   }
  ],
  "summary": "brief assessment"
}`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            return JSON.parse(content);
        } catch (error) {
            return {
                severity: 'none',
                findings: [],
                summary: `OpenAI adapter error: ${error.message}`
            };
        }
    }
};

/** @type {ReviewerAdapter} */
/** @type {ReviewerAdapter} */
const sharedAdapter = {
    name: 'shared',

    async isConfigured() {
        // Always considered configured because it delegates to the provider system
        // which has its own fallbacks
        return true;
    },

    async review(context) {
        const { getProvider } = await import('../providers/index.mjs');
        // Use in-memory file map instead of disk sandbox
        const providerName = process.env.HARNESS_PROVIDER;
        const files = {};
        try {
            files['DIFF.txt'] = context.diff || 'No diff available';
            files['TEST_FILES.txt'] = context.testFiles.join('\n');

            const learnedContent = context.learnedEntries
                .map(e => `### ${e.file}\n${e.content}`)
                .join('\n\n');
            files['LEARNED_ENTRIES.txt'] = learnedContent || 'None';

            // Read Harness.md for the compliance prompt
            const harnessDocPath = join(HARNESS_ROOT, 'Harness.md');
            const harnessMd = existsSync(harnessDocPath)
                ? readFileSync(harnessDocPath, 'utf-8')
                : 'Harness.md not found';
            files['HARNESS_RULES.md'] = harnessMd;

            const prompt = `ENVIRONMENT: All content is provided in the message context.
    
You are a META-LEVEL reviewer enforcing the 3-STEP CHAIN:
  1. BANDAID → Immediate fix applied
  2. META-ANALYSIS → Infrastructure gap identified  
  3. CLOSE GAP → Test/validation added to prevent this issue CLASS

FILES PROVIDED:
- DIFF.txt: The code changes
- LEARNED_ENTRIES.txt: Memory entries created  
- HARNESS_RULES.md: The rules

ANALYSIS:
1. CHANGE TYPE: Is this a FIX (bug/error/correction) or FEATURE (new/add/implement)?
   - Fixes MUST use "learned" entries and MUST have tests
   - Features MAY use "decision" entries and MAY skip tests
   
2. SYSTEMIC GAP ANALYSIS (CRITICAL for learned entries):
   - Does the learned entry have a "## Systemic Gap" section?
   - Is the gap analysis substantive (not just "fixed the bug")?
   - Is there Gap Closure evidence with a REAL file path?
   - Does that file appear in the DIFF.txt?
   
   Good example: "No pre-flight check for model compatibility → Added pre-flight-check.mjs"
   Bad example: "Fixed the issue" (no systemic analysis)
   Bad example: "None" (unacceptable for learned entries)

3. GAMING: Are entries hollow/generic? Do they match the actual code change?

4. QUALITY (1-10): Is Context real? Is Decision specific? Is Systemic Gap deep?

MANDATORY: Create COMPLIANCE_REVIEW.json with this format (build up evidence FIRST, then conclude):
{
  // STEP 1: Classify the change
  "change_type": "fix|feature|unknown",
  
  // STEP 2: Check evidence (run grep to verify before claiming false)
  "systemic_gap_present": true,
  "systemic_gap_quality": "deep|shallow|missing",
  "gap_closure_file": "path/to/file.mjs or 'None'",
  "gap_closure_in_diff": true,
  
  // STEP 3: Score quality
  "quality_score": 7,
  "quality_breakdown": "Why not 10: explain what's missing",
  
  // STEP 4: Check for issues
  "entry_type_mismatch": false,
  "missing_tests_for_fix": false,
  "gaming_detected": false,
  "critical_issues": "None",
  "violations": [],
  
  // STEP 5: Summarize
  "summary": "one line assessment",
  
  // STEP 6: FINAL VERDICT (only after completing all above)
  "compliant": true
}

IMPORTANT: 
- Only set compliant=false if you have verified evidence
- compliant=false requires specific violations listed

Run: Output ONLY the JSON object.

Then edit with your assessment. DO NOT SKIP THIS FILE.`;



            // Perform fast review if requested
            const isFastMode = process.argv.includes('--fast');
            // If using shared/codex provider, this config helps select the right model
            const providerConfig = {
                timeout: 300000
            };

            if (isFastMode) {
                // Use fast model for quick iterations
                providerConfig.model = 'gpt-4.1-nano';
            } else {
                providerConfig.model = 'gpt-4.1-mini';
            }

            // Get provider
            // Check config.yml for default provider
            let configProvider = 'http';
            try {
                const configPath = join(HARNESS_ROOT, 'config.yml');
                if (existsSync(configPath)) {
                    const content = readFileSync(configPath, 'utf-8');
                    const match = content.match(/provider:\s*(\w+)/);
                    if (match) configProvider = match[1];
                }
            } catch (e) { /* ignore config read errors */ }

            const provider = getProvider(providerName || configProvider);
            log(`Invoking provider: ${provider.name}`);

            const startTime = Date.now();
            const result = await provider.invoke({
                prompt,
                files,
                outputFile: 'COMPLIANCE_REVIEW.json',
                config: providerConfig
            });
            const duration = Date.now() - startTime;
            logInfo(`Execution time: ${duration}ms`);

            // ALL failures return high severity - no exceptions
            if (result.rateLimited) {
                logError('AI review unavailable (rate limit/network). Cannot proceed.');
                return {
                    severity: 'high',
                    findings: [],
                    summary: 'AI review unavailable (rate limit/network). Review failed.'
                };
            }

            if (!result.success) {
                logError(result.error || 'Provider failed');
                return {
                    severity: 'high',
                    findings: [],
                    summary: 'Provider did not produce COMPLIANCE_REVIEW.json - Manual Code Review REQUIRED (Agent Failed)'
                };
            }

            // Read the result
            // The provider.invoke() writes the result to the output file, but also returns it as result.result
            const reviewData = result.result;

            if (reviewData) {
                // Determine severity based on gaming detection, mismatches, and quality
                let severity = 'none';
                if (reviewData.gaming_detected) {
                    severity = 'high';
                } else if (!reviewData.compliant) {
                    severity = 'high';
                } else if (reviewData.entry_type_mismatch || reviewData.missing_tests_for_fix) {
                    severity = 'high';
                } else if (reviewData.quality_score && reviewData.quality_score < 5) {
                    severity = 'medium';
                }

                return {
                    severity,
                    findings: (reviewData.violations || []).map(v => ({
                        file: 'N/A',
                        pattern: v.rule,
                        description: v.description
                    })),
                    summary: reviewData.summary || 'Meta-review complete',
                    changeType: reviewData.change_type,
                    entryTypeMismatch: reviewData.entry_type_mismatch,
                    missingTestsForFix: reviewData.missing_tests_for_fix,
                    qualityScore: reviewData.quality_score,
                    qualityBreakdown: reviewData.quality_breakdown,
                    criticalIssues: reviewData.critical_issues,
                    gamingDetected: reviewData.gaming_detected,
                    systemicFlawDetected: reviewData.systemic_flaw_detected
                };
            }

            return {
                severity: 'high',
                findings: [],
                summary: 'Provider produced empty result'
            };

        } catch (error) {
            logError(`Review adapter error: ${error.message}`);
            return {
                severity: 'high',
                findings: [],
                summary: `Review adapter error: ${error.message}`
            };
            // Keep the sandbox for inspection (user requested this as default)
            // No info log needed for in-memory
        }
    }
};

// Registry of available adapters
const adapters = {
    stub: stubAdapter,
    openai: openaiAdapter,
    shared: sharedAdapter,
    // Legacy alias
    codex: sharedAdapter
};

// ============================================================================
// Adapter Selection
// ============================================================================

async function selectAdapter(configuredAdapter) {
    // If HARNESS_PROVIDER env var is set, prefer the shared adapter
    if (process.env.HARNESS_PROVIDER) {
        return sharedAdapter;
    }

    // Explicit adapter in config
    if (configuredAdapter && configuredAdapter !== 'auto' && adapters[configuredAdapter]) {
        const adapter = adapters[configuredAdapter];
        if (await adapter.isConfigured()) {
            return adapter;
        }
        logWarning(`Configured adapter '${configuredAdapter}' is not available, falling back to auto-detection`);
    }

    // Auto-detect: prefer shared (which defaults to codex if configured)
    if (await sharedAdapter.isConfigured()) {
        return sharedAdapter;
    }

    // Fall back to OpenAI if configured (legacy path)
    if (await openaiAdapter.isConfigured()) {
        return openaiAdapter;
    }

    // Fall back to stub
    return stubAdapter;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    log('\n\x1b[36m=== Code Reviewer (Pluggable) ===\x1b[0m\n');

    const config = loadConfig();
    const reviewerConfig = config.reviewers?.code_reviewer || {};

    // Check if reviewer is enabled
    if (reviewerConfig.enabled === false) {
        logInfo('Code reviewer is disabled in config');
        process.exit(0);
    }

    const baseRef = reviewerConfig.base_ref || 'origin/main';
    const failThreshold = reviewerConfig.fail_threshold || 'high';
    const configuredAdapter = reviewerConfig.adapter || 'auto';

    // Select adapter
    const adapter = await selectAdapter(configuredAdapter);
    log(`Using adapter: ${adapter.name} `);

    if (adapter.name === 'stub') {
        logWarning('Using stub adapter - no real anti-gamification review will be performed');
        logInfo('Configure HARNESS_OPENAI_API_KEY for OpenAI review, or add other adapters');
    }

    // Gather context - review ALL commits, not just those with test files
    const diffFiles = getDiffFiles(baseRef);

    if (diffFiles.length === 0) {
        logInfo('No changed files - skipping review');
        process.exit(0);
    }

    const testFiles = getTestFiles(diffFiles, config);

    const context = {
        diff: getDiff(baseRef),
        testFiles,
        learnedEntries: getLearnedContent(diffFiles, config),
        testCommand: reviewerConfig.test_command || 'npm test'
    };

    log(`Reviewing ${diffFiles.length} changed files...\n`);

    // Run review
    const result = await adapter.review(context);

    // Output results - always show the agent response
    log('--- Agent Review Results ---\n');
    log(`Severity: ${result.severity.toUpperCase()}`);
    log(`Summary: ${result.summary} `);

    // Show change type if available
    if (result.changeType) {
        log(`Change Type: ${result.changeType.toUpperCase()} `);
    }
    if (result.entryTypeMismatch) {
        log(`⚠️  Entry Type Mismatch: Fix should use learned entry, not decision`);
    }
    if (result.missingTestsForFix) {
        log(`⚠️  Missing Tests: Fixes require test coverage`);
    }

    // Show quality metrics if available
    if (result.qualityScore !== undefined) {
        log(`Quality Score: ${result.qualityScore}/10`);
    }
    if (result.qualityBreakdown) {
        const breakdown = result.qualityBreakdown.replace(/^Why not 10:\s*/i, '');
        log(`  Why not 10: ${breakdown}`);
    }
    if (result.gamingDetected !== undefined) {
        log(`Gaming Detected: ${result.gamingDetected ? 'YES ⚠️' : 'No'}`);
    }
    if (result.criticalIssues) {
        log(`Critical Issues: ${result.criticalIssues}`);
    }

    if (result.findings.length > 0) {
        log('\nFindings:');
        for (const finding of result.findings) {
            log(`  - [${finding.pattern}] ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
            log(`    ${finding.description}`);
            if (finding.suggestedFix) {
                log(`    Fix: ${finding.suggestedFix}`);
            }
        }
    }

    // On failure, print FULL review JSON for debugging
    if (result.severity === 'high') {
        log('\n--- FULL REVIEW JSON (for debugging) ---');
        log(JSON.stringify(result, null, 2));
        log('--- END REVIEW JSON ---\n');
    }

    // Determine exit based on threshold
    const severityLevels = { none: 0, low: 1, medium: 2, high: 3 };
    const resultLevel = severityLevels[result.severity] || 0;
    const thresholdLevel = severityLevels[failThreshold] || 3;

    log('');

    if (resultLevel >= thresholdLevel) {
        logError(`Review failed: severity ${result.severity} >= threshold ${failThreshold}`);
        process.exit(1);
    } else {
        logSuccess(`Review passed: severity ${result.severity} < threshold ${failThreshold}`);
        process.exit(0);
    }
}

main().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(2);
});

// Export for testing
export { adapters, selectAdapter, stubAdapter, openaiAdapter };

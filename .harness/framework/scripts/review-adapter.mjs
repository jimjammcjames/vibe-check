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
const codexAdapter = {
    name: 'codex',

    async isConfigured() {
        try {
            execSync('which codex', { stdio: 'pipe' });
            return true;
        } catch {
            return false;
        }
    },

    async review(context) {
        const { mkdtempSync, writeFileSync } = await import('node:fs');
        const { tmpdir } = await import('node:os');
        const sandboxDir = mkdtempSync(join(tmpdir(), 'harness-review-'));

        try {
            // Write context files to sandbox
            writeFileSync(join(sandboxDir, 'DIFF.txt'), context.diff || 'No diff available');
            writeFileSync(join(sandboxDir, 'TEST_FILES.txt'), context.testFiles.join('\n'));

            const learnedContent = context.learnedEntries
                .map(e => `### ${e.file}\n${e.content}`)
                .join('\n\n');
            writeFileSync(join(sandboxDir, 'LEARNED_ENTRIES.txt'), learnedContent || 'None');

            // Read Harness.md for the compliance prompt
            const harnessDocPath = join(HARNESS_ROOT, 'Harness.md');
            const harnessMd = existsSync(harnessDocPath)
                ? readFileSync(harnessDocPath, 'utf-8')
                : 'Harness.md not found';
            writeFileSync(join(sandboxDir, 'HARNESS_RULES.md'), harnessMd);

            const prompt = `You are a compliance reviewer. Your ONLY task is to analyze files and write a JSON report.

STEP 1: Read these files in the current directory:
- HARNESS_RULES.md (the rules)
- DIFF.txt (git diff of changes)
- LEARNED_ENTRIES.txt (memory entries created)

STEP 2: Check these rules:
1. MEMORY: If code files (*.ts, *.js, *.mjs) changed, is there a learned or decision entry in LEARNED_ENTRIES.txt?
2. FORMAT: Do entries have "Search terms:", "Related:", and "Tags:" sections?

STEP 3: Write COMPLIANCE_REVIEW.json with this exact structure:
{
  "compliant": true_or_false,
  "violations": [{"rule": "MEMORY", "description": "..."}],
  "summary": "one line summary"
}

IMPORTANT: You MUST write COMPLIANCE_REVIEW.json before finishing. Do not explain or ask questions.`;

            writeFileSync(join(sandboxDir, 'PROMPT.txt'), prompt);

            // Run Codex in the sandbox with workspace-write sandbox
            // Use stdin for prompt to avoid shell escaping issues
            // Override model_reasoning_effort to work around potential invalid user config
            // Omit -m to use user's configured model (o4-mini requires API key auth)
            try {
                const codexOutput = execSync(
                    `codex exec -s workspace-write -c model_reasoning_effort="high" --skip-git-repo-check -C "${sandboxDir}" -`,
                    {
                        cwd: sandboxDir,
                        encoding: 'utf-8',
                        timeout: 300000, // 5 minutes
                        stdio: ['pipe', 'pipe', 'pipe'],
                        input: prompt
                    }
                );
                log(`Codex output: ${codexOutput.slice(0, 500)}`);
            } catch (execError) {
                // Codex might exit non-zero but still produce output
                log(`Codex execution note: ${execError.message}`);
                if (execError.stdout) {
                    log(`Codex stdout: ${execError.stdout.slice(0, 500)}`);
                }
                if (execError.stderr) {
                    log(`Codex stderr: ${execError.stderr.slice(0, 500)}`);
                }
            }

            // Read the result
            const resultPath = join(sandboxDir, 'COMPLIANCE_REVIEW.json');
            if (existsSync(resultPath)) {
                const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
                return {
                    severity: result.compliant ? 'none' : 'high',
                    findings: (result.violations || []).map(v => ({
                        file: 'N/A',
                        pattern: v.rule,
                        description: v.description
                    })),
                    summary: result.summary || 'Compliance review complete'
                };
            }

            return {
                severity: 'low',
                findings: [],
                summary: 'Codex did not produce COMPLIANCE_REVIEW.json - manual review recommended'
            };
        } catch (error) {
            return {
                severity: 'none',
                findings: [],
                summary: `Codex adapter error: ${error.message}`
            };
        } finally {
            // Keep the sandbox for inspection (user requested this as default)
            logInfo(`Review sandbox preserved at: ${sandboxDir}`);
        }
    }
};

// Registry of available adapters
const adapters = {
    stub: stubAdapter,
    openai: openaiAdapter,
    codex: codexAdapter
};

// ============================================================================
// Adapter Selection
// ============================================================================

async function selectAdapter(configuredAdapter) {
    // Explicit adapter in config
    if (configuredAdapter && configuredAdapter !== 'auto' && adapters[configuredAdapter]) {
        const adapter = adapters[configuredAdapter];
        if (await adapter.isConfigured()) {
            return adapter;
        }
        logWarning(`Configured adapter '${configuredAdapter}' is not available, falling back to auto-detection`);
    }

    // Auto-detect: prefer Codex CLI if available
    if (await codexAdapter.isConfigured()) {
        return codexAdapter;
    }

    // Fall back to OpenAI if configured
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
    log(`Using adapter: ${adapter.name}`);

    if (adapter.name === 'stub') {
        logWarning('Using stub adapter - no real anti-gamification review will be performed');
        logInfo('Configure HARNESS_OPENAI_API_KEY for OpenAI review, or add other adapters');
    }

    // Gather context
    const diffFiles = getDiffFiles(baseRef);
    const testFiles = getTestFiles(diffFiles, config);

    if (testFiles.length === 0) {
        logInfo('No test files changed - skipping review');
        process.exit(0);
    }

    const context = {
        diff: getDiff(baseRef),
        testFiles,
        learnedEntries: getLearnedContent(diffFiles, config),
        testCommand: reviewerConfig.test_command || 'npm test'
    };

    log(`Reviewing ${testFiles.length} test files...\n`);

    // Run review
    const result = await adapter.review(context);

    // Output results
    log('--- Review Results ---\n');
    log(`Severity: ${result.severity.toUpperCase()}`);
    log(`Summary: ${result.summary}`);

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

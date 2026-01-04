/**
 * Tests for policy-audit.mjs enforcement logic
 *
 * These tests validate the real rule checks and content validation helpers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    loadConfig,
    matchesAnyGlob,
    checkRuleA,
    checkRuleB,
    validateEntryContent
} from '../../.harness/framework/scripts/policy-audit.mjs';

const config = loadConfig();

describe('policy-audit logic', () => {

    describe('file classification (real globs)', () => {
        it('detects TypeScript files in src/', () => {
            assert.ok(matchesAnyGlob('src/index.ts', config.globs.realCode));
            assert.ok(matchesAnyGlob('src/components/Button.tsx', config.globs.realCode));
        });

        it('detects harness script files as real code', () => {
            assert.ok(matchesAnyGlob('.harness/framework/scripts/policy-audit.mjs', config.globs.realCode));
        });

        it('detects exempt files', () => {
            assert.ok(matchesAnyGlob('package.json', config.globs.exempt));
            assert.ok(matchesAnyGlob('README.md', config.globs.exempt));
            assert.ok(matchesAnyGlob('tsconfig.json', config.globs.exempt));
        });

        it('detects test files', () => {
            assert.ok(matchesAnyGlob('src/utils.test.ts', config.globs.tests));
            assert.ok(matchesAnyGlob('harness-tests/tests/example.test.mjs', config.globs.tests));
        });
    });

    describe('Rule A: real code → memory entry', () => {
        it('passes when only exempt files changed', () => {
            const files = ['package.json', 'README.md'];
            const result = checkRuleA(files, config);
            assert.strictEqual(result.passed, true);
        });

        it('fails when real code changed without memory entry', () => {
            const files = ['src/index.ts', 'src/utils.ts'];
            const result = checkRuleA(files, config);
            assert.strictEqual(result.passed, false);
        });

        it('passes when real code changed with learned entry', () => {
            const files = ['src/index.ts', '.harness/context/learned/2025-01-01-fix.md'];
            const result = checkRuleA(files, config);
            assert.strictEqual(result.passed, true);
        });

        it('passes when real code changed with decision entry', () => {
            const files = ['src/index.ts', '.harness/context/decisions/2025-01-01-arch.md'];
            const result = checkRuleA(files, config);
            assert.strictEqual(result.passed, true);
        });
    });

    describe('Rule B: learned → test delta', () => {
        it('passes when no learned entry present', () => {
            const files = ['src/index.ts', '.harness/context/decisions/arch.md'];
            const result = checkRuleB(files, config, []);
            assert.strictEqual(result.passed, true);
        });

        it('fails when learned entry without test', () => {
            const files = ['src/index.ts', '.harness/context/learned/fix.md'];
            const result = checkRuleB(files, config, ['.harness/context/learned/fix.md']);
            assert.strictEqual(result.passed, false);
        });

        it('passes when learned entry with test file', () => {
            const files = ['.harness/context/learned/fix.md', 'src/index.test.ts'];
            const result = checkRuleB(files, config, ['.harness/context/learned/fix.md']);
            assert.strictEqual(result.passed, true);
        });
    });

    describe('Rule C: memory entry → required fields', () => {
        it('validates complete entry with all fields', () => {
            const content = `# Test Entry

## What Happened

Fixed a bug

## Search terms

- authentication
- login error

## Related

NONE

## Tags

#auth #bug
`;
            const issues = validateEntryContent({
                content,
                isLearnedEntry: false,
                diffFiles: []
            });
            assert.strictEqual(issues.length, 0);
        });

        it('fails when Search terms section is missing', () => {
            const content = `# Test Entry

## Related

NONE

## Tags

#bug
`;
            const issues = validateEntryContent({
                content,
                isLearnedEntry: false,
                diffFiles: []
            });
            assert.ok(issues.some(i => i.code === 'SEARCH_MISSING'));
        });

        it('fails when Tags section is missing', () => {
            const content = `# Test Entry

## Search terms

- auth

## Related

NONE
`;
            const issues = validateEntryContent({
                content,
                isLearnedEntry: false,
                diffFiles: []
            });
            assert.ok(issues.some(i => i.code === 'TAGS_MISSING'));
        });
    });

    describe('Rule C: Systemic Gap enforcement (learned entries)', () => {
        it('fails when Systemic Gap section is missing', () => {
            const content = `# Test Entry

## Context

Fixed a bug

## Search terms

- bug

## Related

NONE

## Tags

#bug
`;
            const issues = validateEntryContent({
                content,
                isLearnedEntry: true,
                diffFiles: []
            });
            assert.ok(issues.some(i => i.code === 'GAP_MISSING'));
        });

        it('passes when Systemic Gap has substantive content and gap closure', () => {
            const content = `# Test Entry

## Context

Fixed a bug

## Systemic Gap

**What infrastructure gap allowed this issue class?**

No pre-flight check existed to validate model compatibility before invoking Codex.
This caused silent failures that were hard to debug.

**Gap Closure**:
- Added test: \`harness-tests/tests/model-validation.test.mjs\`
- Added validation: \`.harness/framework/scripts/pre-flight-check.mjs\`

## Search terms

- model, validation

## Related

NONE

## Tags

#infrastructure
`;
            const issues = validateEntryContent({
                content,
                isLearnedEntry: true,
                diffFiles: ['harness-tests/tests/model-validation.test.mjs']
            });
            assert.strictEqual(issues.length, 0);
        });

        it('fails when Gap Closure file not in diff', () => {
            const content = `# Test Entry

## Systemic Gap

**What infrastructure gap allowed this issue class?**

No validation existed. This is substantive content that explains the gap.

**Gap Closure**:
- Added test: \`harness-tests/tests/nonexistent.test.mjs\`

## Search terms

- bug

## Related

NONE

## Tags

#bug
`;
            const issues = validateEntryContent({
                content,
                isLearnedEntry: true,
                diffFiles: ['src/index.ts']
            });
            assert.ok(issues.some(i => i.code === 'GAP_FILE_NOT_IN_DIFF'));
        });
    });
});

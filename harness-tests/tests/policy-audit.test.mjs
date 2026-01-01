/**
 * Tests for policy-audit.mjs enforcement logic
 * 
 * These tests validate the three enforcement rules:
 *   A: Real code change → Must include learned OR decision entry
 *   B: Learned entry → Must include test delta  
 *   C: Memory entry → Must have required fields
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { minimatch } from '../../.harness/framework/scripts/minimatch.mjs';

// We test the logic functions directly rather than running the full script,
// since the script depends on git state

/**
 * Simulates the glob matching logic from policy-audit
 */
function matchesAnyGlob(file, patterns) {
    if (!patterns) return false;
    if (typeof patterns === 'string') {
        patterns = [patterns];
    }
    return patterns.some(pattern => minimatch(file, pattern));
}

// Default globs from harness.yml
const defaultGlobs = {
    realCode: [
        'src/**/*.ts',
        'src/**/*.tsx',
        'src/**/*.js',
        'src/**/*.jsx'
    ],
    exempt: [
        '*.config.*',
        '*.json',
        '.harness/**',
        '.github/**',
        '*.md',
        '.gitignore',
        '.eslintrc*',
        '.prettierrc*',
        'tsconfig.json'
    ],
    tests: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.spec.js',
        '**/__tests__/**',
        '**/test/**',
        '**/tests/**'
    ],
    learned: '.harness/context/learned/**/*.md',
    decisions: '.harness/context/decisions/**/*.md'
};

describe('policy-audit logic', () => {

    describe('file classification', () => {

        describe('realCode detection', () => {
            it('detects TypeScript files in src/', () => {
                assert.ok(matchesAnyGlob('src/index.ts', defaultGlobs.realCode));
                assert.ok(matchesAnyGlob('src/components/Button.tsx', defaultGlobs.realCode));
                assert.ok(matchesAnyGlob('src/utils/helpers.ts', defaultGlobs.realCode));
            });

            it('detects JavaScript files in src/', () => {
                assert.ok(matchesAnyGlob('src/index.js', defaultGlobs.realCode));
                assert.ok(matchesAnyGlob('src/components/App.jsx', defaultGlobs.realCode));
            });

            it('does not detect files outside src/', () => {
                assert.ok(!matchesAnyGlob('lib/index.ts', defaultGlobs.realCode));
                assert.ok(!matchesAnyGlob('index.ts', defaultGlobs.realCode));
            });

            it('does not detect non-code files', () => {
                assert.ok(!matchesAnyGlob('src/styles.css', defaultGlobs.realCode));
                assert.ok(!matchesAnyGlob('src/data.json', defaultGlobs.realCode));
            });
        });

        describe('exempt file detection', () => {
            it('detects config files', () => {
                assert.ok(matchesAnyGlob('eslint.config.js', defaultGlobs.exempt));
                assert.ok(matchesAnyGlob('prettier.config.mjs', defaultGlobs.exempt));
                assert.ok(matchesAnyGlob('vite.config.ts', defaultGlobs.exempt));
            });

            it('detects JSON files', () => {
                assert.ok(matchesAnyGlob('package.json', defaultGlobs.exempt));
                assert.ok(matchesAnyGlob('tsconfig.json', defaultGlobs.exempt));
            });

            it('detects harness files', () => {
                assert.ok(matchesAnyGlob('.harness/Harness.md', defaultGlobs.exempt));
                assert.ok(matchesAnyGlob('.harness/config.yml', defaultGlobs.exempt));
                assert.ok(matchesAnyGlob('.harness/framework/cli/harness.mjs', defaultGlobs.exempt));
            });

            it('detects markdown files', () => {
                assert.ok(matchesAnyGlob('README.md', defaultGlobs.exempt));
                assert.ok(matchesAnyGlob('CHANGELOG.md', defaultGlobs.exempt));
            });

            it('detects gitignore', () => {
                assert.ok(matchesAnyGlob('.gitignore', defaultGlobs.exempt));
            });
        });

        describe('test file detection', () => {
            it('detects .test.ts files', () => {
                assert.ok(matchesAnyGlob('src/utils.test.ts', defaultGlobs.tests));
                assert.ok(matchesAnyGlob('foo.test.ts', defaultGlobs.tests));
            });

            it('detects .spec.ts files', () => {
                assert.ok(matchesAnyGlob('src/utils.spec.ts', defaultGlobs.tests));
            });

            it('detects __tests__ directory files', () => {
                assert.ok(matchesAnyGlob('src/__tests__/utils.ts', defaultGlobs.tests));
                assert.ok(matchesAnyGlob('__tests__/app.js', defaultGlobs.tests));
            });

            it('detects test/ directory files', () => {
                assert.ok(matchesAnyGlob('test/integration.ts', defaultGlobs.tests));
                assert.ok(matchesAnyGlob('tests/unit.ts', defaultGlobs.tests));
            });
        });

        describe('memory entry detection', () => {
            it('detects learned entries', () => {
                assert.ok(matchesAnyGlob('.harness/context/learned/2025-01-01-bug-fix.md', defaultGlobs.learned));
                assert.ok(matchesAnyGlob('.harness/context/learned/some-entry.md', defaultGlobs.learned));
            });

            it('detects decision entries', () => {
                assert.ok(matchesAnyGlob('.harness/context/decisions/2025-01-01-architecture.md', defaultGlobs.decisions));
                assert.ok(matchesAnyGlob('.harness/context/decisions/api-design.md', defaultGlobs.decisions));
            });

            it('does not confuse learned and decision', () => {
                assert.ok(!matchesAnyGlob('.harness/context/learned/foo.md', defaultGlobs.decisions));
                assert.ok(!matchesAnyGlob('.harness/context/decisions/foo.md', defaultGlobs.learned));
            });
        });
    });

    describe('Rule A: real code → memory entry', () => {
        /**
         * Simulates Rule A check logic
         */
        function checkRuleA(files, globs) {
            const realCodeFiles = files.filter(f => matchesAnyGlob(f, globs.realCode));
            const nonExemptRealCode = realCodeFiles.filter(f => !matchesAnyGlob(f, globs.exempt));

            if (nonExemptRealCode.length === 0) {
                return { passed: true, reason: 'no real code changes' };
            }

            const hasLearned = files.some(f => matchesAnyGlob(f, globs.learned));
            const hasDecision = files.some(f => matchesAnyGlob(f, globs.decisions));

            if (!hasLearned && !hasDecision) {
                return { passed: false, reason: 'real code changed but no memory entry' };
            }

            return { passed: true, reason: 'has memory entry' };
        }

        it('passes when only exempt files changed', () => {
            const files = ['package.json', 'README.md', '.gitignore'];
            const result = checkRuleA(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });

        it('fails when real code changed without memory entry', () => {
            const files = ['src/index.ts', 'src/utils.ts'];
            const result = checkRuleA(files, defaultGlobs);
            assert.strictEqual(result.passed, false);
        });

        it('passes when real code changed with learned entry', () => {
            const files = ['src/index.ts', '.harness/context/learned/2025-01-01-fix.md'];
            const result = checkRuleA(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });

        it('passes when real code changed with decision entry', () => {
            const files = ['src/index.ts', '.harness/context/decisions/2025-01-01-arch.md'];
            const result = checkRuleA(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });

        it('passes when only harness files changed', () => {
            const files = ['.harness/Harness.md', '.harness/config.yml'];
            const result = checkRuleA(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });
    });

    describe('Rule B: learned → test delta', () => {
        /**
         * Simulates Rule B check logic
         */
        function checkRuleB(files, globs) {
            const hasLearned = files.some(f => matchesAnyGlob(f, globs.learned));

            if (!hasLearned) {
                return { passed: true, reason: 'no learned entry' };
            }

            const hasTest = files.some(f => matchesAnyGlob(f, globs.tests));

            if (!hasTest) {
                return { passed: false, reason: 'learned entry without test delta' };
            }

            return { passed: true, reason: 'has test delta' };
        }

        it('passes when no learned entry present', () => {
            const files = ['src/index.ts', '.harness/context/decisions/arch.md'];
            const result = checkRuleB(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });

        it('fails when learned entry without test', () => {
            const files = ['src/index.ts', '.harness/context/learned/fix.md'];
            const result = checkRuleB(files, defaultGlobs);
            assert.strictEqual(result.passed, false);
        });

        it('passes when learned entry with .test.ts file', () => {
            const files = ['src/index.ts', '.harness/context/learned/fix.md', 'src/index.test.ts'];
            const result = checkRuleB(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });

        it('passes when learned entry with __tests__ file', () => {
            const files = ['.harness/context/learned/fix.md', 'src/__tests__/index.ts'];
            const result = checkRuleB(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });

        it('passes with decision entry and no test (Rule B only applies to learned)', () => {
            const files = ['src/index.ts', '.harness/context/decisions/arch.md'];
            const result = checkRuleB(files, defaultGlobs);
            assert.strictEqual(result.passed, true);
        });
    });

    describe('Rule C: memory entry → required fields', () => {
        /**
         * Validates required fields in entry content
         */
        function validateEntryFields(content) {
            const issues = [];

            // Check Search terms
            const searchMatch = content.match(/## Search terms\s*\n([\s\S]*?)(?=\n##|$)/);
            if (!searchMatch) {
                issues.push('missing Search terms section');
            } else {
                const searchContent = searchMatch[1].trim();
                const hasContent = searchContent.split('\n').some(line => {
                    const cleaned = line.replace(/^[-*]\s*/, '').trim();
                    return cleaned.length > 0 && !cleaned.startsWith('(');
                });
                if (!hasContent) {
                    issues.push('Search terms section is empty');
                }
            }

            // Check Related
            const relatedMatch = content.match(/## Related\s*\n([\s\S]*?)(?=\n##|$)/);
            if (!relatedMatch) {
                issues.push('missing Related section');
            } else {
                const relatedContent = relatedMatch[1].trim();
                if (!relatedContent.includes('NONE') &&
                    !relatedContent.includes('http') &&
                    !relatedContent.includes('.md')) {
                    issues.push('Related must contain links OR NONE');
                }
            }

            // Check Tags
            const tagsMatch = content.match(/## Tags\s*\n([\s\S]*?)(?=\n##|$)/);
            if (!tagsMatch) {
                issues.push('missing Tags section');
            } else {
                const tagsContent = tagsMatch[1].trim();
                if (!tagsContent.includes('#')) {
                    issues.push('Tags must contain at least one #tag');
                }
            }

            return { passed: issues.length === 0, issues };
        }

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
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, true);
        });

        it('fails when Search terms section is missing', () => {
            const content = `# Test Entry

## What Happened

Fixed a bug

## Related

NONE

## Tags

#bug
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('Search terms')));
        });

        it('fails when Search terms section is empty', () => {
            const content = `# Test Entry

## Search terms

- 

## Related

NONE

## Tags

#bug
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('empty')));
        });

        it('fails when Related section is missing', () => {
            const content = `# Test Entry

## Search terms

- auth

## Tags

#bug
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('Related')));
        });

        it('passes when Related contains NONE', () => {
            const content = `# Test Entry

## Search terms

- auth

## Related

NONE

## Tags

#bug
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, true);
        });

        it('passes when Related contains a link', () => {
            const content = `# Test Entry

## Search terms

- auth

## Related

- [previous fix](./2024-01-01-auth-fix.md)
- https://example.com/issue/123

## Tags

#bug
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, true);
        });

        it('fails when Tags section is missing', () => {
            const content = `# Test Entry

## Search terms

- auth

## Related

NONE
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('Tags')));
        });

        it('fails when Tags has no hashtag', () => {
            const content = `# Test Entry

## Search terms

- auth

## Related

NONE

## Tags

bug, auth
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('#tag')));
        });

        it('passes with multiple tags', () => {
            const content = `# Test Entry

## Search terms

- auth
- login

## Related

NONE

## Tags

#auth #security #bug
`;
            const result = validateEntryFields(content);
            assert.strictEqual(result.passed, true);
        });
    });

    describe('Rule C: Systemic Gap enforcement (learned entries)', () => {
        /**
         * Validates Systemic Gap section for learned entries
         * Enforces 3-step chain: Bandaid → Meta-Analysis → Close Gap
         */
        function validateSystemicGap(content, diffFiles = []) {
            const issues = [];

            // Check for Systemic Gap section
            const gapMatch = content.match(/## Systemic Gap\s*\n([\s\S]*?)(?=\n---|\n##|$)/);

            if (!gapMatch) {
                return { passed: false, issues: ['Missing "## Systemic Gap" section'] };
            }

            const gapContent = gapMatch[1].trim();

            // Must have substantive content (not just template text)
            if (gapContent.length < 50 || gapContent.includes('[What infrastructure gap')) {
                issues.push('"Systemic Gap" section is incomplete');
            }

            // Must contain Gap Closure evidence with file path
            if (!gapContent.includes('Gap Closure') && !gapContent.includes('Added test') &&
                !gapContent.includes('Added validation') && !gapContent.includes('Added pre-flight')) {
                issues.push('"Systemic Gap" must include Gap Closure with file path');
            }

            // If file paths are mentioned, check they appear in diff
            const filePathMatches = gapContent.match(/Added (?:test|validation|pre-flight)[:\s]+`?([^`\n]+(?:\.mjs|\.ts|\.js|\.md))`?/gi);
            if (filePathMatches && diffFiles.length > 0) {
                const referencedPaths = filePathMatches.map(m => {
                    const pathMatch = m.match(/`?([^`\n]+(?:\.mjs|\.ts|\.js|\.md))`?/);
                    return pathMatch ? pathMatch[1] : null;
                }).filter(Boolean);

                const foundInDiff = referencedPaths.some(refPath =>
                    diffFiles.some(diffFile =>
                        diffFile.includes(refPath) || refPath.includes(diffFile.split('/').pop())
                    )
                );

                if (!foundInDiff && referencedPaths.length > 0) {
                    issues.push(`Gap Closure file(s) not in commit: ${referencedPaths.join(', ')}`);
                }
            }

            return { passed: issues.length === 0, issues };
        }

        it('fails when Systemic Gap section is missing', () => {
            const content = `# Test Entry

## Context

Fixed a bug

## Decision

Applied bandaid

## Search terms

- bug

## Related

NONE

## Tags

#bug
`;
            const result = validateSystemicGap(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('Systemic Gap')));
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
            const diffFiles = ['harness-tests/tests/model-validation.test.mjs'];
            const result = validateSystemicGap(content, diffFiles);
            assert.strictEqual(result.passed, true);
        });

        it('fails when Systemic Gap is too shallow', () => {
            const content = `# Test Entry

## Systemic Gap

Fixed the bug.

## Search terms

- bug

## Related

NONE

## Tags

#bug
`;
            const result = validateSystemicGap(content);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('incomplete')));
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
            const diffFiles = ['src/index.ts']; // Different file
            const result = validateSystemicGap(content, diffFiles);
            assert.strictEqual(result.passed, false);
            assert.ok(result.issues.some(i => i.includes('not in commit')));
        });

        it('handles multiple gap closure files with one match', () => {
            const content = `# Test Entry

## Systemic Gap

**What infrastructure gap allowed this issue class?**

Missing integration tests and pre-flight checks for infrastructure validation.

**Gap Closure**:
- Added test: \`tests/integration.test.mjs\`
- Added validation: \`scripts/check.mjs\`

## Search terms

- test

## Related

NONE

## Tags

#test
`;
            const diffFiles = ['scripts/check.mjs']; // One of the two matches
            const result = validateSystemicGap(content, diffFiles);
            assert.strictEqual(result.passed, true);
        });
    });
});


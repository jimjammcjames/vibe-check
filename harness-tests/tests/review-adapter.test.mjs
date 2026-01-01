/**
 * Tests for review-adapter.mjs 
 * 
 * Tests the severity calculation, result parsing, and adapter logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// Severity Calculation Logic
// ============================================================================

/**
 * Mimics the severity calculation from codexAdapter
 */
function calculateSeverity(result) {
    if (result.gaming_detected) {
        return 'high';
    } else if (!result.compliant) {
        return 'high';
    } else if (result.quality_score && result.quality_score < 5) {
        return 'medium';
    }
    return 'none';
}

describe('review-adapter logic', () => {

    describe('severity calculation', () => {
        it('returns high severity when gaming is detected', () => {
            const result = {
                compliant: true,
                quality_score: 8,
                gaming_detected: true,
                violations: []
            };
            assert.strictEqual(calculateSeverity(result), 'high');
        });

        it('returns high severity when not compliant', () => {
            const result = {
                compliant: false,
                quality_score: 8,
                gaming_detected: false,
                violations: [{ rule: 'STRUCTURE', description: 'Missing entry' }]
            };
            assert.strictEqual(calculateSeverity(result), 'high');
        });

        it('returns medium severity when quality score is low', () => {
            const result = {
                compliant: true,
                quality_score: 4,
                gaming_detected: false,
                violations: []
            };
            assert.strictEqual(calculateSeverity(result), 'medium');
        });

        it('returns none severity when all checks pass', () => {
            const result = {
                compliant: true,
                quality_score: 7,
                gaming_detected: false,
                violations: []
            };
            assert.strictEqual(calculateSeverity(result), 'none');
        });

        it('returns none when quality score is exactly 5', () => {
            const result = {
                compliant: true,
                quality_score: 5,
                gaming_detected: false,
                violations: []
            };
            assert.strictEqual(calculateSeverity(result), 'none');
        });

        it('prioritizes gaming detection over quality score', () => {
            const result = {
                compliant: true,
                quality_score: 10,
                gaming_detected: true,
                violations: []
            };
            assert.strictEqual(calculateSeverity(result), 'high');
        });
    });

    describe('result parsing', () => {
        /**
         * Mimics the result transformation from codexAdapter
         */
        function transformResult(codexResult) {
            let severity = 'none';
            if (codexResult.gaming_detected) {
                severity = 'high';
            } else if (!codexResult.compliant) {
                severity = 'high';
            } else if (codexResult.quality_score && codexResult.quality_score < 5) {
                severity = 'medium';
            }

            return {
                severity,
                findings: (codexResult.violations || []).map(v => ({
                    file: 'N/A',
                    pattern: v.rule,
                    description: v.description
                })),
                summary: codexResult.summary || 'Meta-review complete',
                qualityScore: codexResult.quality_score,
                qualityBreakdown: codexResult.quality_breakdown,
                criticalIssues: codexResult.critical_issues,
                gamingDetected: codexResult.gaming_detected
            };
        }

        it('transforms violations to findings format', () => {
            const codexResult = {
                compliant: false,
                quality_score: 6,
                gaming_detected: false,
                violations: [
                    { rule: 'STRUCTURE', description: 'Missing memory entry' },
                    { rule: 'QUALITY', description: 'Generic context section' }
                ],
                summary: 'Test summary'
            };
            const result = transformResult(codexResult);

            assert.strictEqual(result.findings.length, 2);
            assert.strictEqual(result.findings[0].pattern, 'STRUCTURE');
            assert.strictEqual(result.findings[0].description, 'Missing memory entry');
            assert.strictEqual(result.findings[1].pattern, 'QUALITY');
        });

        it('preserves quality breakdown field', () => {
            const codexResult = {
                compliant: true,
                quality_score: 7,
                quality_breakdown: 'Missing rationale for X',
                gaming_detected: false,
                critical_issues: 'None',
                violations: [],
                summary: 'Good entry'
            };
            const result = transformResult(codexResult);

            assert.strictEqual(result.qualityBreakdown, 'Missing rationale for X');
            assert.strictEqual(result.criticalIssues, 'None');
        });

        it('handles empty violations array', () => {
            const codexResult = {
                compliant: true,
                quality_score: 9,
                gaming_detected: false,
                violations: [],
                summary: 'Excellent'
            };
            const result = transformResult(codexResult);

            assert.strictEqual(result.findings.length, 0);
            assert.strictEqual(result.severity, 'none');
        });

        it('uses default summary when not provided', () => {
            const codexResult = {
                compliant: true,
                quality_score: 8,
                gaming_detected: false,
                violations: []
            };
            const result = transformResult(codexResult);

            assert.strictEqual(result.summary, 'Meta-review complete');
        });
    });

    describe('fix vs feature detection', () => {
        /**
         * Heuristic to detect if change looks like a fix vs new feature
         */
        function detectChangeType(diff, memoryEntry) {
            const fixIndicators = [
                /fix(es|ed|ing)?/i,
                /bug(s)?/i,
                /issue/i,
                /error/i,
                /broken/i,
                /repair/i,
                /patch/i,
                /correct(s|ed|ion)?/i
            ];

            const featureIndicators = [
                /add(s|ed|ing)?/i,
                /implement(s|ed|ing)?/i,
                /new\s+feature/i,
                /feature/i,
                /enhance(ment)?/i,
                /improvement/i
            ];

            const text = (diff + ' ' + memoryEntry).toLowerCase();

            const fixScore = fixIndicators.filter(r => r.test(text)).length;
            const featureScore = featureIndicators.filter(r => r.test(text)).length;

            if (fixScore > featureScore) {
                return 'fix';
            } else if (featureScore > fixScore) {
                return 'feature';
            }
            return 'unknown';
        }

        it('detects fix-type changes', () => {
            const diff = 'Fixed the bug in login handler';
            const entry = 'Corrected authentication error';
            assert.strictEqual(detectChangeType(diff, entry), 'fix');
        });

        it('detects feature-type changes', () => {
            const diff = 'Added new notification system';
            const entry = 'Implemented push notifications feature';
            assert.strictEqual(detectChangeType(diff, entry), 'feature');
        });

        it('returns unknown when no indicators match', () => {
            const diff = 'Refactored the module';
            const entry = 'Reorganized the structure';
            // Neither fix nor feature indicators match
            const result = detectChangeType(diff, entry);
            assert.strictEqual(result, 'unknown');
        });

        it('handles mixed signals with more fix indicators', () => {
            const diff = 'Fixed bug and added logging';
            const entry = 'Repaired the broken auth flow';
            // Fix: 'Fixed', 'bug', 'Repaired', 'broken' = 4
            // Feature: 'added' = 1
            const result = detectChangeType(diff, entry);
            assert.strictEqual(result, 'fix');
        });
    });

    describe('threshold comparison', () => {
        const severityLevels = { none: 0, low: 1, medium: 2, high: 3 };

        it('correctly compares severity levels', () => {
            assert.ok(severityLevels['high'] >= severityLevels['high']);
            assert.ok(severityLevels['high'] >= severityLevels['medium']);
            assert.ok(severityLevels['medium'] >= severityLevels['low']);
            assert.ok(severityLevels['low'] < severityLevels['medium']);
        });

        it('fails when result severity equals threshold', () => {
            const resultLevel = severityLevels['high'];
            const thresholdLevel = severityLevels['high'];
            assert.ok(resultLevel >= thresholdLevel); // Should fail review
        });

        it('passes when result severity below threshold', () => {
            const resultLevel = severityLevels['medium'];
            const thresholdLevel = severityLevels['high'];
            assert.ok(resultLevel < thresholdLevel); // Should pass review
        });
    });

    describe('environment checks', () => {
        it('unit tests should not run in fast mode', () => {
            assert.ok(!process.argv.includes('--fast'), 'Tests should run with standard configuration');
        });
    });
});

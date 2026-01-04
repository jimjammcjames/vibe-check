/**
 * Tests for review-adapter.mjs
 *
 * Exercises adapter selection and review result normalization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    adapters,
    selectAdapter,
    getProviderConfig,
    buildReviewResult
} from '../../.harness/framework/scripts/review-adapter.mjs';

async function withEnv(vars, fn) {
    const previous = {};
    for (const key of Object.keys(vars)) {
        previous[key] = process.env[key];
        if (vars[key] === null) {
            delete process.env[key];
        } else {
            process.env[key] = vars[key];
        }
    }
    try {
        return await fn();
    } finally {
        for (const key of Object.keys(vars)) {
            if (previous[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = previous[key];
            }
        }
    }
}

describe('review-adapter logic', () => {
    describe('buildReviewResult', () => {
        it('returns high severity when gaming is detected', () => {
            const result = buildReviewResult({
                compliant: true,
                gaming_detected: true,
                quality_score: 8,
                violations: []
            });
            assert.strictEqual(result.severity, 'high');
        });

        it('returns high severity when not compliant', () => {
            const result = buildReviewResult({
                compliant: false,
                gaming_detected: false,
                quality_score: 8,
                violations: []
            });
            assert.strictEqual(result.severity, 'high');
        });

        it('returns high severity when entry/test mismatches exist', () => {
            const result = buildReviewResult({
                compliant: true,
                gaming_detected: false,
                entry_type_mismatch: true,
                missing_tests_for_fix: false,
                quality_score: 8,
                violations: []
            });
            assert.strictEqual(result.severity, 'high');
        });

        it('returns medium severity when quality score is low', () => {
            const result = buildReviewResult({
                compliant: true,
                gaming_detected: false,
                quality_score: 4,
                violations: []
            });
            assert.strictEqual(result.severity, 'medium');
        });

        it('returns none severity when all checks pass', () => {
            const result = buildReviewResult({
                compliant: true,
                gaming_detected: false,
                quality_score: 7,
                violations: []
            });
            assert.strictEqual(result.severity, 'none');
        });

        it('normalizes violations into findings', () => {
            const result = buildReviewResult({
                compliant: false,
                gaming_detected: false,
                violations: [
                    { rule: 'STRUCTURE', description: 'Missing entry' },
                    'Generic failure'
                ],
                summary: 'Test summary'
            });

            assert.strictEqual(result.findings.length, 2);
            assert.strictEqual(result.findings[0].pattern, 'STRUCTURE');
            assert.strictEqual(result.findings[1].pattern, 'violation');
            assert.strictEqual(result.summary, 'Test summary');
        });
    });

    describe('getProviderConfig', () => {
        it('uses gpt-4.1-nano for fast mode', () => {
            const config = getProviderConfig(true);
            assert.strictEqual(config.model, 'gpt-4.1-nano');
        });

        it('uses gpt-4.1-mini for standard mode', () => {
            const config = getProviderConfig(false);
            assert.strictEqual(config.model, 'gpt-4.1-mini');
        });
    });

    describe('selectAdapter', () => {
        it('prefers shared adapter when HARNESS_PROVIDER is set', async () => {
            const adapter = await withEnv({ HARNESS_PROVIDER: 'stub' }, () =>
                selectAdapter('auto')
            );
            assert.strictEqual(adapter.name, adapters.shared.name);
        });

        it('uses stub adapter when explicitly configured', async () => {
            const adapter = await withEnv({ HARNESS_PROVIDER: null }, () =>
                selectAdapter('stub')
            );
            assert.strictEqual(adapter.name, adapters.stub.name);
        });
    });
});

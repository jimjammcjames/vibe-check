/**
 * Integration tests for review-adapter.mjs
 *
 * Validates the shared adapter can execute with the stub provider.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { adapters } from '../../.harness/framework/scripts/review-adapter.mjs';

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

describe('review-adapter integration', () => {
    it('runs shared adapter via stub provider and returns normalized result', async () => {
        const context = {
            diff: 'diff --git a/file b/file',
            testFiles: ['harness-tests/tests/example.test.mjs'],
            learnedEntries: [],
            testCommand: 'npm test'
        };

        const result = await withEnv({ HARNESS_PROVIDER: 'stub' }, () =>
            adapters.shared.review(context)
        );

        assert.strictEqual(result.severity, 'none');
        assert.ok(result.summary.includes('Stub provider'));
        assert.strictEqual(result.qualityScore, 8);
        assert.strictEqual(result.gamingDetected, false);
    });
});

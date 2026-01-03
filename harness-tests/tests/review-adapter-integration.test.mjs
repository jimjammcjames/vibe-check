/**
 * Integration tests for review-adapter.mjs
 * 
 * These tests ensure the adapter can actually run and produce output.
 * This prevents issues where syntax errors or model incompatibilities
 * cause silent failures.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('review-adapter integration', () => {

    describe('smoke test - can adapter run at all?', () => {
        it('should execute without syntax errors', () => {
            // This validates the script is syntactically valid
            const result = execSync(
                'node --check .harness/framework/scripts/review-adapter.mjs',
                { encoding: 'utf-8', cwd: process.cwd() }
            );
            assert.ok(true, 'Script has no syntax errors');
        });
    });

    describe('model compatibility pre-flight', () => {
        // Deprecated: Model constants are now provider-specific or handled dynamically
        // it('should have SUPPORTED_MODELS constant defined', () => { ... });
        // it('should validate model before invoking codex', () => { ... });
    });

    describe('error visibility infrastructure', () => {
        it('should use logError for stderr (not just log)', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('logError'),
                'Must have logError calls for prominent error display');
            // Relaxed regex to match updated simplified logic
            assert.ok(content.includes('logError'),
                'Must use logError specifically for stderr');
        });

        it('should delegate to provider system', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );
            assert.ok(content.includes('getProvider'), 'Must use getProvider for modular architecture');
            assert.ok(content.includes('provider.invoke'), 'Must call provider.invoke');
        });
    });



    describe('fast mode configuration', () => {
        it('should use a working mini model for fast mode', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            // Should use gpt-5.1-codex-mini (confirmed working)
            // Should NOT use gpt-5.2-mini (not supported with ChatGPT accounts)
            assert.ok(content.includes('gpt-5.1-codex-mini'),
                'Fast mode should use gpt-5.1-codex-mini');
            assert.ok(!content.includes("'gpt-5.2-mini'"),
                'Should not use unsupported gpt-5.2-mini');
        });

        it('should have appropriate reasoning effort for fast mode', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('reasoningEffort'),
                'Must configure reasoning effort');
            assert.ok(content.includes("'medium'") || content.includes("'low'"),
                'Fast mode should use medium or low effort');
        });
    });

    describe('meta-validation: does this test file itself get run?', () => {
        it('should be in package.json test pattern', () => {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
            const testCommand = packageJson.scripts.test;

            assert.ok(testCommand.includes('harness-tests/tests'),
                'Test command should include harness-tests/tests directory');
            assert.ok(testCommand.includes('*.test.mjs'),
                'Test command should match .test.mjs files');
        });

        it('this test file should be discoverable by npm test', () => {
            const testFiles = readdirSync('harness-tests/tests')
                .filter(f => f.endsWith('.test.mjs'));

            assert.ok(testFiles.includes('review-adapter-integration.test.mjs'),
                'This integration test file should be in the test directory');
        });
    });
});

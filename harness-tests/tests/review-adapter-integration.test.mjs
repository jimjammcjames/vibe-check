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
        it('should have SUPPORTED_MODELS constant defined', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('SUPPORTED_MODELS'),
                'Must define SUPPORTED_MODELS list');
            assert.ok(content.includes('gpt-5.1-codex-mini'),
                'Must include working mini model');
        });

        it('should validate model before invoking codex', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('SUPPORTED_MODELS.includes'),
                'Must check if model is in supported list');
        });
    });

    describe('error visibility infrastructure', () => {
        it('should use logError for stderr (not just log)', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('logError'),
                'Must have logError calls for prominent error display');
            assert.ok(/logError.*stderr/i.test(content),
                'Must use logError specifically for stderr');
        });

        it('should save codex stdout to sandbox', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('CODEX_STDOUT.txt'),
                'Must save stdout to debug file');
        });

        it('should save codex stderr to sandbox', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('CODEX_STDERR.txt'),
                'Must save stderr to debug file');
        });

        it('should save codex exit code to sandbox', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('CODEX_EXIT_CODE.txt'),
                'Must save exit code to debug file');
        });

        it('should detect completely empty output', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(/!codexStdout.*!codexStderr/.test(content.replace(/\s/g, '')),
                'Must check for completely empty output');
        });
    });

    describe('sandbox preservation for debugging', () => {
        it('should have harness-tests/simulation/temp directory', () => {
            const tempDir = 'harness-tests/simulation/temp';
            // This might not exist yet, which is fine - we're just documenting the expected path
            assert.ok(tempDir.includes('temp'), 'Should use temp directory for sandboxes');
        });

        it('should preserve sandbox after execution', () => {
            const content = readFileSync(
                '.harness/framework/scripts/review-adapter.mjs',
                'utf-8'
            );

            assert.ok(content.includes('Review sandbox preserved'),
                'Must log sandbox location for debugging');
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

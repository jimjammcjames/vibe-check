/**
 * Tests for harness.mjs CLI orchestrator
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');
const HARNESS_CLI = join(REPO_ROOT, '.harness', 'framework', 'cli', 'harness.mjs');

function runHarness(args) {
    try {
        const result = execSync(`node "${HARNESS_CLI}" ${args}`, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return { output: result, exitCode: 0 };
    } catch (error) {
        // execSync throws on non-zero exit, stdout/stderr are on the error object
        return {
            output: (error.stdout || '') + (error.stderr || ''),
            exitCode: error.status || 1
        };
    }
}

describe('harness CLI', () => {
    describe('prep command', () => {
        it('prints the MUST block from Harness.md', () => {
            const result = runHarness('prep');

            assert.strictEqual(result.exitCode, 0, 'prep should exit with code 0');
            assert.ok(result.output.includes('HARNESS MUST BLOCK'), 'should show MUST block header');
            assert.ok(result.output.includes('Quick Start'), 'should include Quick Start section');
            assert.ok(result.output.includes('harness:prep'), 'should mention harness:prep command');
        });

        it('includes lookup instructions', () => {
            const result = runHarness('prep');

            assert.ok(result.output.includes('Lookup Before Creating') || result.output.includes('rg -n'),
                'should include lookup instructions');
        });

        it('reminds to read the full Harness.md', () => {
            const result = runHarness('prep');

            assert.ok(result.output.includes('Harness.md'), 'should mention Harness.md');
        });
    });

    describe('new:learned command', () => {
        let createdFiles = [];

        afterEach(() => {
            // Clean up any created files
            for (const file of createdFiles) {
                if (existsSync(file)) rmSync(file);
            }
            createdFiles = [];
        });

        it('requires --slug argument', () => {
            const result = runHarness('new:learned');

            assert.strictEqual(result.exitCode, 1, 'should fail without --slug');
            assert.ok(result.output.includes('slug'), 'should mention slug in error');
        });

        it('creates a learned entry with date prefix', () => {
            const slug = 'test-fixture-learned-basic';
            const today = new Date().toISOString().slice(0, 10);
            const targetFile = join(REPO_ROOT, '.harness', 'context', 'learned', `${today}-${slug}.md`);
            if (existsSync(targetFile)) rmSync(targetFile);

            const result = runHarness(`new:learned --slug ${slug}`);

            assert.strictEqual(result.exitCode, 0, `should succeed with --slug, got: ${result.output}`);
            assert.ok(result.output.includes('Created'), 'should confirm creation');

            // Find the created file
            const createdFile = join(REPO_ROOT, '.harness', 'context', 'learned', `${today}-${slug}.md`);
            const createdTest = join(REPO_ROOT, 'harness-tests', 'tests', `${slug}.test.mjs`);

            createdFiles.push(createdFile);
            createdFiles.push(createdTest);

            assert.ok(existsSync(createdFile), `file should exist at ${createdFile}`);
            assert.ok(existsSync(createdTest), `test stub should exist at ${createdTest}`);
        });

        it('creates entry with required field sections', () => {
            const slug = 'test-fixture-learned-fields';
            const result = runHarness(`new:learned --slug ${slug}`);
            assert.strictEqual(result.exitCode, 0, 'should succeed');

            const today = new Date().toISOString().slice(0, 10);
            const createdFile = join(REPO_ROOT, '.harness', 'context', 'learned', `${today}-${slug}.md`);
            const createdTest = join(REPO_ROOT, 'harness-tests', 'tests', `${slug}.test.mjs`);
            createdFiles.push(createdFile, createdTest);

            const content = readFileSync(createdFile, 'utf-8');

            assert.ok(content.includes('## Search terms'), 'should have Search terms section');
            assert.ok(content.includes('## Related'), 'should have Related section');
            assert.ok(content.includes('## Tags'), 'should have Tags section');
        });

        it('fails if file already exists', () => {
            const slug = 'test-fixture-learned-collision';

            // Clean up start state just in case
            const today = new Date().toISOString().slice(0, 10);
            const collisionFile = join(REPO_ROOT, '.harness', 'context', 'learned', `${today}-${slug}.md`);
            const collisionTest = join(REPO_ROOT, 'harness-tests', 'tests', `${slug}.test.mjs`);

            if (existsSync(collisionFile)) rmSync(collisionFile);
            if (existsSync(collisionTest)) rmSync(collisionTest);

            // Create first (should succeed)
            const result1 = runHarness(`new:learned --slug ${slug}`);
            assert.strictEqual(result1.exitCode, 0, `first creation should succeed. Output: ${result1.output}`);

            // Update createdFile for afterEach cleanup
            createdFiles.push(collisionFile);
            // Also need to cleanup the test file created by the first run
            createdFiles.push(join(REPO_ROOT, 'harness-tests', 'tests', `${slug}.test.mjs`));

            // Try to create again (should fail)
            const result2 = runHarness(`new:learned --slug ${slug}`);

            assert.strictEqual(result2.exitCode, 1, `second creation should fail. Output: ${result2.output}`);
            assert.ok(result2.output.includes('exists'), 'should mention file exists');
        });
    });

    describe('new:decision command', () => {
        let createdFile = null;

        afterEach(() => {
            if (createdFile && existsSync(createdFile)) {
                rmSync(createdFile);
            }
            createdFile = null;
        });

        it('requires --slug argument', () => {
            const result = runHarness('new:decision');
            assert.strictEqual(result.exitCode, 1, 'should fail without --slug');
        });

        it('creates a decision entry with date prefix', () => {
            const slug = 'test-fixture-decision-basic';
            const today = new Date().toISOString().slice(0, 10);
            const targetFile = join(REPO_ROOT, '.harness', 'context', 'decisions', `${today}-${slug}.md`);
            if (existsSync(targetFile)) rmSync(targetFile);

            const result = runHarness(`new:decision --slug ${slug}`);

            assert.strictEqual(result.exitCode, 0, `should succeed with --slug, got: ${result.output}`);

            createdFile = join(REPO_ROOT, '.harness', 'context', 'decisions', `${today}-${slug}.md`);

            assert.ok(existsSync(createdFile), 'file should exist');
        });

        it('creates entry with decision-specific sections', () => {
            const slug = 'test-fixture-decision-sections';
            const today = new Date().toISOString().slice(0, 10);
            const targetFile = join(REPO_ROOT, '.harness', 'context', 'decisions', `${today}-${slug}.md`);
            if (existsSync(targetFile)) rmSync(targetFile);

            const result = runHarness(`new:decision --slug ${slug}`);
            assert.strictEqual(result.exitCode, 0, 'should succeed');

            createdFile = join(REPO_ROOT, '.harness', 'context', 'decisions', `${today}-${slug}.md`);

            const content = readFileSync(createdFile, 'utf-8');

            assert.ok(content.includes('## Context'), 'should have Context section');
            assert.ok(content.includes('## Decision'), 'should have Decision section');
            assert.ok(content.includes('## Rationale'), 'should have Rationale section');
            assert.ok(content.includes('## Search terms'), 'should have Search terms section');
        });
    });

    describe('post command', () => {
        it('starts post verification', () => {
            // Note: post command runs npm test as first step, which would cause recursion.
            // We use a short timeout to just verify the command is recognized.
            try {
                execSync(`node "${HARNESS_CLI}" post`, {
                    cwd: REPO_ROOT,
                    encoding: 'utf-8',
                    timeout: 500,  // Kill after 500ms - enough to print header
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                assert.fail('Expected timeout to kill the command');
            } catch (error) {
                // Either timeout or actual failure, both are fine
                const output = (error.stdout || '') + (error.stderr || '');
                assert.ok(output.includes('harness:post'), 'should recognize post command');
            }
        });
    });

    describe('ci command', () => {
        it('starts ci verification', () => {
            // Note: ci command runs npm test, which would cause recursion.
            // We use a short timeout to just verify the command is recognized.
            try {
                execSync(`node "${HARNESS_CLI}" ci`, {
                    cwd: REPO_ROOT,
                    encoding: 'utf-8',
                    timeout: 500,  // Kill after 500ms - enough to print header
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                assert.fail('Expected timeout to kill the command');
            } catch (error) {
                // Either timeout or actual failure, both are fine
                const output = (error.stdout || '') + (error.stderr || '');
                assert.ok(output.includes('harness:ci'), 'should recognize ci command');
            }
        });
    });

    describe('help/usage', () => {
        it('shows usage when no command given', () => {
            const result = runHarness('');

            assert.strictEqual(result.exitCode, 1, 'should exit with error');
            assert.ok(result.output.includes('Usage') || result.output.includes('prep'),
                'should show usage info');
        });

        it('shows usage for unknown command', () => {
            const result = runHarness('unknown-command');

            assert.strictEqual(result.exitCode, 1, 'should exit with error');
        });
    });
});

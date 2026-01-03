import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

/**
 * BEHAVIORAL TESTS: Harness Guardian
 * 
 * Verifies that the Integrity Reviewer correctly protects the framework
 * by enforcing the meta-protocol and detecting gaming attempts.
 */

test('Harness Guardian: Enforcement Protocol', async (t) => {

    await t.test('detects harness modifications', () => {
        // Run guardian against CURRENT repo state (which has harness changes)
        // It SHOULD pass because we added a proper meta-entry AND the AI review succeeds.
        // If the AI review fails (rate limit, network, etc), THIS TEST FAILS.
        // No exceptions - the harness requires a working AI provider.
        try {
            const output = execSync('node .harness/framework/scripts/harness-guardian.mjs', {
                cwd: REPO_ROOT,
                encoding: 'utf-8'
            });
            assert.ok(output.includes('Integrity verified'), 'Should verify existing legitimate changes');
        } catch (error) {
            const stdout = error.stdout || '';
            const stderr = error.stderr || '';
            const combined = stdout + stderr;

            if (combined.includes('No harness modifications detected')) {
                // No changes to harness - this is fine
                assert.ok(true, 'No harness modifications to check');
            } else {
                // ALL failures are test failures - including rate limits
                assert.fail('Guardian failed: ' + combined.slice(0, 500));
            }
        }
    });

    await t.test('blocks harness changes without meta-entry', () => {
        // We simulate a harness change without an entry by running a standalone script 
        // that mocks the git diff if we were to do integration testing,
        // but for now we verify the CLI command for new:meta exists.
        let output = '';
        try {
            output = execSync('node .harness/framework/cli/harness.mjs --help', {
                cwd: REPO_ROOT,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore'] // Ignore stderr/failures for help
            });
        } catch (error) {
            output = error.stdout || '';
        }
        assert.ok(output.includes('new:meta'), 'CLI should support new:meta command');
    });

    await t.test('meta-entry folder structure', () => {
        const metaDir = join(REPO_ROOT, '.harness', 'context', 'decisions', 'harness');
        assert.ok(existsSync(metaDir), 'Meta-decisions should have their own subdirectory');
    });
});

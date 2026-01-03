import test from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

// Import the provider registry
const { getProvider, listProviders } = await import(
    join(REPO_ROOT, '.harness/framework/providers/index.mjs')
);

// Import the http-api provider directly for detailed testing
const { httpApiProvider } = await import(
    join(REPO_ROOT, '.harness/framework/providers/http-api.mjs')
);

/**
 * UNIT TESTS: HTTP API Provider
 * 
 * Tests the http-api provider for successful operation.
 * Requires key.txt to be present in repo root for API calls.
 */

test('HTTP API Provider: Registration', async (t) => {

    await t.test('provider is registered in registry', () => {
        const providers = listProviders();
        assert.ok(providers.includes('http'), 'http provider should be registered');
    });

    await t.test('provider can be retrieved by name', () => {
        const provider = getProvider('http');
        assert.ok(provider, 'Should return http provider');
        assert.strictEqual(provider.name, 'http', 'Provider name should be http');
    });

    await t.test('provider has required interface', () => {
        const provider = getProvider('http');
        assert.ok(typeof provider.isAvailable === 'function', 'Should have isAvailable method');
        assert.ok(typeof provider.invoke === 'function', 'Should have invoke method');
    });
});

test('HTTP API Provider: Availability', async (t) => {

    await t.test('isAvailable returns true when fetch exists', async () => {
        const available = await httpApiProvider.isAvailable();
        // Node 18+ has fetch, so this should be true
        assert.strictEqual(available, typeof fetch === 'function',
            'Should return true if fetch is available');
    });
});

test('HTTP API Provider: Key Loading', async (t) => {

    await t.test('loads API key from key.txt', async () => {
        const keyPath = join(REPO_ROOT, 'key.txt');
        assert.ok(existsSync(keyPath), 'key.txt should exist in repo root');

        const key = readFileSync(keyPath, 'utf-8').trim();
        assert.ok(key.length > 0, 'key.txt should contain an API key');
        assert.ok(key.startsWith('sk-'), 'API key should start with sk-');
    });
});

test('HTTP API Provider: Live API Call', async (t) => {
    const testDir = join(__dirname, '..', 'temp-http-live-test');

    t.beforeEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true });
        }
        mkdirSync(testDir, { recursive: true });
    });

    t.afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true });
        }
    });

    await t.test('successfully calls OpenAI API and gets response', async () => {
        const result = await httpApiProvider.invoke({
            prompt: `Return a simple JSON object:
{
  "status": "ok",
  "message": "test"
}`,
            sandboxDir: testDir,
            outputFile: 'TEST.json',
            config: {}
        });

        assert.strictEqual(result.success, true, 'Should succeed with valid API key');
        assert.ok(result.result, 'Should have a result object');
        assert.ok(result.result.status, 'Result should have status field');
    });
});

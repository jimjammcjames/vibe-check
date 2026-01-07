import test from "node:test";
import assert from "node:assert";
import { rmSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

// Import the provider registry
const { getProvider, listProviders } = await import(
  join(REPO_ROOT, ".harness/framework/providers/index.mjs")
);

// Import the http-api provider directly for detailed testing
const { httpApiProvider } = await import(
  join(REPO_ROOT, ".harness/framework/providers/http-api.mjs")
);

/**
 * UNIT TESTS: HTTP API Provider
 *
 * Tests the http-api provider for successful operation without network access.
 */

test("HTTP API Provider: Registration", async (t) => {
  await t.test("provider is registered in registry", () => {
    const providers = listProviders();
    assert.ok(providers.includes("http"), "http provider should be registered");
  });

  await t.test("provider can be retrieved by name", () => {
    const provider = getProvider("http");
    assert.ok(provider, "Should return http provider");
    assert.strictEqual(provider.name, "http", "Provider name should be http");
  });

  await t.test("provider has required interface", () => {
    const provider = getProvider("http");
    assert.ok(
      typeof provider.isAvailable === "function",
      "Should have isAvailable method",
    );
    assert.ok(
      typeof provider.invoke === "function",
      "Should have invoke method",
    );
  });
});

test("HTTP API Provider: Availability", async (t) => {
  await t.test("isAvailable returns true when fetch exists", async () => {
    const available = await httpApiProvider.isAvailable();
    // Node 18+ has fetch, so this should be true
    assert.strictEqual(
      available,
      typeof fetch === "function",
      "Should return true if fetch is available",
    );
  });
});

test("HTTP API Provider: Key Handling", async (t) => {
  await t.test("returns error when no API key is available", async () => {
    const originalCwd = process.cwd();
    const originalKey = process.env.HARNESS_API_KEY;
    const tempDir = mkdtempSync(join(tmpdir(), "harness-http-"));

    try {
      process.chdir(tempDir);
      delete process.env.HARNESS_API_KEY;

      const result = await httpApiProvider.invoke({
        prompt: "noop",
        files: {},
        config: {},
      });

      assert.strictEqual(result.success, false, "Should fail without API key");
      assert.strictEqual(result.error, "Missing API key");
    } finally {
      process.chdir(originalCwd);
      if (originalKey === undefined) {
        delete process.env.HARNESS_API_KEY;
      } else {
        process.env.HARNESS_API_KEY = originalKey;
      }
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

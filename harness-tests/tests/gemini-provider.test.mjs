import test from "node:test";
import assert from "node:assert";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const { geminiProvider } = await import(
  join(REPO_ROOT, ".harness/framework/providers/gemini.mjs")
);

function withPath(pathValue, fn) {
  const originalPath = process.env.PATH;
  process.env.PATH = pathValue;
  try {
    return fn();
  } finally {
    process.env.PATH = originalPath;
  }
}

function writeGeminiStub(dir, body) {
  const scriptPath = join(dir, "gemini");
  writeFileSync(scriptPath, `#!/bin/sh\n${body}\n`);
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

test("gemini provider reports available when the CLI starts successfully", async () => {
  const binDir = mkdtempSync(join(tmpdir(), "gemini-provider-ok-"));
  writeGeminiStub(binDir, 'echo "gemini 1.2.3" >&2\nexit 0');

  try {
    const available = await withPath(binDir, () =>
      geminiProvider.isAvailable(),
    );
    assert.strictEqual(available, true);
  } finally {
    rmSync(binDir, { recursive: true, force: true });
  }
});

test("gemini provider reports unavailable when the CLI exists but cannot start", async () => {
  const binDir = mkdtempSync(join(tmpdir(), "gemini-provider-bad-"));
  writeGeminiStub(
    binDir,
    'echo "dyld: Library not loaded: libsimdjson.29.dylib" >&2\nexit 1',
  );

  try {
    const available = await withPath(binDir, () =>
      geminiProvider.isAvailable(),
    );
    assert.strictEqual(available, false);
  } finally {
    rmSync(binDir, { recursive: true, force: true });
  }
});

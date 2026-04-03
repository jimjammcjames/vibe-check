/**
 * Integration tests for base-tripwire test discovery validation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  mkdtempSync,
  realpathSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const TRIPWIRE = join(
  REPO_ROOT,
  ".harness",
  "framework",
  "scripts",
  "base-tripwire.mjs",
);

function runTripwire(envOverrides = {}) {
  try {
    const output = execSync(`node "${TRIPWIRE}"`, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...envOverrides },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { exitCode: 0, output };
  } catch (error) {
    return {
      exitCode: error.status || 1,
      output: (error.stdout || "") + (error.stderr || ""),
    };
  }
}

function createIsolatedGitEnv() {
  const tempDir = mkdtempSync(join(tmpdir(), "harness-tripwire-index-"));
  const realIndexPath = execSync("git rev-parse --git-path index", {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  }).trim();
  const tempIndexPath = join(tempDir, "index");
  copyFileSync(realIndexPath, tempIndexPath);

  return {
    env: {
      GIT_INDEX_FILE: tempIndexPath,
    },
    cleanup() {
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

function normalizePath(pathValue) {
  try {
    return realpathSync(pathValue);
  } catch {
    return pathValue;
  }
}

function listWorktrees() {
  const output = execSync("git worktree list --porcelain", {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  return output
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.replace("worktree ", "").trim())
    .filter(Boolean)
    .map((pathValue) => normalizePath(pathValue));
}

function createTripwireWorktree() {
  const worktreePath = mkdtempSync(join(tmpdir(), "harness-tripwire-"));
  execSync(`git worktree add --detach "${worktreePath}" origin/main`, {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });
  return normalizePath(worktreePath);
}

function removeWorktree(worktreePath) {
  try {
    execSync(`git worktree remove --force "${worktreePath}"`, {
      cwd: REPO_ROOT,
      stdio: "ignore",
    });
  } catch {
    // Best-effort cleanup if the worktree entry is already gone.
  }
  rmSync(worktreePath, { recursive: true, force: true });
}

function writeFixEntry(filePath, coveredFilePath) {
  const coveredPath = relative(REPO_ROOT, coveredFilePath).replaceAll(
    "\\",
    "/",
  );
  writeFileSync(
    filePath,
    `---
date: '2099-01-01'
type: 'fix'
status: 'active'
schema: 'v3'
search_terms:
  - 'tripwire'
related_entries:
  - 'NONE'
affected_files:
  - '${coveredPath}'
session_refs:
  - 'NONE'
error_signature: 'TripwireCleanupFixtureError'
tags:
  - '#test'
---

# tripwire-test

## Summary

Temporary tripwire validation fixture entry used to exercise the strict
history-detection path while keeping the synthetic change compatible with the
current harness policy contract.

## Request / Intent

Create a disposable fix-shaped history entry that makes the tripwire test look
like a realistic strict change without depending on a permanent repo artifact.

## Context

This entry is written only inside the base-tripwire integration test so the
runner sees a harness-history change alongside a temporary test file. The
fixture must remain policy-compliant because \`harness:post\` can inspect it if a
test leaves it around long enough to show up in changed-file discovery.

## Error

The temporary tripwire cleanup fixture was missing the current strict-entry
fields, which made policy audit fail when the test-created file was visible.

## What Changed

The test fixture now uses the current v3 fix-entry schema and includes the
same sections and frontmatter fields real strict entries are expected to carry.

## Guidance Impact

None for repo guidance; this only keeps the test fixture aligned with the
existing harness contract.

## Validation

Validated through the base-tripwire integration test that stages and removes
this file while exercising the cleanup path.

## Systemic Gap

The test suite was generating a legacy-shaped strict entry inside the real
history tree. Gap Closure: Added validation: ${coveredPath}

## Class Prevention

Temporary history fixtures that live under \`.harness/context/history/\` must
use the current strict schema so policy-audit-compatible integration tests do
not become false failures when changed-file discovery sees the fixture.
`,
  );
}

function stageFiles(files, envOverrides = {}) {
  const args = files.map((file) => `"${file}"`).join(" ");
  execSync(`git add -f ${args}`, {
    cwd: REPO_ROOT,
    stdio: "ignore",
    env: { ...process.env, ...envOverrides },
  });
}

function cleanupFiles(files, envOverrides = {}) {
  const args = files.map((file) => `"${file}"`).join(" ");
  execSync(`git reset HEAD -- ${args}`, {
    cwd: REPO_ROOT,
    stdio: "ignore",
    env: { ...process.env, ...envOverrides },
  });
  files.forEach((file) => {
    rmSync(file, { force: true });
  });
}

function getDiffFiles(envOverrides = {}) {
  const output = execSync("git diff --name-only origin/main", {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env, ...envOverrides },
  });
  return output.split("\n").filter(Boolean);
}

function getDiffTestFiles(envOverrides = {}) {
  return getDiffFiles(envOverrides)
    .filter((file) => file.startsWith("harness-tests/tests/"))
    .filter((file) => file.endsWith(".test.mjs"))
    .sort();
}

function buildListTestsCommand(discoveredFiles) {
  const shellArgs = discoveredFiles
    .map((file) => `'${file.replaceAll("'", "'\"'\"'")}'`)
    .join(" ");
  return `printf '%s\\n' ${shellArgs}`;
}

describe("base-tripwire discovery validation", { concurrency: 1 }, () => {
  it("cleans up stale tripwire worktrees before running", () => {
    const worktreePath = createTripwireWorktree();
    const isolatedGit = createIsolatedGitEnv();
    const testFile = join(
      REPO_ROOT,
      "harness-tests",
      "tests",
      "cleanup-baseline.test.mjs",
    );
    const entryFile = join(
      REPO_ROOT,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-cleanup-test.md",
    );

    writeFileSync(
      testFile,
      `import test from "node:test"; test("cleanup baseline", () => {});`,
    );
    writeFixEntry(entryFile, testFile);
    stageFiles([testFile, entryFile], isolatedGit.env);
    const discoveredFiles = getDiffTestFiles(isolatedGit.env);

    try {
      const before = listWorktrees();
      assert.ok(
        before.includes(worktreePath),
        "expected temp tripwire worktree to exist",
      );

      const result = runTripwire({
        ...isolatedGit.env,
        HARNESS_QUIET: "1",
        HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
        HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
        HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
      });
      assert.strictEqual(
        result.exitCode,
        0,
        `tripwire should exit cleanly, got output: ${result.output}`,
      );

      const after = listWorktrees();
      assert.ok(
        !after.includes(worktreePath),
        "expected tripwire worktree to be removed",
      );
      assert.ok(
        !existsSync(worktreePath),
        "expected tripwire worktree directory to be removed",
      );
    } finally {
      cleanupFiles([testFile, entryFile], isolatedGit.env);
      isolatedGit.cleanup();
      if (existsSync(worktreePath)) {
        removeWorktree(worktreePath);
      }
    }
  });

  it("flags tests not discovered by the runner", () => {
    const isolatedGit = createIsolatedGitEnv();
    const nestedDir = join(REPO_ROOT, "harness-tests", "tests", "nested");
    const testFile = join(nestedDir, "mismatch.test.mjs");
    const entryFile = join(
      REPO_ROOT,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-mismatch-test.md",
    );

    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(
      testFile,
      `import test from "node:test"; test("mismatch", () => {});`,
    );
    writeFixEntry(entryFile, testFile);

    stageFiles([testFile, entryFile], isolatedGit.env);
    const diffFiles = getDiffFiles(isolatedGit.env);
    const discoveredFiles = getDiffTestFiles(isolatedGit.env).filter(
      (file) => file !== "harness-tests/tests/nested/mismatch.test.mjs",
    );
    assert.ok(
      diffFiles.includes("harness-tests/tests/nested/mismatch.test.mjs"),
      `expected test file in diff, got: ${diffFiles.join(", ")}`,
    );
    assert.ok(
      diffFiles.includes(
        ".harness/context/history/2099-01-01-tripwire-mismatch-test.md",
      ),
      "expected history entry in diff",
    );

    const result = runTripwire({
      ...isolatedGit.env,
      HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
      HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
      HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
    });
    cleanupFiles([testFile, entryFile], isolatedGit.env);
    isolatedGit.cleanup();

    assert.strictEqual(result.exitCode, 1, "tripwire should fail");
    assert.ok(
      result.output.includes("Test discovery mismatch detected"),
      `should report discovery mismatch, got: ${result.output}`,
    );
    assert.ok(
      result.output.includes("mismatch.test.mjs"),
      "should mention missing test file",
    );
  });

  it("does not flag when runner discovers the test", () => {
    const isolatedGit = createIsolatedGitEnv();
    const testFile = join(
      REPO_ROOT,
      "harness-tests",
      "tests",
      "baseline.test.mjs",
    );
    const entryFile = join(
      REPO_ROOT,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-baseline-test.md",
    );

    writeFileSync(
      testFile,
      `import test from "node:test"; test("baseline", () => {});`,
    );
    writeFixEntry(entryFile, testFile);

    stageFiles([testFile, entryFile], isolatedGit.env);
    const discoveredFiles = getDiffTestFiles(isolatedGit.env);
    const result = runTripwire({
      ...isolatedGit.env,
      HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
      HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
      HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
    });
    cleanupFiles([testFile, entryFile], isolatedGit.env);
    isolatedGit.cleanup();

    assert.ok(
      !result.output.includes("Test discovery mismatch detected"),
      `should not report discovery mismatch when test is discovered, got: ${result.output}`,
    );
  });

  it("uses configured discovery command when env override is absent", () => {
    const isolatedGit = createIsolatedGitEnv();
    const testFile = join(
      REPO_ROOT,
      "harness-tests",
      "tests",
      "config-discovery.test.mjs",
    );
    const entryFile = join(
      REPO_ROOT,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-config-discovery-test.md",
    );

    writeFileSync(
      testFile,
      `import test from "node:test"; test("config discovery", () => {});`,
    );
    writeFixEntry(entryFile, testFile);

    stageFiles([testFile, entryFile], isolatedGit.env);
    const result = runTripwire({
      ...isolatedGit.env,
      HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
    });
    cleanupFiles([testFile, entryFile], isolatedGit.env);
    isolatedGit.cleanup();

    assert.strictEqual(
      result.exitCode,
      0,
      `tripwire should pass with config-backed discovery, got: ${result.output}`,
    );
    assert.ok(
      !result.output.includes("Test discovery mismatch detected"),
      `configured discovery should find the staged test file, got: ${result.output}`,
    );
  });
});

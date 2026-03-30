/**
 * Integration tests for base-tripwire test discovery validation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  mkdtempSync,
  realpathSync,
} from "node:fs";
import { join, dirname } from "node:path";
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

function writeFixEntry(filePath) {
  writeFileSync(
    filePath,
    `---
date: '2099-01-01'
type: 'fix'
status: 'active'
schema: 'v2'
search_terms:
  - 'tripwire'
related:
  - 'NONE'
tags:
  - '#test'
---

# tripwire-test

## Summary
Tripwire validation test entry to trigger strict entry detection.

## Context
This is a temporary entry used in harness integration tests.
`,
  );
}

function stageFiles(files) {
  const args = files.map((file) => `"${file}"`).join(" ");
  execSync(`git add -f ${args}`, { cwd: REPO_ROOT, stdio: "ignore" });
}

function cleanupFiles(files) {
  const args = files.map((file) => `"${file}"`).join(" ");
  execSync(`git reset HEAD -- ${args}`, { cwd: REPO_ROOT, stdio: "ignore" });
  files.forEach((file) => {
    rmSync(file, { force: true });
  });
}

function getDiffFiles() {
  const output = execSync("git diff --name-only origin/main", {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  return output.split("\n").filter(Boolean);
}

function getDiffTestFiles() {
  return getDiffFiles()
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

    try {
      const before = listWorktrees();
      assert.ok(
        before.includes(worktreePath),
        "expected temp tripwire worktree to exist",
      );

      const result = runTripwire({ HARNESS_QUIET: "1" });
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
      if (existsSync(worktreePath)) {
        removeWorktree(worktreePath);
      }
    }
  });

  it("flags tests not discovered by the runner", () => {
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
    writeFixEntry(entryFile);

    stageFiles([testFile, entryFile]);
    const diffFiles = getDiffFiles();
    const discoveredFiles = getDiffTestFiles().filter(
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
      HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
      HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
      HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
    });
    cleanupFiles([testFile, entryFile]);

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
    writeFixEntry(entryFile);

    stageFiles([testFile, entryFile]);
    const discoveredFiles = getDiffTestFiles();
    const result = runTripwire({
      HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
      HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
      HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
    });
    cleanupFiles([testFile, entryFile]);

    assert.ok(
      !result.output.includes("Test discovery mismatch detected"),
      `should not report discovery mismatch when test is discovered, got: ${result.output}`,
    );
  });
});

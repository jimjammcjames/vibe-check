/**
 * Integration tests for base-tripwire test discovery validation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
function normalizePath(pathValue) {
  try {
    return realpathSync(pathValue);
  } catch {
    return pathValue;
  }
}

function runCommand(cwd, command, options = {}) {
  return execSync(command, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  }).trim();
}

function runTripwire(sandboxRoot, envOverrides = {}) {
  const tripwirePath = join(
    sandboxRoot,
    ".harness",
    "framework",
    "scripts",
    "base-tripwire.mjs",
  );

  try {
    const output = execSync(`node "${tripwirePath}"`, {
      cwd: sandboxRoot,
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

function assertRealRepoHasNoFixtureArtifacts(repoRoot, fixturePaths) {
  const repoRelativePaths = fixturePaths.map((filePath) =>
    relative(repoRoot, filePath).replaceAll("\\", "/"),
  );
  const pathArgs = repoRelativePaths
    .map((filePath) => `"${filePath}"`)
    .join(" ");

  for (const filePath of fixturePaths) {
    assert.ok(
      !existsSync(filePath),
      `expected fixture path to be absent: ${filePath}`,
    );
  }

  const status = runCommand(
    repoRoot,
    `git status --short --untracked-files=all -- ${pathArgs}`,
  );
  assert.equal(
    status,
    "",
    `expected no tracked or staged fixture artifacts in real repo, got: ${status}`,
  );
}

function listWorktrees(cwd) {
  const output = runCommand(cwd, "git worktree list --porcelain");
  return output
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.replace("worktree ", "").trim())
    .filter(Boolean)
    .map((pathValue) => normalizePath(pathValue));
}

function listTripwireWorktrees(cwd) {
  const tripwirePrefix = normalizePath(join(tmpdir(), "harness-tripwire-"));
  return listWorktrees(cwd).filter((pathValue) =>
    pathValue.startsWith(tripwirePrefix),
  );
}

function removeWorktree(cwd, worktreePath) {
  try {
    execSync(`git worktree remove --force "${worktreePath}"`, {
      cwd,
      stdio: "ignore",
    });
  } catch {
    // Best-effort cleanup if the worktree metadata is already gone.
  }
  rmSync(worktreePath, { recursive: true, force: true });
}

function setBaseTripwireBaseRef(configContent, baseRef) {
  const lines = configContent.split("\n");
  const blockStart = lines.findIndex((line) => line === "  base_tripwire:");

  if (blockStart === -1) {
    throw new Error("base_tripwire reviewer block not found in sandbox config");
  }

  let blockEnd = blockStart + 1;
  while (blockEnd < lines.length) {
    const line = lines[blockEnd];
    if (/^\S/.test(line) || /^ {2}\S/.test(line)) {
      break;
    }
    blockEnd += 1;
  }

  const blockLines = lines
    .slice(blockStart + 1, blockEnd)
    .filter((line) => !/^ {4}base_ref:/.test(line));
  const enabledIndex = blockLines.findIndex((line) =>
    /^ {4}enabled:/.test(line),
  );
  const insertIndex = enabledIndex === -1 ? 0 : enabledIndex + 1;

  blockLines.splice(insertIndex, 0, `    base_ref: "${baseRef}"`);
  lines.splice(blockStart + 1, blockEnd - (blockStart + 1), ...blockLines);

  return lines.join("\n");
}

function createSandboxWorktree(t) {
  const sandboxRoot = mkdtempSync(join(tmpdir(), "harness-sandbox-"));
  execSync(`git worktree add --detach "${sandboxRoot}" HEAD`, {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });
  rmSync(join(sandboxRoot, ".harness"), { recursive: true, force: true });
  cpSync(join(REPO_ROOT, ".harness"), join(sandboxRoot, ".harness"), {
    recursive: true,
    force: true,
  });
  symlinkSync(
    join(REPO_ROOT, "node_modules"),
    join(sandboxRoot, "node_modules"),
  );
  const configPath = join(sandboxRoot, ".harness", "config.yml");
  const config = readFileSync(configPath, "utf-8");
  writeFileSync(
    configPath,
    setBaseTripwireBaseRef(config, getSandboxBaseRef(sandboxRoot)),
  );

  const normalized = normalizePath(sandboxRoot);
  t.after(() => {
    const leftovers = listTripwireWorktrees(REPO_ROOT);
    assert.deepEqual(
      leftovers,
      [],
      `expected no leaked tripwire worktrees, got: ${leftovers.join(", ")}`,
    );
    removeWorktree(REPO_ROOT, normalized);
  });
  return normalized;
}

function getSandboxBaseRef(sandboxRoot) {
  return runCommand(sandboxRoot, "git rev-parse HEAD");
}

function createTripwireWorktree(sandboxRoot, baseRef) {
  const worktreePath = mkdtempSync(join(tmpdir(), "harness-tripwire-"));
  execSync(`git worktree add --detach "${worktreePath}" ${baseRef}`, {
    cwd: sandboxRoot,
    stdio: "ignore",
  });
  return normalizePath(worktreePath);
}

function writeFixEntry(filePath, coveredFilePath, repoRoot) {
  const coveredPath = relative(repoRoot, coveredFilePath).replaceAll("\\", "/");
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

This entry is written only inside the base-tripwire integration test sandbox so
the runner sees a harness-history change alongside a temporary test file.

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

The test suite was generating a legacy-shaped strict entry in fixture state.
Gap Closure: Added validation: ${coveredPath}

## Class Prevention

Temporary history fixtures used by tripwire tests must use the current strict
schema so policy-audit-compatible integration tests do not become false
failures when changed-file discovery sees the fixture.
`,
  );
}

function stageFiles(cwd, files) {
  const args = files.map((file) => `"${file}"`).join(" ");
  execSync(`git add -f ${args}`, {
    cwd,
    stdio: "ignore",
  });
}

function getDiffFiles(cwd, baseRef) {
  const output = runCommand(cwd, `git diff --name-only ${baseRef}`);
  return output.split("\n").filter(Boolean);
}

function getDiffTestFiles(cwd, baseRef) {
  return getDiffFiles(cwd, baseRef)
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
  it("cleans up stale tripwire worktrees before running", (t) => {
    const sandboxRoot = createSandboxWorktree(t);
    const baseRef = getSandboxBaseRef(sandboxRoot);
    assert.match(baseRef, /^[0-9a-f]{40}$/);
    const worktreePath = createTripwireWorktree(sandboxRoot, baseRef);
    const testFile = join(
      sandboxRoot,
      "harness-tests",
      "tests",
      "cleanup-baseline.test.mjs",
    );
    const entryFile = join(
      sandboxRoot,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-cleanup-test.md",
    );
    const realRepoFixturePaths = [
      join(REPO_ROOT, "harness-tests", "tests", "cleanup-baseline.test.mjs"),
      join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        "2099-01-01-tripwire-cleanup-test.md",
      ),
    ];

    writeFileSync(
      testFile,
      `import test from "node:test"; test("cleanup baseline", () => {});`,
    );
    writeFixEntry(entryFile, testFile, sandboxRoot);
    stageFiles(sandboxRoot, [testFile, entryFile]);
    const discoveredFiles = getDiffTestFiles(sandboxRoot, baseRef);

    try {
      const before = listWorktrees(sandboxRoot);
      assert.ok(
        before.includes(worktreePath),
        "expected temp tripwire worktree to exist",
      );

      const result = runTripwire(sandboxRoot, {
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

      const after = listWorktrees(sandboxRoot);
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
        removeWorktree(sandboxRoot, worktreePath);
      }
      assertRealRepoHasNoFixtureArtifacts(REPO_ROOT, realRepoFixturePaths);
    }
  });

  it("flags tests not discovered by the runner", (t) => {
    const sandboxRoot = createSandboxWorktree(t);
    const baseRef = getSandboxBaseRef(sandboxRoot);
    const nestedDir = join(sandboxRoot, "harness-tests", "tests", "nested");
    const testFile = join(nestedDir, "mismatch.test.mjs");
    const entryFile = join(
      sandboxRoot,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-mismatch-test.md",
    );
    const realRepoFixturePaths = [
      join(REPO_ROOT, "harness-tests", "tests", "nested", "mismatch.test.mjs"),
      join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        "2099-01-01-tripwire-mismatch-test.md",
      ),
    ];

    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(
      testFile,
      `import test from "node:test"; test("mismatch", () => {});`,
    );
    writeFixEntry(entryFile, testFile, sandboxRoot);

    try {
      stageFiles(sandboxRoot, [testFile, entryFile]);
      const diffFiles = getDiffFiles(sandboxRoot, baseRef);
      const discoveredFiles = getDiffTestFiles(sandboxRoot, baseRef).filter(
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

      const result = runTripwire(sandboxRoot, {
        HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
        HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
        HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
      });

      assert.strictEqual(result.exitCode, 1, "tripwire should fail");
      assert.ok(
        result.output.includes("Test discovery mismatch detected"),
        `should report discovery mismatch, got: ${result.output}`,
      );
      assert.ok(
        result.output.includes("mismatch.test.mjs"),
        "should mention missing test file",
      );
    } finally {
      assertRealRepoHasNoFixtureArtifacts(REPO_ROOT, realRepoFixturePaths);
    }
  });

  it("does not flag when runner discovers the test", (t) => {
    const sandboxRoot = createSandboxWorktree(t);
    const baseRef = getSandboxBaseRef(sandboxRoot);
    const testFile = join(
      sandboxRoot,
      "harness-tests",
      "tests",
      "baseline.test.mjs",
    );
    const entryFile = join(
      sandboxRoot,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-baseline-test.md",
    );
    const realRepoFixturePaths = [
      join(REPO_ROOT, "harness-tests", "tests", "baseline.test.mjs"),
      join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        "2099-01-01-tripwire-baseline-test.md",
      ),
    ];

    writeFileSync(
      testFile,
      `import test from "node:test"; test("baseline", () => {});`,
    );
    writeFixEntry(entryFile, testFile, sandboxRoot);

    try {
      stageFiles(sandboxRoot, [testFile, entryFile]);
      const discoveredFiles = getDiffTestFiles(sandboxRoot, baseRef);
      const result = runTripwire(sandboxRoot, {
        HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
        HARNESS_LIST_TESTS_CMD: buildListTestsCommand(discoveredFiles),
        HARNESS_LIST_TESTS_PATTERN: "(.+\\.test\\.mjs)",
      });

      assert.ok(
        !result.output.includes("Test discovery mismatch detected"),
        `should not report discovery mismatch when test is discovered, got: ${result.output}`,
      );
    } finally {
      assertRealRepoHasNoFixtureArtifacts(REPO_ROOT, realRepoFixturePaths);
    }
  });

  it("uses configured discovery command when env override is absent", (t) => {
    const sandboxRoot = createSandboxWorktree(t);
    const testFile = join(
      sandboxRoot,
      "harness-tests",
      "tests",
      "config-discovery.test.mjs",
    );
    const entryFile = join(
      sandboxRoot,
      ".harness",
      "context",
      "history",
      "2099-01-01-tripwire-config-discovery-test.md",
    );
    const realRepoFixturePaths = [
      join(REPO_ROOT, "harness-tests", "tests", "config-discovery.test.mjs"),
      join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        "2099-01-01-tripwire-config-discovery-test.md",
      ),
    ];

    writeFileSync(
      testFile,
      `import test from "node:test"; test("config discovery", () => {});`,
    );
    writeFixEntry(entryFile, testFile, sandboxRoot);

    try {
      stageFiles(sandboxRoot, [testFile, entryFile]);
      const result = runTripwire(sandboxRoot, {
        HARNESS_RUN_TESTS_CMD: 'node -e "process.exit(1)"',
      });

      assert.strictEqual(
        result.exitCode,
        0,
        `tripwire should pass with config-backed discovery, got: ${result.output}`,
      );
      assert.ok(
        !result.output.includes("Test discovery mismatch detected"),
        `configured discovery should find the staged test file, got: ${result.output}`,
      );
    } finally {
      assertRealRepoHasNoFixtureArtifacts(REPO_ROOT, realRepoFixturePaths);
    }
  });
});

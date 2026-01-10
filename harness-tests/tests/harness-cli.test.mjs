/**
 * Tests for harness.mjs CLI orchestrator
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
const HARNESS_CLI = join(
  REPO_ROOT,
  ".harness",
  "framework",
  "cli",
  "harness.mjs",
);
const TEST_DATE = "2026-01-04";

function runHarness(args, envOverrides = {}) {
  try {
    const result = execSync(`node "${HARNESS_CLI}" ${args}`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...envOverrides },
    });
    return { output: result, exitCode: 0 };
  } catch (error) {
    // execSync throws on non-zero exit, stdout/stderr are on the error object
    return {
      output: (error.stdout || "") + (error.stderr || ""),
      exitCode: error.status || 1,
    };
  }
}

function createContextRoot(t) {
  const dir = mkdtempSync(join(tmpdir(), "harness-context-"));
  t.after(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

describe("harness CLI", { concurrency: 1 }, () => {
  describe("prep command", () => {
    it("prints the MUST block from Harness.md", () => {
      const result = runHarness("prep");

      assert.strictEqual(result.exitCode, 0, "prep should exit with code 0");
      assert.ok(
        result.output.includes("HARNESS MUST BLOCK"),
        "should show MUST block header",
      );
      assert.ok(
        result.output.includes("Quick Start"),
        "should include Quick Start section",
      );
      assert.ok(
        result.output.includes("harness:prep"),
        "should mention harness:prep command",
      );
    });

    it("includes lookup instructions", () => {
      const result = runHarness("prep");

      assert.ok(
        result.output.includes("Lookup Before Creating") ||
          result.output.includes("rg -n"),
        "should include lookup instructions",
      );
    });

    it("reminds to read the full Harness.md", () => {
      const result = runHarness("prep");

      assert.ok(
        result.output.includes("Harness.md"),
        "should mention Harness.md",
      );
    });
  });

  describe("new:entry command", () => {
    it("requires --slug and --type arguments", () => {
      const result = runHarness("new:entry");

      assert.strictEqual(result.exitCode, 1, "should fail without args");
      assert.ok(result.output.includes("new:entry"), "should show usage");
      assert.ok(result.output.includes("slug"), "should mention slug");
      assert.ok(result.output.includes("type"), "should mention type");
    });

    it("creates a fix entry with date prefix", (t) => {
      const slug = "test-fixture-entry-basic";
      const contextRoot = createContextRoot(t);
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(`new:entry --slug ${slug} --type fix`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });

      assert.strictEqual(
        result.exitCode,
        0,
        `should succeed with --slug and --type, got: ${result.output}`,
      );
      assert.ok(result.output.includes("Created"), "should confirm creation");

      const createdFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );

      t.after(() => {
        if (existsSync(createdFile)) rmSync(createdFile);
      });

      assert.ok(existsSync(createdFile), `file should exist at ${createdFile}`);
    });

    it("creates entry with required frontmatter and sections", (t) => {
      const slug = "test-fixture-entry-fields";
      const contextRoot = createContextRoot(t);
      const result = runHarness(`new:entry --slug ${slug} --type fix`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });
      assert.strictEqual(result.exitCode, 0, "should succeed");

      const createdFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      t.after(() => {
        if (existsSync(createdFile)) rmSync(createdFile);
      });

      const content = readFileSync(createdFile, "utf-8");

      assert.ok(content.startsWith("---"), "should include frontmatter");
      assert.ok(content.includes('type: "fix"'), "should include type");
      assert.ok(content.includes('schema: "v2"'), "should include schema");
      assert.ok(
        content.includes("error_signature:"),
        "should include error_signature",
      );
      assert.ok(content.includes("## Summary"), "should have Summary section");
      assert.ok(content.includes("## Context"), "should have Context section");
      assert.ok(
        content.includes("## Validation"),
        "should have Validation section",
      );
      assert.ok(
        content.includes("## Systemic Gap"),
        "should have Systemic Gap section",
      );
    });

    it("fails if file already exists", (t) => {
      const slug = "test-fixture-entry-collision";
      const contextRoot = createContextRoot(t);

      const collisionFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );

      if (existsSync(collisionFile)) rmSync(collisionFile);
      const result1 = runHarness(`new:entry --slug ${slug} --type fix`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });
      assert.strictEqual(
        result1.exitCode,
        0,
        `first creation should succeed. Output: ${result1.output}`,
      );

      t.after(() => {
        if (existsSync(collisionFile)) rmSync(collisionFile);
      });

      const result2 = runHarness(`new:entry --slug ${slug} --type fix`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });

      assert.strictEqual(
        result2.exitCode,
        1,
        `second creation should fail. Output: ${result2.output}`,
      );
      assert.ok(
        result2.output.includes("exists"),
        "should mention file exists",
      );
    });
  });

  describe("new:entry (decision type)", () => {
    it("creates a decision entry with date prefix", (t) => {
      const slug = "test-fixture-decision-basic";
      const contextRoot = createContextRoot(t);
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(`new:entry --slug ${slug} --type decision`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });

      assert.strictEqual(
        result.exitCode,
        0,
        `should succeed with --slug, got: ${result.output}`,
      );

      const createdFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      t.after(() => {
        if (existsSync(createdFile)) rmSync(createdFile);
      });

      assert.ok(existsSync(createdFile), "file should exist");
    });

    it("creates entry with decision-specific sections", (t) => {
      const slug = "test-fixture-decision-sections";
      const contextRoot = createContextRoot(t);
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(`new:entry --slug ${slug} --type decision`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });
      assert.strictEqual(result.exitCode, 0, "should succeed");

      const createdFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      t.after(() => {
        if (existsSync(createdFile)) rmSync(createdFile);
      });

      const content = readFileSync(createdFile, "utf-8");

      assert.ok(content.startsWith("---"), "should include frontmatter");
      assert.ok(content.includes('type: "decision"'), "should include type");
      assert.ok(content.includes('schema: "v2"'), "should include schema");
      assert.ok(content.includes("## Summary"), "should have Summary section");
      assert.ok(content.includes("## Context"), "should have Context section");
      assert.ok(
        content.includes("## Decision"),
        "should have Decision section",
      );
      assert.ok(
        content.includes("## Rationale"),
        "should have Rationale section",
      );
    });
  });

  describe("new:meta command", () => {
    it("requires --slug argument", () => {
      const result = runHarness("new:meta");
      assert.strictEqual(result.exitCode, 1, "should fail without --slug");
    });

    it("creates a meta entry with date prefix", (t) => {
      const slug = "test-fixture-meta-basic";
      const contextRoot = createContextRoot(t);
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(`new:meta --slug ${slug}`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });

      assert.strictEqual(
        result.exitCode,
        0,
        `should succeed with --slug, got: ${result.output}`,
      );

      const createdFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      t.after(() => {
        if (existsSync(createdFile)) rmSync(createdFile);
      });

      assert.ok(existsSync(createdFile), "file should exist");
    });

    it("creates entry with Security & Integrity Impact section", (t) => {
      const slug = "test-fixture-meta-sections";
      const contextRoot = createContextRoot(t);
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(`new:meta --slug ${slug}`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });
      assert.strictEqual(result.exitCode, 0, "should succeed");

      const createdFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      t.after(() => {
        if (existsSync(createdFile)) rmSync(createdFile);
      });

      const content = readFileSync(createdFile, "utf-8");

      assert.ok(content.includes('type: "meta"'), "should include meta type");
      assert.ok(
        content.includes("## Security & Integrity Impact"),
        "should have Security & Integrity Impact section",
      );
      assert.ok(
        content.includes("#harness-meta"),
        "should include harness meta tag",
      );
    });
  });

  describe("post command", () => {
    it("starts post verification", () => {
      // Note: post command runs npm test as first step, which would cause recursion.
      // We use a short timeout to just verify the command is recognized.
      try {
        execSync(`node "${HARNESS_CLI}" post`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
          timeout: 500, // Kill after 500ms - enough to print header
          stdio: ["pipe", "pipe", "pipe"],
        });
        assert.fail("Expected timeout to kill the command");
      } catch (error) {
        // Either timeout or actual failure, both are fine
        const output = (error.stdout || "") + (error.stderr || "");
        assert.ok(
          output.includes("harness:post"),
          "should recognize post command",
        );
      }
    });
  });

  describe("ci command", () => {
    it("starts ci verification", () => {
      // Note: ci command runs npm test, which would cause recursion.
      // We use a short timeout to just verify the command is recognized.
      try {
        execSync(`node "${HARNESS_CLI}" ci`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
          timeout: 500, // Kill after 500ms - enough to print header
          stdio: ["pipe", "pipe", "pipe"],
        });
        assert.fail("Expected timeout to kill the command");
      } catch (error) {
        // Either timeout or actual failure, both are fine
        const output = (error.stdout || "") + (error.stderr || "");
        assert.ok(output.includes("harness:ci"), "should recognize ci command");
      }
    });
  });

  describe("help/usage", () => {
    it("shows usage when no command given", () => {
      const result = runHarness("");

      assert.strictEqual(result.exitCode, 1, "should exit with error");
      assert.ok(
        result.output.includes("Usage") || result.output.includes("prep"),
        "should show usage info",
      );
    });

    it("shows usage for unknown command", () => {
      const result = runHarness("unknown-command");

      assert.strictEqual(result.exitCode, 1, "should exit with error");
    });
  });
});

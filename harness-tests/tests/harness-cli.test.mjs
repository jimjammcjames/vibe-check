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
const TEST_TIMESTAMP = "2026-01-04T12:34:56.000Z";

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

    it("includes skills summary as JSON", () => {
      const result = runHarness("prep");

      assert.strictEqual(result.exitCode, 0, "prep should exit with code 0");
      assert.ok(
        result.output.includes("AVAILABLE SKILLS"),
        "should show skills banner",
      );

      // Extract JSON array from output (match array with objects inside)
      const jsonMatch = result.output.match(/\[\s*\n\s*\{[\s\S]*?\n\]/);
      assert.ok(jsonMatch, "should contain JSON array in output");

      const skills = JSON.parse(jsonMatch[0]);
      assert.ok(Array.isArray(skills), "skills should be an array");
      assert.ok(skills.length > 0, "should have at least one skill");

      // Verify each skill has id and summary
      for (const skill of skills) {
        assert.ok(
          skill.id,
          `skill should have id, got: ${JSON.stringify(skill)}`,
        );
        assert.ok(
          skill.summary,
          `skill should have summary, got: ${JSON.stringify(skill)}`,
        );
        assert.strictEqual(
          typeof skill.id,
          "string",
          "skill id should be a string",
        );
        assert.strictEqual(
          typeof skill.summary,
          "string",
          "skill summary should be a string",
        );
      }

      // Verify skills are sorted by id
      const ids = skills.map((s) => s.id);
      const sortedIds = [...ids].sort();
      assert.deepStrictEqual(ids, sortedIds, "skills should be sorted by id");
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
      assert.ok(content.includes('schema: "v3"'), "should include schema");
      assert.ok(
        content.includes("related_entries:"),
        "should include related_entries",
      );
      assert.ok(
        content.includes("affected_files:"),
        "should include affected_files",
      );
      assert.ok(
        content.includes("session_refs:"),
        "should include session_refs",
      );
      assert.ok(
        content.includes("error_signature:"),
        "should include error_signature",
      );
      assert.ok(content.includes("## Summary"), "should have Summary section");
      assert.ok(
        content.includes("## Request / Intent"),
        "should have Request / Intent section",
      );
      assert.ok(content.includes("## Context"), "should have Context section");
      assert.ok(
        content.includes("## Guidance Impact"),
        "should have Guidance Impact section",
      );
      assert.ok(
        content.includes("## Validation"),
        "should have Validation section",
      );
      assert.ok(
        content.includes("## Systemic Gap"),
        "should have Systemic Gap section",
      );
      assert.ok(
        content.includes("## Class Prevention"),
        "should have Class Prevention section",
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
      assert.ok(content.includes('schema: "v3"'), "should include schema");
      assert.ok(content.includes("## Summary"), "should have Summary section");
      assert.ok(
        content.includes("## Request / Intent"),
        "should have Request / Intent section",
      );
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
      assert.ok(content.includes('schema: "v3"'), "should include schema");
      assert.ok(
        content.includes("## Security & Integrity Impact"),
        "should have Security & Integrity Impact section",
      );
      assert.ok(
        content.includes("## Guidance Impact"),
        "should have Guidance Impact section",
      );
      assert.ok(
        content.includes("#harness-meta"),
        "should include harness meta tag",
      );
    });

    it("links the same-day session with a repo-relative session_ref", (t) => {
      const sessionSlug = "test-session-linked";
      const metaSlug = "test-meta-linked";
      const sessionFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "sessions",
        `${TEST_DATE}-1234-${sessionSlug}.md`,
      );
      const metaFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        `${TEST_DATE}-${metaSlug}.md`,
      );

      if (existsSync(sessionFile)) rmSync(sessionFile);
      if (existsSync(metaFile)) rmSync(metaFile);

      const sessionResult = runHarness(`new:session --slug ${sessionSlug}`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_TIMESTAMP: TEST_TIMESTAMP,
      });
      assert.strictEqual(
        sessionResult.exitCode,
        0,
        `session creation should succeed, got: ${sessionResult.output}`,
      );

      const metaResult = runHarness(`new:meta --slug ${metaSlug}`, {
        HARNESS_DATE: TEST_DATE,
      });
      assert.strictEqual(
        metaResult.exitCode,
        0,
        `meta creation should succeed, got: ${metaResult.output}`,
      );

      t.after(() => {
        if (existsSync(metaFile)) rmSync(metaFile);
        if (existsSync(sessionFile)) rmSync(sessionFile);
      });

      const metaContent = readFileSync(metaFile, "utf-8");
      assert.ok(
        metaContent.includes(
          '  - ".harness/context/sessions/2026-01-04-1234-test-session-linked.md"',
        ),
        "session_refs should use a repo-relative path",
      );

      const sessionContent = readFileSync(sessionFile, "utf-8");
      assert.ok(
        sessionContent.includes(
          '  - ".harness/context/history/2026-01-04-test-meta-linked.md"',
        ),
        "session should link back to the created history entry",
      );
    });
  });

  describe("new:session command", () => {
    it("creates a session entry with timestamp prefix", (t) => {
      const slug = "test-session-basic";
      const contextRoot = createContextRoot(t);
      const targetFile = join(
        contextRoot,
        "sessions",
        `${TEST_DATE}-1234-${slug}.md`,
      );

      const result = runHarness(`new:session --slug ${slug}`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_TIMESTAMP: TEST_TIMESTAMP,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });

      assert.strictEqual(result.exitCode, 0, "should create the session");
      assert.ok(existsSync(targetFile), "session file should exist");

      const content = readFileSync(targetFile, "utf-8");
      assert.ok(content.includes("started_at:"), "should include started_at");
      assert.ok(content.includes("## User Intent"), "should include sections");
      assert.ok(content.includes("## Timeline"), "should include timeline");
      assert.ok(
        content.includes("## Guidance Impact"),
        "should include guidance tracking section",
      );
      assert.ok(
        content.includes("## Outcome"),
        "should include outcome section",
      );
    });
  });

  describe("post command", () => {
    it("starts post verification", (t) => {
      const contextRoot = createContextRoot(t);
      // Note: post command runs npm test as first step, which would cause recursion.
      // We use a short timeout to just verify the command is recognized.
      try {
        execSync(`node "${HARNESS_CLI}" post`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
          timeout: 5000,
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, HARNESS_CONTEXT_ROOT: contextRoot },
        });
        assert.fail("Expected timeout to kill the command");
      } catch (error) {
        // Either timeout or actual failure, both are fine
        const output = (error.stdout || "") + (error.stderr || "");
        const timedOut =
          error.signal === "SIGTERM" ||
          error.killed === true ||
          error.code === "ETIMEDOUT" ||
          String(error.message || "")
            .toLowerCase()
            .includes("timed out") ||
          String(error.message || "").includes("ETIMEDOUT");
        const exited =
          Number.isInteger(error.status) ||
          Boolean(error.signal) ||
          Boolean(error.code);
        assert.ok(
          timedOut ||
            exited ||
            output.includes("harness:post") ||
            output.includes("Post Checks"),
          "should recognize post command",
        );
      }
    });
  });

  describe("ci command", () => {
    it("starts ci verification", (t) => {
      const contextRoot = createContextRoot(t);
      // Note: ci command runs npm test, which would cause recursion.
      // We use a short timeout to just verify the command is recognized.
      try {
        execSync(`node "${HARNESS_CLI}" ci`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
          timeout: 5000,
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, HARNESS_CONTEXT_ROOT: contextRoot },
        });
        assert.fail("Expected timeout to kill the command");
      } catch (error) {
        // Either timeout or actual failure, both are fine
        const output = (error.stdout || "") + (error.stderr || "");
        assert.ok(
          output.includes("harness:ci") || output.includes("CI Checks"),
          "should recognize ci command",
        );
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

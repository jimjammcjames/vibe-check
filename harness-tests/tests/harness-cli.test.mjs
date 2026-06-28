/**
 * Tests for harness.mjs CLI orchestrator
 */

import { spawn } from "node:child_process";
import { describe, it } from "node:test";
import assert from "node:assert";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  REPO_ROOT,
  TEST_DATE,
  TEST_TIMESTAMP,
  createContextRoot,
  getCurrentSessionPointerPathForTests,
  HARNESS_CLI,
  runHarness,
  runHarnessUntilMarkers,
} from "../helpers/harness-cli-helpers.mjs";

function clearCurrentSessionPointerForTests() {
  rmSync(getCurrentSessionPointerPathForTests(), { force: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("harness CLI", { concurrency: 1 }, () => {
  describe("prep command", () => {
    it("prints the MUST block from Harness.md", () => {
      const result = runHarness("prep");

      assert.strictEqual(result.exitCode, 0, "prep should exit with code 0");
      assert.ok(
        result.output.includes(
          "Bootstrap preflight passed before harness:prep",
        ),
        "should run bootstrap preflight before prep output",
      );
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

    it("supports explicit affected_files overrides for task-local scope", (t) => {
      const slug = "test-fixture-decision-affected-override";
      const contextRoot = createContextRoot(t);
      const harnessCliPath = [
        ".harness",
        "framework",
        "cli",
        "harness.mjs",
      ].join("/");
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(
        `new:entry --slug ${slug} --type decision --affected-file AGENTS.md --affected-file ${harnessCliPath}`,
        {
          HARNESS_DATE: TEST_DATE,
          HARNESS_CONTEXT_ROOT: contextRoot,
        },
      );
      assert.strictEqual(result.exitCode, 0, "should succeed");

      t.after(() => {
        if (existsSync(targetFile)) rmSync(targetFile);
      });

      const content = readFileSync(targetFile, "utf-8");
      const affectedFilesBlock = content.match(
        /affected_files:\n([\s\S]*?)\nsession_refs:/,
      )?.[1];
      assert.ok(
        content.includes('  - "AGENTS.md"'),
        "should record the first explicit affected file",
      );
      assert.ok(
        content.includes(`  - "${harnessCliPath}"`),
        "should record the second explicit affected file",
      );
      assert.ok(
        affectedFilesBlock && !affectedFilesBlock.includes('  - "NONE"'),
        "should replace the NONE placeholder when explicit files are provided",
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

    it("supports explicit affected_files overrides for meta entries", (t) => {
      const slug = "test-fixture-meta-affected-override";
      const contextRoot = createContextRoot(t);
      const harnessCliPath = [
        ".harness",
        "framework",
        "cli",
        "harness.mjs",
      ].join("/");
      const targetFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${slug}.md`,
      );
      if (existsSync(targetFile)) rmSync(targetFile);

      const result = runHarness(
        `new:meta --slug ${slug} --affected-file ${harnessCliPath}`,
        {
          HARNESS_DATE: TEST_DATE,
          HARNESS_CONTEXT_ROOT: contextRoot,
        },
      );
      assert.strictEqual(result.exitCode, 0, "should succeed");

      t.after(() => {
        if (existsSync(targetFile)) rmSync(targetFile);
      });

      const content = readFileSync(targetFile, "utf-8");
      const affectedFilesBlock = content.match(
        /affected_files:\n([\s\S]*?)\nsession_refs:/,
      )?.[1];
      assert.ok(
        content.includes(`  - "${harnessCliPath}"`),
        "should record the explicit affected file",
      );
      assert.ok(
        affectedFilesBlock && !affectedFilesBlock.includes('  - "NONE"'),
        "should replace the NONE placeholder when an explicit file is provided",
      );
    });

    it("links the same-day session with a repo-relative session_ref", (t) => {
      clearCurrentSessionPointerForTests();
      t.after(() => clearCurrentSessionPointerForTests());

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

    it("uses the current session pointer when multiple same-day sessions exist", (t) => {
      clearCurrentSessionPointerForTests();
      t.after(() => clearCurrentSessionPointerForTests());

      const sessionOneSlug = "test-session-pointer-one";
      const sessionTwoSlug = "test-session-pointer-two";
      const metaSlug = "test-meta-current-session";
      const sessionOneFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "sessions",
        `${TEST_DATE}-1234-${sessionOneSlug}.md`,
      );
      const sessionTwoFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "sessions",
        `${TEST_DATE}-1235-${sessionTwoSlug}.md`,
      );
      const metaFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        `${TEST_DATE}-${metaSlug}.md`,
      );

      [sessionOneFile, sessionTwoFile, metaFile].forEach((file) => {
        if (existsSync(file)) rmSync(file);
      });

      const sessionOneResult = runHarness(
        `new:session --slug ${sessionOneSlug}`,
        {
          HARNESS_DATE: TEST_DATE,
          HARNESS_TIMESTAMP: TEST_TIMESTAMP,
        },
      );
      assert.strictEqual(
        sessionOneResult.exitCode,
        0,
        `first session should succeed, got: ${sessionOneResult.output}`,
      );

      const sessionTwoResult = runHarness(
        `new:session --slug ${sessionTwoSlug}`,
        {
          HARNESS_DATE: TEST_DATE,
          HARNESS_TIMESTAMP: "2026-01-04T12:35:56.000Z",
        },
      );
      assert.strictEqual(
        sessionTwoResult.exitCode,
        0,
        `second session should succeed, got: ${sessionTwoResult.output}`,
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
        [sessionOneFile, sessionTwoFile, metaFile].forEach((file) => {
          if (existsSync(file)) rmSync(file);
        });
      });

      const metaContent = readFileSync(metaFile, "utf-8");
      assert.ok(
        metaContent.includes(
          '  - ".harness/context/sessions/2026-01-04-1235-test-session-pointer-two.md"',
        ),
        "meta entry should link the currently selected session",
      );

      const sessionTwoContent = readFileSync(sessionTwoFile, "utf-8");
      assert.ok(
        sessionTwoContent.includes(
          '  - ".harness/context/history/2026-01-04-test-meta-current-session.md"',
        ),
        "selected session should link back to the created history entry",
      );
    });

    it("supports switching and clearing the current session selection", (t) => {
      clearCurrentSessionPointerForTests();
      t.after(() => clearCurrentSessionPointerForTests());

      const sessionOneSlug = "test-session-switch-one";
      const sessionTwoSlug = "test-session-switch-two";
      const linkedMetaSlug = "test-meta-session-switch";
      const unlinkedMetaSlug = "test-meta-no-session";
      const sessionOneFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "sessions",
        `${TEST_DATE}-1236-${sessionOneSlug}.md`,
      );
      const sessionTwoFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "sessions",
        `${TEST_DATE}-1237-${sessionTwoSlug}.md`,
      );
      const linkedMetaFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        `${TEST_DATE}-${linkedMetaSlug}.md`,
      );
      const unlinkedMetaFile = join(
        REPO_ROOT,
        ".harness",
        "context",
        "history",
        `${TEST_DATE}-${unlinkedMetaSlug}.md`,
      );

      [
        sessionOneFile,
        sessionTwoFile,
        linkedMetaFile,
        unlinkedMetaFile,
      ].forEach((file) => {
        if (existsSync(file)) rmSync(file);
      });

      assert.strictEqual(
        runHarness(`new:session --slug ${sessionOneSlug}`, {
          HARNESS_DATE: TEST_DATE,
          HARNESS_TIMESTAMP: "2026-01-04T12:36:56.000Z",
        }).exitCode,
        0,
        "first session should be created",
      );
      assert.strictEqual(
        runHarness(`new:session --slug ${sessionTwoSlug}`, {
          HARNESS_DATE: TEST_DATE,
          HARNESS_TIMESTAMP: "2026-01-04T12:37:56.000Z",
        }).exitCode,
        0,
        "second session should be created",
      );

      const selectResult = runHarness(`session:use --slug ${sessionOneSlug}`, {
        HARNESS_DATE: TEST_DATE,
      });
      assert.strictEqual(
        selectResult.exitCode,
        0,
        `session switch should succeed, got: ${selectResult.output}`,
      );

      const linkedMetaResult = runHarness(`new:meta --slug ${linkedMetaSlug}`, {
        HARNESS_DATE: TEST_DATE,
      });
      assert.strictEqual(
        linkedMetaResult.exitCode,
        0,
        `linked meta should succeed, got: ${linkedMetaResult.output}`,
      );

      const clearResult = runHarness("session:clear", {
        HARNESS_DATE: TEST_DATE,
      });
      assert.strictEqual(
        clearResult.exitCode,
        0,
        `session clear should succeed, got: ${clearResult.output}`,
      );

      const unlinkedMetaResult = runHarness(
        `new:meta --slug ${unlinkedMetaSlug}`,
        { HARNESS_DATE: TEST_DATE },
      );
      assert.strictEqual(
        unlinkedMetaResult.exitCode,
        0,
        `unlinked meta should succeed, got: ${unlinkedMetaResult.output}`,
      );
      assert.ok(
        unlinkedMetaResult.output.includes("No current session linked."),
        "should warn when no current session is selected",
      );

      t.after(() => {
        [
          sessionOneFile,
          sessionTwoFile,
          linkedMetaFile,
          unlinkedMetaFile,
        ].forEach((file) => {
          if (existsSync(file)) rmSync(file);
        });
      });

      const linkedMetaContent = readFileSync(linkedMetaFile, "utf-8");
      assert.ok(
        linkedMetaContent.includes(
          '  - ".harness/context/sessions/2026-01-04-1236-test-session-switch-one.md"',
        ),
        "linked meta should use the manually selected session",
      );

      const unlinkedMetaContent = readFileSync(unlinkedMetaFile, "utf-8");
      assert.ok(
        unlinkedMetaContent.includes('  - "NONE"'),
        "clearing the current session should fall back to NONE",
      );
    });

    it("retries against live session state when a matching session appears during meta creation", async (t) => {
      clearCurrentSessionPointerForTests();
      t.after(() => clearCurrentSessionPointerForTests());

      const contextRoot = createContextRoot(t);
      const metaSlug = "test-meta-race";
      const sessionSlug = "test-session-race";
      const metaFile = join(
        contextRoot,
        "history",
        `${TEST_DATE}-${metaSlug}.md`,
      );
      const sessionFile = join(
        contextRoot,
        "sessions",
        `${TEST_DATE}-1234-${sessionSlug}.md`,
      );

      const child = spawn(
        "node",
        [
          HARNESS_CLI,
          "new:meta",
          "--slug",
          metaSlug,
          "--session-slug",
          sessionSlug,
        ],
        {
          cwd: REPO_ROOT,
          env: {
            ...process.env,
            HARNESS_DATE: TEST_DATE,
            HARNESS_CONTEXT_ROOT: contextRoot,
            HARNESS_SESSION_REF_RETRY_TIMEOUT_MS: "500",
            HARNESS_SESSION_REF_RETRY_INTERVAL_MS: "10",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let output = "";
      child.stdout?.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        output += chunk.toString();
      });

      await wait(50);

      const sessionResult = runHarness(`new:session --slug ${sessionSlug}`, {
        HARNESS_DATE: TEST_DATE,
        HARNESS_TIMESTAMP: TEST_TIMESTAMP,
        HARNESS_CONTEXT_ROOT: contextRoot,
      });
      assert.strictEqual(
        sessionResult.exitCode,
        0,
        `session creation during retry should succeed, got: ${sessionResult.output}`,
      );

      const exitCode = await new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", (code) => resolve(code));
      });

      assert.strictEqual(
        exitCode,
        0,
        `meta creation should succeed after the session appears. Output:\n${output}`,
      );
      assert.ok(existsSync(metaFile), "meta file should be created");

      const metaContent = readFileSync(metaFile, "utf-8");
      assert.ok(
        metaContent.includes(sessionFile),
        "meta entry should link the session that appeared during retry",
      );
    });
  });

  describe("new:session command", () => {
    it("creates a session entry with timestamp prefix", (t) => {
      clearCurrentSessionPointerForTests();
      t.after(() => clearCurrentSessionPointerForTests());

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
    it("starts post verification", async (t) => {
      const contextRoot = createContextRoot(t);
      const result = await runHarnessUntilMarkers(
        "post",
        ["=== harness:post ===", "▶ Post Checks ("],
        { HARNESS_CONTEXT_ROOT: contextRoot },
      );

      assert.ok(
        result.output.includes("=== harness:post ==="),
        "should print the post banner",
      );
      assert.ok(
        result.output.includes("▶ Post Checks ("),
        "should print the post checks section",
      );
    });
  });

  describe("ci command", () => {
    it("starts ci verification", async (t) => {
      const contextRoot = createContextRoot(t);
      const result = await runHarnessUntilMarkers(
        "ci",
        ["=== harness:ci ===", "▶ CI Checks ("],
        { HARNESS_CONTEXT_ROOT: contextRoot },
      );

      assert.ok(
        result.output.includes("=== harness:ci ==="),
        "should print the ci banner",
      );
      assert.ok(
        result.output.includes("▶ CI Checks ("),
        "should print the ci checks section",
      );
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

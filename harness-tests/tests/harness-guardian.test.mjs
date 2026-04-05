import test from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

function createGuardianFixtureRepo() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "harness-guardian-"));
  mkdirSync(join(fixtureRoot, ".harness", "context", "history"), {
    recursive: true,
  });
  mkdirSync(join(fixtureRoot, ".harness", "context", "sessions"), {
    recursive: true,
  });
  mkdirSync(
    join(fixtureRoot, "workflows", "skills", "review-harness-guardian"),
    { recursive: true },
  );
  mkdirSync(join(fixtureRoot, "node_modules"), { recursive: true });
  cpSync(
    join(REPO_ROOT, ".harness", "framework"),
    join(fixtureRoot, ".harness", "framework"),
    {
      recursive: true,
    },
  );
  cpSync(
    join(REPO_ROOT, ".harness", "config.yml"),
    join(fixtureRoot, ".harness", "config.yml"),
  );
  cpSync(
    join(REPO_ROOT, ".harness", "Harness.md"),
    join(fixtureRoot, ".harness", "Harness.md"),
  );
  cpSync(
    join(
      REPO_ROOT,
      "workflows",
      "skills",
      "review-harness-guardian",
      "SKILL.md",
    ),
    join(
      fixtureRoot,
      "workflows",
      "skills",
      "review-harness-guardian",
      "SKILL.md",
    ),
  );
  cpSync(
    join(REPO_ROOT, "node_modules", "yaml"),
    join(fixtureRoot, "node_modules", "yaml"),
    {
      recursive: true,
    },
  );

  execSync("git init", { cwd: fixtureRoot, stdio: "ignore" });
  execSync('git config user.name "Harness Test"', {
    cwd: fixtureRoot,
    stdio: "ignore",
  });
  execSync('git config user.email "harness-test@example.com"', {
    cwd: fixtureRoot,
    stdio: "ignore",
  });
  execSync("git add .", { cwd: fixtureRoot, stdio: "ignore" });
  execSync('git commit -m "fixture"', { cwd: fixtureRoot, stdio: "ignore" });
  execSync("git update-ref refs/remotes/origin/main HEAD", {
    cwd: fixtureRoot,
    stdio: "ignore",
  });

  return fixtureRoot;
}
/**
 * BEHAVIORAL TESTS: Harness Guardian
 *
 * Verifies that the Integrity Reviewer correctly protects the framework
 * by enforcing the meta-protocol and detecting gaming attempts.
 */

test("Harness Guardian: Enforcement Protocol", async (t) => {
  await t.test(
    "ignores context artifacts when no harnessCore files changed",
    () => {
      const fixtureRoot = createGuardianFixtureRepo();
      t.after(() => {
        rmSync(fixtureRoot, { recursive: true, force: true });
      });

      const marker = `${process.pid}-${Date.now()}`;
      const tempHistoryFile = join(
        fixtureRoot,
        ".harness",
        "context",
        "history",
        `guardian-temp-${marker}.md`,
      );
      const tempSessionFile = join(
        fixtureRoot,
        ".harness",
        "context",
        "sessions",
        `guardian-temp-${marker}.md`,
      );
      writeFileSync(
        tempHistoryFile,
        [
          "---",
          'date: "2026-04-05"',
          'type: "note"',
          'status: "active"',
          'schema: "v3"',
          "search_terms:",
          '  - "guardian temp fixture"',
          "related_entries:",
          '  - "NONE"',
          "affected_files:",
          '  - "NONE"',
          "session_refs:",
          '  - "NONE"',
          "tags:",
          '  - "#test-fixture"',
          "---",
          "",
          "# guardian-temp-fixture",
          "",
          "## Summary",
          "",
          "Temporary history artifact for guardian regression coverage.",
          "",
          "## Request / Intent",
          "",
          "Ensure context artifacts do not count as harness-core changes.",
          "",
          "## Context",
          "",
          "Created only during the test run.",
          "",
          "## Guidance Impact",
          "",
          "None.",
          "",
          "## Validation",
          "",
          "- test fixture only",
          "",
        ].join("\n"),
      );
      writeFileSync(
        tempSessionFile,
        [
          "---",
          'date: "2026-04-05"',
          'started_at: "2026-04-05T00:00:00.000Z"',
          "tags:",
          '  - "#test-fixture"',
          "related_history:",
          '  - "NONE"',
          "skills_used:",
          '  - "NONE"',
          "---",
          "",
          "# guardian-temp-fixture",
          "",
          "## Summary",
          "",
          "Temporary session artifact for guardian regression coverage.",
          "",
          "## User Intent",
          "",
          "Ensure context artifacts do not count as harness-core changes.",
          "",
          "## Timeline",
          "",
          "- [seq-01] assistant: create temporary context artifacts",
          "",
          "## Corrections & Thrash",
          "",
          "- user_correction: none",
          "- agent_correction: none",
          "- process_issue: none",
          "- thrash: none",
          "",
          "## Workflow Repetition",
          "",
          "- repeated_workflow: none",
          "- custom_script: none",
          "",
          "## Codify Candidates",
          "",
          "- candidate: target=history; description=none",
          "",
          "## Guidance Impact",
          "",
          "- none",
          "",
          "## Outcome",
          "",
          "Temporary session artifact only.",
          "",
        ].join("\n"),
      );

      const output = execSync(
        "node .harness/framework/scripts/harness-guardian.mjs",
        {
          cwd: fixtureRoot,
          encoding: "utf-8",
        },
      );
      assert.ok(
        output.includes("No harness modifications detected") ||
          output.includes("No changes to check"),
        "Context artifacts alone should not count as harness-core changes",
      );
    },
  );

  await t.test("meta-entry folder structure", () => {
    const metaDir = join(REPO_ROOT, ".harness", "context", "history");
    assert.ok(
      existsSync(metaDir),
      "History directory should exist for meta entries",
    );
  });
});

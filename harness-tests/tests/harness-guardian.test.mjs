import test from "node:test";
import assert from "node:assert";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");
/**
 * BEHAVIORAL TESTS: Harness Guardian
 *
 * Verifies that the Integrity Reviewer correctly protects the framework
 * by enforcing the meta-protocol and detecting gaming attempts.
 */

test("Harness Guardian: Enforcement Protocol", async (t) => {
  await t.test("detects harness modifications", () => {
    // Run guardian against CURRENT repo state (which has harness changes)
    // It SHOULD pass because we added a proper meta-entry AND the AI review succeeds.
    // If the AI review fails (rate limit, network, etc), THIS TEST FAILS.
    // No exceptions - the harness requires a working AI provider.
    try {
      const output = execSync(
        "node .harness/framework/scripts/harness-guardian.mjs",
        {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        },
      );
      const isVerified =
        output.includes("Integrity verified") ||
        output.includes("No harness modifications detected") ||
        output.includes("No changes to check");
      assert.ok(
        isVerified,
        "Should verify existing legitimate changes or detect no changes",
      );
    } catch (error) {
      const stdout = error.stdout || "";
      const stderr = error.stderr || "";
      const combined = stdout + stderr;

      if (
        combined.includes("No harness modifications detected") ||
        combined.includes("No changes to check")
      ) {
        // No changes to harness - this is fine
        assert.ok(true, "No harness modifications to check");
      } else {
        // ALL failures are test failures - including rate limits
        assert.fail(
          "Guardian failed: " + (combined || error.message).slice(0, 500),
        );
      }
    }
  });

  await t.test("meta-entry folder structure", () => {
    const metaDir = join(REPO_ROOT, ".harness", "context", "history");
    assert.ok(
      existsSync(metaDir),
      "History directory should exist for meta entries",
    );
  });
});

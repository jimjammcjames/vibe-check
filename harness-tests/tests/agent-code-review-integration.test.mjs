/**
 * Integration tests for agent-code-review.mjs
 *
 * Validates the shared adapter can execute with a real provider.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { adapters } from "../../.harness/framework/scripts/agent-code-review.mjs";
import {
  listProviders,
  getProvider,
} from "../../.harness/framework/providers/index.mjs";

describe("agent-code-review integration", () => {
  it("does not register a stub provider", () => {
    assert.ok(!listProviders().includes("stub"));
    assert.throws(() => getProvider("stub"));
  });

  it("runs shared adapter via configured provider and returns normalized result", async () => {
    const context = {
      diff: "diff --git a/file b/file",
      testFiles: ["harness-tests/tests/example.test.mjs"],
      historyEntries: [],
      testCommand: "npm test",
    };

    const result = await adapters.shared.review(context);

    assert.ok(["none", "low", "medium", "high"].includes(result.severity));
    assert.ok(Array.isArray(result.findings));
    assert.strictEqual(typeof result.summary, "string");
  });
});

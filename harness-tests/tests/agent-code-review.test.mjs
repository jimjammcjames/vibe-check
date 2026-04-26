/**
 * Tests for agent-code-review.mjs
 *
 * Exercises adapter selection and review result normalization.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  adapters,
  selectAdapter,
  getProviderConfig,
  buildReviewResult,
  buildAgentReviewFiles,
  buildReviewScope,
} from "../../.harness/framework/scripts/agent-code-review.mjs";

async function withEnv(vars, fn) {
  const previous = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    if (vars[key] === null) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

describe("agent-code-review logic", () => {
  describe("buildReviewResult", () => {
    it("returns high severity when gaming is detected", () => {
      const result = buildReviewResult({
        compliant: true,
        gaming_detected: true,
        quality_score: 8,
        violations: [],
      });
      assert.strictEqual(result.severity, "high");
    });

    it("returns high severity when not compliant", () => {
      const result = buildReviewResult({
        compliant: false,
        gaming_detected: false,
        quality_score: 8,
        violations: [],
      });
      assert.strictEqual(result.severity, "high");
    });

    it("returns high severity when entry/test mismatches exist", () => {
      const result = buildReviewResult({
        compliant: true,
        gaming_detected: false,
        entry_type_mismatch: true,
        missing_tests_for_fix: false,
        quality_score: 8,
        violations: [],
      });
      assert.strictEqual(result.severity, "high");
    });

    it("returns medium severity when quality score is low", () => {
      const result = buildReviewResult({
        compliant: true,
        gaming_detected: false,
        quality_score: 4,
        violations: [],
      });
      assert.strictEqual(result.severity, "medium");
    });

    it("returns none severity when all checks pass", () => {
      const result = buildReviewResult({
        compliant: true,
        gaming_detected: false,
        quality_score: 7,
        violations: [],
      });
      assert.strictEqual(result.severity, "none");
    });

    it("normalizes violations into findings", () => {
      const result = buildReviewResult({
        compliant: false,
        gaming_detected: false,
        violations: [
          { rule: "STRUCTURE", description: "Missing entry" },
          "Generic failure",
        ],
        summary: "Test summary",
      });

      assert.strictEqual(result.findings.length, 2);
      assert.strictEqual(result.findings[0].pattern, "STRUCTURE");
      assert.strictEqual(result.findings[1].pattern, "violation");
      assert.strictEqual(result.summary, "Test summary");
    });
  });

  describe("getProviderConfig", () => {
    it("uses gpt-4.1-nano for fast mode", () => {
      const config = getProviderConfig(true);
      assert.strictEqual(config.model, "gpt-4.1-nano");
    });

    it("uses gpt-4.1-mini for standard mode", () => {
      const config = getProviderConfig(false);
      assert.strictEqual(config.model, "gpt-4.1-mini");
    });
  });

  describe("selectAdapter", () => {
    it("prefers shared adapter when HARNESS_PROVIDER is set", async () => {
      const adapter = await withEnv({ HARNESS_PROVIDER: "gemini" }, () =>
        selectAdapter("auto"),
      );
      assert.strictEqual(adapter.name, adapters.shared.name);
    });

    it("falls back to shared adapter for unknown adapter names", async () => {
      const adapter = await withEnv({ HARNESS_PROVIDER: null }, () =>
        selectAdapter("unknown"),
      );
      assert.strictEqual(adapter.name, adapters.shared.name);
    });

    it("does not register stub adapter", () => {
      assert.strictEqual(adapters.stub, undefined);
    });
  });

  describe("buildReviewScope", () => {
    it("separates touched and inherited history/session entries", () => {
      const scope = buildReviewScope({
        historyEntries: [
          { file: ".harness/context/history/touched.md", schema: "v3" },
          { file: ".harness/context/history/inherited.md", schema: "v2" },
        ],
        sessionEntries: [
          { file: ".harness/context/sessions/touched.md" },
          { file: ".harness/context/sessions/inherited.md" },
        ],
        touchedFiles: new Set([
          ".harness/context/history/touched.md",
          ".harness/context/sessions/touched.md",
        ]),
      });

      assert.match(
        scope,
        /Touched history entries:\n- \[v3\] .harness\/context\/history\/touched.md/,
      );
      assert.match(
        scope,
        /Inherited history entries:\n- \[v2\] .harness\/context\/history\/inherited.md/,
      );
      assert.match(
        scope,
        /Touched session entries:\n- .harness\/context\/sessions\/touched.md/,
      );
      assert.match(
        scope,
        /Inherited session entries:\n- .harness\/context\/sessions\/inherited.md/,
      );
    });
  });

  describe("buildAgentReviewFiles", () => {
    it("includes sessions, review scope, and optional original request", () => {
      const files = buildAgentReviewFiles(
        {
          diff: "diff --git a/file b/file",
          testFiles: ["harness-tests/tests/example.test.mjs"],
          historyEntries: [
            {
              file: ".harness/context/history/example.md",
              content: "# history",
              type: "fix",
              schema: "v3",
            },
          ],
          sessionEntries: [
            {
              file: ".harness/context/sessions/example.md",
              content: "# session",
            },
          ],
          touchedFiles: new Set([
            ".harness/context/history/example.md",
            ".harness/context/sessions/example.md",
          ]),
        },
        { HARNESS_ORIGINAL_REQUEST: "Ship the intentional weird file." },
      );

      assert.match(
        files["HISTORY_ENTRIES.txt"],
        /\[FIX\]\[TOUCHED\]\[schema=v3\]/,
      );
      assert.match(files["SESSIONS.txt"], /\[SESSION\]\[TOUCHED\]/);
      assert.match(
        files["REVIEW_SCOPE.txt"],
        /Touched files in current branch\/worktree scope: 2/,
      );
      assert.equal(
        files["ORIGINAL_REQUEST.txt"],
        "Ship the intentional weird file.",
      );
    });

    it("omits ORIGINAL_REQUEST.txt when the env value is blank", () => {
      const files = buildAgentReviewFiles(
        {
          diff: "diff --git a/file b/file",
          testFiles: [],
          historyEntries: [],
          sessionEntries: [],
          touchedFiles: new Set(),
        },
        { HARNESS_ORIGINAL_REQUEST: "   " },
      );

      assert.equal(files["ORIGINAL_REQUEST.txt"], undefined);
    });
  });
});

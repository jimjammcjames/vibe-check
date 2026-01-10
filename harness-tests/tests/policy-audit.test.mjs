/**
 * Tests for policy-audit.mjs enforcement logic
 *
 * These tests validate the real rule checks and content validation helpers.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  loadConfig,
  matchesAnyGlob,
  checkRuleA,
  checkRuleB,
  validateEntryContent,
} from "../../.harness/framework/scripts/policy-audit.mjs";

const config = loadConfig();

describe("policy-audit logic", () => {
  describe("file classification (real globs)", () => {
    it("detects TypeScript files in src/", () => {
      assert.ok(matchesAnyGlob("src/index.ts", config.globs.realCode));
      assert.ok(
        matchesAnyGlob("src/components/Button.tsx", config.globs.realCode),
      );
    });

    it("detects harness script files as real code", () => {
      assert.ok(
        matchesAnyGlob(
          ".harness/framework/scripts/policy-audit.mjs",
          config.globs.realCode,
        ),
      );
    });

    it("detects exempt files", () => {
      assert.ok(matchesAnyGlob("package.json", config.globs.exempt));
      assert.ok(matchesAnyGlob("README.md", config.globs.exempt));
      assert.ok(matchesAnyGlob("tsconfig.json", config.globs.exempt));
    });

    it("detects test files", () => {
      assert.ok(matchesAnyGlob("src/utils.test.ts", config.globs.tests));
      assert.ok(
        matchesAnyGlob(
          "harness-tests/tests/example.test.mjs",
          config.globs.tests,
        ),
      );
    });
  });

  describe("Rule A: real code → history entry", () => {
    it("passes when only exempt files changed", () => {
      const files = ["package.json", "README.md"];
      const result = checkRuleA(files, config);
      assert.strictEqual(result.passed, true);
    });

    it("fails when real code changed without history entry", () => {
      const files = ["src/index.ts", "src/utils.ts"];
      const result = checkRuleA(files, config);
      assert.strictEqual(result.passed, false);
    });

    it("passes when real code changed with history entry", () => {
      const files = [
        "src/index.ts",
        ".harness/context/history/2025-01-01-fix.md",
      ];
      const result = checkRuleA(files, config);
      assert.strictEqual(result.passed, true);
    });

    it("passes when real code changed with decision entry", () => {
      const files = [
        "src/index.ts",
        ".harness/context/history/2025-01-01-arch.md",
      ];
      const result = checkRuleA(files, config);
      assert.strictEqual(result.passed, true);
    });
  });

  describe("Rule B: fix/incident → test delta", () => {
    it("passes when no fix/incident entry present", () => {
      const files = ["src/index.ts", ".harness/context/history/arch.md"];
      const result = checkRuleB(files, config, []);
      assert.strictEqual(result.passed, true);
    });

    it("fails when fix entry without test", () => {
      const files = ["src/index.ts", ".harness/context/history/fix.md"];
      const result = checkRuleB(files, config, [
        ".harness/context/history/fix.md",
      ]);
      assert.strictEqual(result.passed, false);
    });

    it("passes when fix entry with test file", () => {
      const files = [".harness/context/history/fix.md", "src/index.test.ts"];
      const result = checkRuleB(files, config, [
        ".harness/context/history/fix.md",
      ]);
      assert.strictEqual(result.passed, true);
    });
  });

  describe("Rule C: history entry → required fields", () => {
    it("validates complete decision entry with required fields", () => {
      const content = `---
date: 2026-01-02
type: decision
status: active
schema: v2
search_terms:
  - "auth"
related:
  - "NONE"
tags:
  - "#auth"
---

# Test Entry

## Summary

This summary explains the decision clearly and includes enough words to pass the minimum threshold.

## Context

This context provides enough background on why the decision was made, including constraints and alternatives. It also notes the system goals, the previous failures, and the metrics we care about.

## Decision

Use token-based auth.

## Rationale

Clear rationale here.

## Consequences

Some follow-up work is required.

## Validation

Reviewed in tests.
`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: [],
        isNewEntry: true,
      });
      assert.strictEqual(issues.length, 0);
    });

    it("fails when frontmatter is missing", () => {
      const content = `# Test Entry

## Summary

Missing frontmatter should fail.`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: [],
      });
      assert.ok(issues.some((i) => i.code === "FRONTMATTER_MISSING"));
    });

    it("fails when tags are missing", () => {
      const content = `---
date: 2026-01-02
type: decision
status: active
schema: v2
search_terms:
  - "auth"
related:
  - "NONE"
tags:
  - ""
---

# Test Entry

## Summary

This summary explains the decision clearly and includes enough words to pass the minimum threshold.

## Context

This context provides enough background on why the decision was made, including constraints and alternatives. It also notes the system goals, the previous failures, and the metrics we care about.
`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: [],
      });
      assert.ok(issues.some((i) => i.code === "TAGS_EMPTY"));
    });
  });

  describe("Rule C: Systemic Gap enforcement (fix/incident entries)", () => {
    it("fails when Systemic Gap section is missing", () => {
      const content = `---
date: 2026-01-02
type: fix
status: active
schema: v2
error_signature: "ExampleError: boom"
search_terms:
  - "logout bug"
related:
  - "NONE"
tags:
  - "#bug"
---

# Test Entry

## Summary

Fixed the token refresh bug that caused expired sessions to persist after logout by correcting cache invalidation and retry handling.

## Context

Users reported that sessions stayed active after logout because the refresh cache survived in-memory. The issue only appeared after rapid logins, and the logs were noisy. We traced it to the cache key not being cleared during sign-out and verified the flow with a local repro.

## Validation

Ran the new test and reproduced the fix locally.
`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: [],
      });
      assert.ok(issues.some((i) => i.code === "GAP_MISSING"));
    });

    it("passes when Systemic Gap has substantive content and gap closure", () => {
      const content = `---
date: 2026-01-02
type: fix
status: active
schema: v2
error_signature: "ExampleError: boom"
search_terms:
  - "logout bug"
related:
  - "NONE"
tags:
  - "#bug"
---

# Test Entry

## Summary

Fixed the token refresh bug that caused expired sessions to persist after logout by correcting cache invalidation and retry handling.

## Context

Users reported that sessions stayed active after logout because the refresh cache survived in-memory. The issue only appeared after rapid logins, and the logs were noisy. We traced it to the cache key not being cleared during sign-out and verified the flow with a local repro.

## Validation

Ran the new test and reproduced the fix locally.

## Systemic Gap

The logout flow lacked a guard for stale refresh cache entries, so the issue escaped review.

Gap Closure: Added test: \`harness-tests/tests/session-refresh.test.mjs\`
`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: ["harness-tests/tests/session-refresh.test.mjs"],
        isNewEntry: true,
      });
      assert.strictEqual(issues.length, 0);
    });

    it("fails when Gap Closure file not in diff", () => {
      const content = `---
date: 2026-01-02
type: fix
status: active
schema: v2
error_signature: "ExampleError: boom"
search_terms:
  - "logout bug"
related:
  - "NONE"
tags:
  - "#bug"
---

# Test Entry

## Summary

Fixed the token refresh bug that caused expired sessions to persist after logout by correcting cache invalidation and retry handling.

## Context

Users reported that sessions stayed active after logout because the refresh cache survived in-memory. The issue only appeared after rapid logins, and the logs were noisy. We traced it to the cache key not being cleared during sign-out and verified the flow with a local repro.

## Validation

Ran the new test and reproduced the fix locally.

## Systemic Gap

This gap explains why the issue escaped review and highlights the missing coverage.

Gap Closure: Added test: \`harness-tests/tests/nonexistent.test.mjs\`
`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: ["src/index.ts"],
        isNewEntry: true,
      });
      assert.ok(issues.some((i) => i.code === "GAP_FILE_NOT_IN_DIFF"));
    });
  });
});

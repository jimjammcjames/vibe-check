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
  checkStagedContextRule,
  validateEntryContent,
  validateSessionContent,
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

    it("fails when a v3 entry is missing Guidance Impact", () => {
      const content = `---
date: 2026-01-02
type: decision
status: active
schema: v3
search_terms:
  - "auth"
related_entries:
  - "NONE"
affected_files:
  - "src/auth.ts"
session_refs:
  - ".harness/context/sessions/2026-01-02-auth.md"
tags:
  - "#auth"
---

# Test Entry

## Summary

This summary explains the decision clearly and includes enough words to pass the minimum threshold.

## Request / Intent

Document the auth decision and its durable consequences for future changes.

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
      assert.ok(issues.some((i) => i.code === "GUIDANCE_IMPACT_MISSING"));
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

## Class Prevention

We added a generalized guardrail that invalidates refresh cache entries on any logout path and asserts the invariant in a new test. The test covers multiple session states, not just the repro, so similar token refresh bugs are prevented.
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

## Class Prevention

We added a generalized guardrail that invalidates refresh cache entries on any logout path and asserts the invariant in a new test. The test covers multiple session states, not just the repro, so similar token refresh bugs are prevented.
`;
      const issues = validateEntryContent({
        file: "history-entry.md",
        content,
        diffFiles: ["src/index.ts"],
        isNewEntry: true,
      });
      assert.ok(issues.some((i) => i.code === "GAP_FILE_NOT_IN_DIFF"));
    });

    it("fails when Class Prevention section is missing", () => {
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
      assert.ok(issues.some((i) => i.code === "CLASS_PREVENTION_MISSING"));
    });

    it("allows Class Prevention exemption tag", () => {
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
  - "#class-prevention-exempt"
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
      assert.ok(!issues.some((i) => i.code === "CLASS_PREVENTION_MISSING"));
    });
  });

  describe("Rule S: session entry validation", () => {
    it("passes for a complete session entry", () => {
      const content = `---
date: 2026-01-02
started_at: 2026-01-02T10:00:00.000Z
tags:
  - "#harness"
related_history:
  - "NONE"
skills_used:
  - "NONE"
---

# Session

## Summary

Investigating the canonical harness refresh while keeping notes about the
workflow decisions and corrections that happened along the way.

## User Intent

Bring the stale canonical harness up to parity with the patterns that proved
useful in the sibling repos.

## Timeline

- [seq-01] user: asked for the canonical repo to absorb the common evolutions.
- [seq-02] assistant: inspected the repo and planned the first ports.

## Corrections & Thrash

- user_correction: none
- agent_correction: none
- process_issue: none
- thrash: none

## Workflow Repetition

- repeated_workflow: none
- custom_script: none

## Codify Candidates

- candidate: target=skill; capture the cross-repo harness comparison workflow

## Guidance Impact

No durable guidance changed in this session.

## Outcome

Ported the first high-leverage set of harness evolutions into the canonical repo.
`;
      const issues = validateSessionContent({
        file: ".harness/context/sessions/example.md",
        content,
        requireFilledBullets: true,
      });
      assert.strictEqual(issues.length, 0);
    });

    it("fails when started_at is missing", () => {
      const content = `---
date: 2026-01-02
tags:
  - "#harness"
related_history:
  - "NONE"
skills_used:
  - "NONE"
---

# Session

## Summary

Missing started_at should fail.

## User Intent

Intent.

## Timeline

- [seq-01] user: asked for a fix.

## Corrections & Thrash

- user_correction: none
- agent_correction: none
- process_issue: none
- thrash: none

## Workflow Repetition

- repeated_workflow: none
- custom_script: none

## Codify Candidates

- candidate: target=skill; note

## Guidance Impact

No durable guidance changed in this session.

## Outcome

Outcome.
`;
      const issues = validateSessionContent({
        file: ".harness/context/sessions/example.md",
        content,
      });
      assert.ok(issues.some((i) => i.code === "SESSION_STARTED_AT_MISSING"));
    });

    it("fails when Guidance Impact is missing", () => {
      const content = `---
date: 2026-01-02
started_at: 2026-01-02T10:00:00.000Z
tags:
  - "#harness"
related_history:
  - "NONE"
skills_used:
  - "NONE"
---

# Session

## Summary

Session summary.

## User Intent

Intent.

## Timeline

- [seq-01] user: asked for a fix.

## Corrections & Thrash

- user_correction: none
- agent_correction: none
- process_issue: none
- thrash: none

## Workflow Repetition

- repeated_workflow: none
- custom_script: none

## Codify Candidates

- candidate: target=skill; note

## Outcome

Outcome.
`;
      const issues = validateSessionContent({
        file: ".harness/context/sessions/example.md",
        content,
      });
      assert.ok(
        issues.some((i) => i.code === "SESSION_GUIDANCE_IMPACT_MISSING"),
      );
    });
  });

  describe("Rule D: staged context coverage", () => {
    it("fails when staged real code has no staged session", () => {
      const historyEntries = [
        {
          file: ".harness/context/history/2026-01-02-example.md",
          content: `---
date: 2026-01-02
type: decision
status: active
schema: v3
search_terms:
  - "example"
related_entries:
  - "NONE"
affected_files:
  - "src/index.ts"
session_refs:
  - "NONE"
tags:
  - "#harness"
---

# Example

## Summary

This summary is long enough to satisfy the minimum word count in the validator.

## Request / Intent

Capture the intent for the staged canonical harness change.

## Context

This context is long enough to satisfy the validator and explains the reason
for the staged code change.

## Decision

Adopt the newer harness structure.

## Rationale

It provides better commit provenance and clearer operator workflow.

## Consequences

The repo now expects staged session coverage for staged real code.

## Validation

Reviewed with targeted harness tests.
`,
        },
      ];

      const result = checkStagedContextRule({
        diffFiles: ["src/index.ts"],
        config,
        historyEntries,
        sessionEntries: [],
      });

      assert.strictEqual(result.passed, false);
      assert.match(result.message, /requires a staged session update/);
    });
  });
});

---
date: "2026-04-05"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "base ref portability"
  - "review coverage diagnostics"
  - "tripwire sandbox isolation"
  - "session linkage rule"
related_entries:
  - "NONE"
affected_files:
  - ".github/workflows/harness.yml"
  - ".harness/Harness.md"
  - ".harness/config.yml"
  - ".harness/framework/cli/harness.mjs"
  - ".harness/framework/lib/base-ref.mjs"
  - ".harness/framework/scripts/agent-code-review.mjs"
  - ".harness/framework/scripts/agent-memory-coherence.mjs"
  - ".harness/framework/scripts/base-tripwire.mjs"
  - ".harness/framework/scripts/harness-guardian.mjs"
  - ".harness/framework/scripts/policy-audit.mjs"
  - ".harness/framework/scripts/print-base-ref.mjs"
  - ".harness/framework/scripts/test-lint.mjs"
  - ".harness/framework/scripts/undocumented-detector.mjs"
  - ".harness/setup/AGENT-SETUP.md"
  - ".harness/setup/harness-ci.yml"
  - "AGENTS.md"
  - "harness-tests/simulation/lib/setup-sandbox.sh"
  - "harness-tests/tests/base-ref.test.mjs"
  - "harness-tests/tests/base-tripwire.test.mjs"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/provider-selection.test.mjs"
  - "workflows/skills/history-first-branch-merge/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
  - "workflows/skills/merge-pr/SKILL.md"
  - "workflows/skills/refine-code/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-05-0453-fix-open-harness-audit-issues.md"
tags:
  - "#harness-meta"
  - "#ci"
  - "#workflow"
---

# close-open-harness-audit-issues

## Summary

Closed the remaining unresolved harness audit items by unifying base-ref
resolution, making CI review degradation explicit and machine-readable,
replacing brittle smoke and tripwire test assumptions, and codifying the
workflow rules that were still living only in the audit notes.

## Context

The incremental churn audit identified a set of still-open problems clustered
around base-branch assumptions, duplicated config parsing, implicit skipped
review coverage in hosted CI, brittle command-smoke heuristics, test fixtures
that touched the real checkout, and workflow rules that operators still had to
remember from memory instead of reading from the repo.

## Technical Decision

Fix the whole cluster as one harness-core hardening pass rather than as
isolated one-off patches. Concretely, the repo now resolves base refs through a
single shared helper, exposes a shell-friendly `print-base-ref` script for
skills and docs, writes review-coverage diagnostics on every CI run, verifies
CLI startup by observing real markers, sandboxes tripwire fixtures in disposable
worktrees, and documents the merge/session rules in the durable operator docs.

## Security & Integrity Impact

These changes strengthen integrity without weakening any gate. Base-ref
selection is now deterministic across non-`main` repos, hosted CI can no longer
silently skip provider-backed reviews without leaving a machine-readable trace,
and the tripwire/tests now prove cleanup and discovery behavior without writing
synthetic files into the real checkout where they could pollute later review or
policy signals.

## Conformance & Enforcement

`agent-code-review`, `base-tripwire`, `harness-guardian`,
`agent-memory-coherence`, `undocumented-detector`, `test-lint`, and
`policy-audit` now share the same base-ref resolution path. `harness:ci`
produces `.harness/diagnostics/latest/review-coverage.json` and appends a
GitHub Actions summary describing whether provider-backed reviews ran or were
skipped. The test suite now covers base-ref fallback rules, review-coverage
diagnostics, spawn-based CLI smoke detection, and sandboxed tripwire cleanup,
while the merge and refinement skills point shell snippets at the helper
instead of a hard-coded branch name.

## Guidance Impact

Added short durable rules to `AGENTS.md` and `.harness/Harness.md` for
session-before-history sequencing when immediate linkage matters, updated
`.harness/setup/AGENT-SETUP.md` plus the CI workflows to preserve diagnostics
artifacts, and taught `workflows/skills/merge-pr/SKILL.md` to split unrelated
harness/tooling blockers into a dedicated follow-up unless the merge candidate
cannot be separated cleanly.

## Raw Notes

- Focused regression validation passed with:
  `node --import tsx --test harness-tests/tests/base-ref.test.mjs harness-tests/tests/provider-selection.test.mjs harness-tests/tests/harness-cli.test.mjs harness-tests/tests/base-tripwire.test.mjs`
- Broader harness validation was iterated through `npm run harness:iterate`,
  `node .harness/framework/scripts/test-lint.mjs`, and repeated
  `npm run harness:ci` runs until the remaining failures were reduced to the
  context-artifact placeholders addressed in this entry and the linked session.
- Final full-gate validation passed with `npm run harness:ci`.
- The full `npm test` suite also exercised the live `agent-code-review`
  integration path with the configured Gemini provider during validation.

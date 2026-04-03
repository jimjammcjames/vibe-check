---
date: "2026-04-03"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "harness meta entry for user preferences smoke fix"
  - "guardian requires harness meta"
  - "agents md plus harness test change"
related_entries:
  - ".harness/context/history/2026-04-02-cross-repo-workflow-preferences.md"
  - ".harness/context/history/2026-04-03-harness-cli-smoke-fast-fail.md"
affected_files:
  - "AGENTS.md"
  - "harness-tests/tests/harness-cli.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-04-02-0851-cross-repo-workflow-preferences.md"
tags:
  - "#harness-meta"
---

# user-preferences-smoke-fix

## Summary

Added the required `#harness-meta` entry for this branch because the work
changes harness-facing policy in `AGENTS.md` and a harness verification test in
`harness-cli.test.mjs`, and the guardian correctly treats that combination as a
harness-core change that must carry explicit meta provenance.

## Context

The branch started as a user-guidance update plus a targeted harness test fix,
each with its own decision or fix entry. Those entries were useful for the
substantive behavior changes, but the full `harness:ci` gate still failed in the
guardian step because the branch also changes harness-facing surfaces that the
repo classifies as harness-core. The guardian's message was explicit: add a
`#harness-meta` history entry rather than relying on product-style entries to
implicitly cover harness governance.

## Technical Decision

Keep the existing decision entry for the cross-repo `AGENTS.md` guidance and the
existing fix entry for the `harness-cli` smoke-test cleanup, but add this
separate meta entry to record the harness-core implications of the branch. This
preserves topic clarity while satisfying the repo rule that harness-facing
changes must carry explicit `#harness-meta` provenance.

## Security & Integrity Impact

This strengthens enforcement rather than weakening it. The guardian correctly
blocked a harness-facing branch that lacked a meta artifact, and this change
accepts that requirement in tracked history instead of bypassing or loosening
the check. Future reviewers can now see both the behavioral changes and the
harness-governance rationale that allowed them to land.

## Conformance & Enforcement

This meta entry is the conformance artifact the guardian expects for branches
that change harness-facing policy or enforcement tests. After adding it, rerun
the normal repo gates so the branch proves the guardian, policy audit, and CI
stack all accept the final candidate without special-casing.

## Guidance Impact

This entry does not introduce a new governance rule by itself; it records the
already-enforced repo expectation that branches touching harness-facing docs or
tests carry explicit `#harness-meta` provenance. The durable guidance impact is
therefore documentary and audit-oriented rather than a new operator workflow.

## Raw Notes

- The failing guardian message during `harness:ci` explicitly called for a
  `#harness-meta` entry.
- The branch is intentionally split across three tracked artifacts: a decision
  entry for the user-preferences guidance, a fix entry for the smoke-test
  blocker, and this meta entry for harness-core governance.

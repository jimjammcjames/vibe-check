---
date: "2026-04-05"
type: "fix"
status: "active"
schema: "v3"
search_terms:
  - "harness guardian context artifact filter"
  - "guardian ignores session and history artifacts"
  - "clean branch harness ci failure"
related_entries:
  - ".harness/context/history/2026-04-02-abstract-meta-codification-behaviors.md"
affected_files:
  - ".harness/framework/scripts/harness-guardian.mjs"
  - "harness-tests/tests/harness-guardian.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-04-05-1210-guardian-context-artifact-filter.md"
error_signature: "Harness Guardian: Enforcement Protocol flagged a clean-branch CI run because temporary .harness/context artifacts were treated as harness-core changes."
tags:
  - "#harness-meta"
  - "#harness-fix"
  - "#ci"
  - "#tests"
---

# guardian-context-artifact-filter

## Summary

Aligned `harness-guardian` with the configured `harnessCore` boundary so
context artifacts under `.harness/context/**` no longer count as harness-core
changes during outer-loop review, and added regression coverage that drops
temporary history/session files while invoking the guardian path.

## Request / Intent

Get the canonical parent back to a truthful green `harness:ci` run after the
cross-repo sync exposed a clean-branch failure in the guardian path.

## Context

After fast-forwarding this repo to the already-landed April 2 parent upgrades,
`npm run harness:ci` failed on a clean branch inside
`harness-tests/tests/harness-guardian.test.mjs`. The failure path showed
`harness-guardian.mjs` reporting a harness meta-security violation even though
the worktree had no real harness-core diff relative to `origin/main`. The
likely source was concurrent CLI tests creating temporary history/session files
under `.harness/context/**`, which the guardian still treated as harness work
because it filtered on `f.startsWith(".harness/")` instead of the repo's
configured `globs.harnessCore`.

## Error

- `npm run harness:ci` failed on a clean synced branch in
  `harness-tests/tests/harness-guardian.test.mjs`
- The failing message was `Harness meta-security violation!`
- Root cause: temporary history/session artifacts under `.harness/context/**`
  were treated as harness-core diffs even though `config.globs.harnessCore`
  intentionally excludes them

## What Changed

- Loaded the repo harness config inside `harness-guardian.mjs`
- Filtered guardian review scope through `globs.harnessCore`, while still
  always treating `harness-tests/**` as harness-review scope
- Reworked `harness-guardian.test.mjs` into a sandbox-safe temp-repo fixture
  that proves untracked context artifacts do not count as harness-core changes
  and no longer depends on a localhost HTTP stub

## Validation

- `node --import tsx --test harness-tests/tests/harness-guardian.test.mjs`
- `npm test`
- `npm run harness:post`
- `npm run harness:ci` after retyping this entry

## Systemic Gap

The guardian had drifted away from the repo's own harness configuration and
used a blanket `.harness/**` prefix check instead of the shared
`globs.harnessCore` contract. That let temporary context artifacts created by
other harness workflows masquerade as enforcement-code changes and break a
clean outer loop.

Gap Closure: Added test/validation: `harness-tests/tests/harness-guardian.test.mjs`

## Class Prevention

When a harness script decides whether a diff touches enforcement code, it
should consume the same configured scope used elsewhere in the harness instead
of re-encoding a broader path heuristic. Regression tests for those scripts
should also stay sandbox-safe so CI failures reflect real harness behavior
rather than environmental socket restrictions.

## Guidance Impact

- none. This repair stays inside harness enforcement code and test coverage.

## Raw Notes

- The first regression-test attempt still used a localhost HTTP stub and
  exposed a sandbox-only `listen EPERM`; replacing it with a temp-repo fixture
  kept the proof hermetic and environment-safe.

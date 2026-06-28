---
date: "2026-06-28"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream jun 28"
  - "affected file override"
  - "task local affected files"
  - "moves vibe-check managed context"
related_entries:
  - ".harness/context/history/2026-06-21-cross-repo-harness-upstream-jun21.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/cli/harness.mjs"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
  - "workflows/skills/merge-pr/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-06-28-1222-extract-harness-refresh-jun28.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
---

# cross-repo-harness-upstream-jun28

## Summary

Reviewed `moves`, `moves-algorithm`, and `life.exe` plus the shared
`compound` automation context for the exact local-date window from
2026-06-21 through 2026-06-28, then upstreamed one fresh parent-shaped
improvement: `harness new:entry` and `harness new:meta` now accept repeated
`--affected-file` flags so history artifacts can record the task-local payload
on larger preexisting branches, rebases, or publish/merge follow-up work.

## Context

The sibling evidence split cleanly again:

- `moves` had the only fresh harness-adjacent movement in-window, but the new
  signal was not another portable skill or framework-core gate. Its
  `vibe-check` publish/merge flow now writes managed context artifacts with
  explicit file-context capture before deterministic checks run. That
  reinforced an older parent carryover: task-local file coverage can get
  blurry when a new history artifact is created on top of a larger existing
  branch.
- `moves-algorithm` had no exact-window harness churn and mainly reinforced
  already-known carryovers around mixed-runtime porting and simulation hygiene.
- `life.exe` also had no exact-window harness churn. Its strongest reusable
  signals remained older carryovers around validation registration,
  history-only repair policy, and hook-environment hardening rather than a new
  weekly parent delta.
- The returning repo scouts sharpened two selection boundaries: `moves`
  reinforced proof-artifact freshness plus the difference between gate-only and
  code-bearing artifacts, while `moves-algorithm` reinforced that empty exact
  windows and stale carryover notes should stay carryover-only instead of being
  promoted as fresh parent churn.
- Shared `compound` automation context still rewarded exact-window honesty
  first, then older carryovers only when they exposed a still-open generic gap.

The main design question was whether to import `moves`'s full publish/merge
wrapper into the canonical parent. The parent's architecture invariants still
say "No wrapper required," so copying `vibe-check` directly would widen the
entrypoint surface and fight the current parent shape. The cleaner abstraction
was to keep the existing parent entrypoints and import only the reusable
`affected_files` fidelity improvement.

## Technical Decision

Extend the current parent scaffolding instead of importing a new wrapper flow:

- add repeated `--affected-file <repo-relative-path>` overrides to
  `harness new:entry` and `harness new:meta`
- keep those overrides task-local and repo-local by normalizing them to
  repo-relative paths and rejecting `NONE` or outside-repo paths
- update `.harness/Harness.md` so operators know to use the override when the
  current task covers only part of a larger branch, replay, or publish/merge
  follow-up
- update the existing `merge-main-open-pr` and `merge-pr` skills so the rule
  lives where this problem most often shows up
- add focused CLI tests for both `new:entry` and `new:meta`

Deliberately skip the still-attractive but broader imports for now:

- no direct `moves` `vibe-check` / managed-history wrapper uplift because it
  conflicts with the parent's "No wrapper required" invariant
- no `life.exe` validation catalog, canary/live lane registry, or feature
  control plane uplift in this weekly pass
- no `life.exe` history-only repair or hook-env policy change yet because they
  remain broader carryovers without a fresher parent trigger than the
  `affected_files` gap
- no new `moves-algorithm` simulation-hygiene work because the relevant
  mixed-runtime carryovers are already documented in earlier parent history
  uplifts

## Security & Integrity Impact

This change strengthens audit truthfulness without weakening enforcement. The
staged policy still requires `affected_files` coverage for staged real code,
but operators now have a first-class way to keep new history/meta artifacts
scoped to the files changed by the current task instead of silently
over-broadening to an older branch payload or defaulting to `NONE`. The new
path also rejects `NONE` and outside-repo overrides to keep the metadata
honest.

## Conformance & Enforcement

- `npm run harness:prep`
- `node --import tsx --test harness-tests/tests/harness-cli.test.mjs`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`

## Guidance Impact

The reusable rule now lives in the existing parent owners instead of a new
wrapper surface:

- `.harness/framework/cli/harness.mjs` owns the new `--affected-file`
  scaffolding behavior for `new:entry` and `new:meta`
- `.harness/Harness.md` explains when to use the override
- `workflows/skills/merge-main-open-pr/SKILL.md` and
  `workflows/skills/merge-pr/SKILL.md` route publish/merge operators to the
  new task-local scope capture path

No new top-level workflow or wrapper command was added.

## Raw Notes

- Fresh exact-window git evidence showed only `moves` touching harness context
  surfaces in-window, and those edits were history/session artifacts rather
  than generic parent-core code.
- The `moves` signal was still useful because its managed artifacts made the
  older `affected_files` fidelity gap concrete again. Its returning scout also
  highlighted proof-artifact freshness and provenance, but those fit better as
  continued `prove-it` pressure than as a cleaner weekly parent change than the
  new `--affected-file` override.
- The `moves-algorithm` scout reinforced exact-window-none honesty and stale
  carryover caution, but the reusable mixed-runtime and simulation-hygiene
  ideas were already covered by earlier parent uplifts.
- `life.exe`'s strongest carryover signals this week were validation
  registration, history-only repair policy, and hook-env sanitization, but they
  did not beat the clarity or parent-fit of the narrower `affected_files`
  override.
- I accidentally kicked off the full harness test suite once via `npm test`
  before switching to the intended focused `harness-cli` test; no repo files
  were changed because of that.

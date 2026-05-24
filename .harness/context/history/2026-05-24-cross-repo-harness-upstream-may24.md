---
date: "2026-05-24"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream may 24"
  - "current session pointer"
  - "session retry live caller fix"
  - "durable validation truthfulness"
  - "portable contract path hygiene"
related_entries:
  - ".harness/context/history/2026-05-17-cross-repo-harness-upstream-may17.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/cli/harness.mjs"
  - "AGENTS.md"
  - "harness-tests/helpers/harness-cli-helpers.mjs"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/harness-session-retry.test.mjs"
  - "package.json"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/find-regressions/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-05-24-1210-cross-repo-harness-extract-may24.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
  - "#automation"
---

# cross-repo-harness-upstream-may24

## Summary

Upstreamed the strongest still-generic harness improvements surfaced across
`moves`, `moves-algorithm`, and `life.exe` for the exact window from
2026-05-17 through 2026-05-24 by adding a per-worktree current-session pointer
workflow, fixing the live `cmdNewEntry()` session retry gap, and tightening the
parent skills/docs around durable validation truthfulness and portable
cross-repo contract guidance.

## Context

This pass compared the canonical parent against the sibling harness installs in
`/Users/jamesdugle/Repos/moves`, `/Users/jamesdugle/Repos/moves-algorithm`, and
`/Users/jamesdugle/Repos/life.exe`, plus the repo-associated compound
automation context for the same exact window.

The repo scouts converged on a narrow portable set:

- `moves` had the only clearly ahead generic operator feature: a per-worktree
  current-session pointer with `session:use` / `session:clear`, plus the same
  week’s local-vs-live validation-boundary language.
- `moves-algorithm` had no fresh in-window harness changes, but the carryover
  audits reinforced three generic lessons: reusable docs/skills must not pin
  personal absolute paths, local gates are not durable unless committed CI runs
  them, and shared cross-repo contracts should prefer owner-published artifacts
  plus participant-declared verify commands.
- `life.exe` also had an empty in-window history surface, but its carryover
  work reinforced keeping live-only claims honest and avoiding mixed-scope
  landing payloads that silently combine product and workflow-governing change.

The work also reproduced an already-open parent carryover in the live CLI path:
I mistakenly launched `harness:new:session` and the linked `harness:new:meta`
in parallel once, and `cmdNewEntry()` failed to see the just-created session
because it retried against a frozen `sessionFiles` snapshot. That matched the
shared compound automation note and made the fix directly in-scope.

## Technical Decision

Land only the improvements that fit existing parent owners without widening the
surface into repo-shaped review stacks, product flows, or personal-ops
catalogs:

- add a per-worktree current-session pointer stored in Git metadata, wire
  `new:session` to select it automatically, and add `session:use`,
  `session:clear`, plus the deprecated alias `close:session`
- update `cmdNewEntry()` to retry against live session state instead of a
  frozen session-file snapshot so explicit `--session-slug` links can observe a
  just-created session during the retry window
- update the parent AGENTS/Harness operator contract to explain the new
  current-session model and to codify clone-shape-safe reusable guidance
- extend `durable-surface-contracts` so durable validation claims explicitly
  separate bounded local gates from protected live workflows, require real CI
  wiring when a gate is supposed to protect PRs/merges, and prefer
  owner-published cross-repo contract artifacts over hardcoded clone paths
- extend `find-regressions` with the same CI-enforcement truthfulness check
- extend `merge-main-open-pr` so mixed product-plus-workflow payloads are
  called out and split unless the coupling is truly required

Deliberately skip the attractive but overlapping or still repo-shaped ideas:

- no wholesale port of `moves` `code-health-review` or `edge-case-flow-review`
  as new sibling skills yet; the parent already has overlapping owners and
  needs a merge/owner pass first
- no direct import of `life.exe` `feature-endgame` yet; it overlaps heavily
  with `feature-discovery`, `durable-surface-contracts`, and `review-skill`
  and needs a clearer parent owner before adding another front-door feature
  workflow
- no raw release-lane, Playwright/Firebase, notification-emulator, NanoClaw,
  Hermes, feature-catalog, or personal-automation surfaces

## Security & Integrity Impact

These changes strengthen integrity without weakening any gate. The
current-session pointer reduces accidental mis-linking when multiple sessions
exist for the same day, while still keeping session files append-only. The live
retry fix closes a real audit-trail race in the CLI caller instead of only at
the helper level. The skill/doc updates also reduce false confidence by making
local-vs-live boundaries, CI wiring expectations, and mixed-scope landing risk
explicit.

## Conformance & Enforcement

- `node --import tsx --test harness-tests/tests/harness-cli.test.mjs harness-tests/tests/harness-session-retry.test.mjs`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `HARNESS_CODEX_REASONING=low node .harness/framework/scripts/agent-memory-coherence.mjs`
- `npm run harness:ci -- --codex-reasoning low`

## Guidance Impact

`AGENTS.md` and `.harness/Harness.md` now teach the current-session pointer
model instead of the older “same-day sessions imply `--session-slug`” default.
The parent `durable-surface-contracts`, `find-regressions`, and
`merge-main-open-pr` skills now carry the selected sibling-repo lessons about
validation truthfulness, CI enforcement reality, and portable cross-repo
contract shape.

## Raw Notes

- The first linked meta-creation attempt intentionally reproduced the open live
  caller bug by racing `new:session` and `new:meta` in parallel; the final CLI
  patch now proves that the explicit `--session-slug` path re-reads live
  session state during retry.
- The default `harness:ci` path twice failed only because the fallback Codex
  review provider hit a transient rate-limit/network unavailability during
  `agent-memory-coherence`; the final green run used the supported
  `--codex-reasoning low` CLI override without changing provider selection or
  weakening any gate.
- The sibling scouts were still most useful as selection pressure rather than
  direct copy sources in this window: `moves` contributed the concrete session
  routing feature, while `moves-algorithm` and `life.exe` mostly contributed
  carryover audit lessons and “skip this, too repo-shaped” pressure.

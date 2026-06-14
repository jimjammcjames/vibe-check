---
date: "2026-06-14"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream jun 14"
  - "moves code health review"
  - "proactive coding guardrails"
  - "anti slop task contract review"
  - "empty exact window carryover"
related_entries:
  - ".harness/context/history/2026-05-31-cross-repo-harness-upstream-may31.md"
affected_files:
  - "AGENTS.md"
  - "workflows/skills/anti-slop-review/SKILL.md"
  - "workflows/skills/review-skill/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-06-14-1527-extract-harness-refresh-jun14.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
---

# cross-repo-harness-upstream-jun14

## Summary

Reviewed the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe` plus the shared compound automation context for the exact window
from 2026-06-07 through 2026-06-14, then upstreamed the strongest generic
review-guidance delta into the parent: proactive coding guardrails in
`AGENTS.md` and a broader anti-slop review pass that now checks task-contract
truthfulness, state/function contract discipline, test-signal quality, and
guidance overlap.

## Context

This pass started from the prior `extract` memory so it would not repeat the
already-landed May session-routing, provider-truthfulness, and merge-scope
uplifts.

The sibling review split cleanly:

- `moves` remained the richest source of portable guidance. Its broader
  code-health layer and proactive coding guardrails were already well-proven
  and aligned with the parent's existing review owners.
- `moves-algorithm` had an exact-window result of `none`, but it reinforced the
  standing mixed-runtime and simulation-hygiene lessons plus the importance of
  proving that an audit window is empty before treating carryovers as current.
- `life.exe` also had an exact-window result of `none`. Its strongest ideas
  remained larger structural patterns around durable-surface inventories,
  validation lanes, and monitor contracts, but those still widen the parent's
  shape enough that they deserve a separate design pass instead of a quiet
  weekly import.
- The shared `compound` automation context again reinforced two generic audit
  habits: exact-window honesty first, and treating older carryovers as
  hypotheses that must be re-verified live.

The main implementation question was whether to add another review skill or to
extend the existing parent owners. The parent already had `AGENTS.md`,
`anti-slop-review`, and `review-skill` covering this territory, so the cleaner
move was to strengthen those owners rather than introduce a new sibling skill
that would answer the same "where do I look?" question.

## Technical Decision

Land only the portable review-guidance uplift that fits the current parent
owners without widening the harness into repo-shaped feature catalogs or
platform-specific workflow bundles:

- add a concise `AGENTS.md` section for proactive coding guardrails so future
  agents explicitly surface assumptions, keep a lightweight task contract, pick
  the smallest real validation seam, and avoid speculative compatibility work
  by default
- expand `anti-slop-review` so it now checks task-contract truthfulness,
  assumption handling, state/model discipline, function contract discipline,
  fresh verification routing, and overlapping guidance pressure in addition to
  the existing dead-code/docs/security/performance audit
- update `review-skill` so the operator-facing cleanup bundle advertises that
  broader anti-slop review surface directly

Deliberately skip the attractive but still repo-shaped ideas for now:

- no direct port of the `moves` `code-health-review` or `edge-case-flow-review`
  skills as new parent siblings; the parent can absorb the reusable parts into
  existing owners without duplicating the review surface
- no `life.exe` feature/monitor catalog, validation-suite registry, or
  canary/live YAML control plane
- no `moves-algorithm` notification-contract workflow, emulator/deploy flow, or
  repo-local absolute-path wrappers
- no mixed-runtime simulation-hygiene patch yet because the parent does not
  currently have a clean harness-test owner that needs that behavior

## Security & Integrity Impact

These changes strengthen review truthfulness without adding a brittle new
blocker. The parent now asks harder questions earlier about whether a diff
still matches the requested contract, whether its tests prove real behavior,
and whether workflow guidance is being duplicated instead of consolidated.
That reduces false confidence and review-loop churn while keeping the
enforcement agentic rather than threshold-driven.

## Conformance & Enforcement

- `npm run harness:prep`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- first `npm run harness:ci` run reached `agent-code-review.mjs` and failed
  only because the touched history/session artifacts still said final
  validation was pending; reran `harness:ci` after recording the completed
  verification evidence in those artifacts

## Guidance Impact

`AGENTS.md` now carries proactive coding guardrails that were previously only
strongly expressed in a sibling repo. `workflows/skills/anti-slop-review` now
owns the portable code-health/task-contract review lens, and
`workflows/skills/review-skill` points operators at that stronger pass through
the existing final-review entrypoint.

## Raw Notes

- Exact-window result: `moves-algorithm` and `life.exe` were both quiet for
  2026-06-07 through 2026-06-14, so they contributed selection pressure and
  skip clarity more than ready-to-copy tracked deltas.
- The strongest reused source material came from the `moves` harness setup,
  especially its proactive coding guardrails and code-health review layer added
  during March through May and still validated by June usage.
- The shared `compound` automation memory remains useful as an audit heuristic
  source, but at least one `moves-algorithm` carryover there is now stale, so
  this pass again treated automation memory as hypothesis input rather than
  ground truth.
- The first `harness:ci` run failed late for a good reason: the code reviewer
  rejected the candidate because `## Conformance & Enforcement` still said
  pending final validation even though the iterate/post/staged gates had
  already run.

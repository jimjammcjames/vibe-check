---
date: "2026-07-19"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream jul 19"
  - "merge to main defaults"
  - "prove it frontier discipline"
  - "followup prevention early warning"
  - "worktree write boundary"
related_entries:
  - "NONE"
affected_files:
  - "AGENTS.md"
  - "workflows/skills/anti-slop-review/SKILL.md"
  - "workflows/skills/followup-prevention/SKILL.md"
  - "workflows/skills/prove-it/SKILL.md"
  - "workflows/skills/merge-to-main-defaults/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-07-19-1208-extract-harness-refresh-jul19.md"
tags:
  - "#harness-meta"
---

# cross-repo-harness-upstream-jul19

## Summary

Reviewed the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe` for the exact local window `2026-07-12` through `2026-07-19`, plus
the shared `compound` automation context and prior extract memory, then
upstreamed the still-generic workflow deltas into the canonical parent:
stronger proof-frontier discipline in `prove-it`, clearer early-warning
follow-up codification, an explicit `merge-to-main-defaults` skill, and
portable AGENTS rules around changed-line traceability, write boundaries, and
secret-audit hygiene.

## Context

The sibling evidence split three ways:

- `moves-algorithm` stayed exact-window `none` again. Its best value this week
  was contrast evidence: carryover-only reporting remains correct, and its
  repo-shaped contract/deploy surfaces are still not parent-fit.
- `life.exe` also stayed exact-window `none`, but it reinforced two older
  generic ideas: direct-main landing defaults and stronger follow-up
  codification. It also surfaced a read-only `prep --check` concept that looks
  promising but still needs a clearer parent owner than a mid-pass harness-core
  uplift.
- `moves` carried the only real fresh parent-worthy signal, but only when read
  with `git log --all`. Its checked-out `main` was stale and would have falsely
  looked quiet. The real useful delta was not release-lane machinery; it was
  guidance-layer proof discipline around separating product goals from proof
  mechanics, proving the independent frontier before replaying expensive
  aggregates, and treating aggregate-only claims as real boundary claims rather
  than convenience labels.

The main selection pressure this week was to keep the parent generic and avoid
copying sibling wrapper systems. The strongest portable changes all fit existing
owners (`AGENTS.md`, `prove-it`, `anti-slop-review`, `followup-prevention`)
plus one small new skill for a workflow the parent still lacked
(`merge-to-main-defaults`).

## Technical Decision

Land only the portable guidance-layer uplift:

- add `workflows/skills/merge-to-main-defaults/SKILL.md` so explicit
  `merge to main` requests default to the full validated local-main landing and
  remote push unless the user narrows scope
- extend `workflows/skills/prove-it/SKILL.md` with goal-contract lint and a
  frontier-before-aggregate rule so expensive reruns do not become the default
  way to discover the next independent failure
- strengthen `workflows/skills/followup-prevention/SKILL.md` so a first
  post-implementation follow-up is treated as an early warning, not merely
  later polish
- strengthen `workflows/skills/anti-slop-review/SKILL.md` with clearer
  control-surface choice and a sharper built-in test-signal rubric
- update `AGENTS.md` with concise always-on rules that matched the strongest
  sibling learnings: changed-line traceability, same-worktree write boundaries,
  targeted secret-audit hygiene, and the interpretation of direct-main landing
  requests

Deliberately skip the still-attractive but non-parent-shaped imports:

- no repo-local `verified-loop` copy even though `moves` advanced it; the
  parent already has a global `verified-loop` skill available, and the
  parent-fit delta this week was the proof discipline now folded into
  `prove-it`
- no `life.exe` `prep --check`-style harness-core change in this pass; the idea
  stays a surfaced backlog item until the parent has a clearer owner and test
  scope for a non-mutating prep contract
- no `moves` hard-cutover freeze/seal/source-hash/release-lane machinery
- no `life.exe` feature/monitor catalog, history-only repair policy, or other
  control-plane governance
- no `moves-algorithm` notification-contract, mixed-runtime, or repo-local
  deploy helpers

## Security & Integrity Impact

This change strengthens operator truthfulness without widening runtime or Git
authority:

- write-boundary guidance now makes it explicit that cross-repo comparison is
  read-only unless the user authorizes a different write target
- secret-audit guidance now prefers targeted tracked-surface checks over noisy
  recursive scans or printing secret-bearing command output
- proof guidance now makes aggregate-only claims justify their boundary instead
  of hiding weak verification under a larger expensive rerun

## Conformance & Enforcement

- `npm run harness:prep`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci` (first run failed only because the generated
  `AGENTS.md` skills index truncated two wrapped use-case bullets)
- flattened the wrapped use-case bullets in
  `followup-prevention` and `merge-to-main-defaults`, reran
  `npm run harness:prep`, `npm run harness:post`,
  `npm run harness:post -- --staged`, and `npm run harness:ci`
- final status: all verification gates passed on the exact landing candidate

## Guidance Impact

- `AGENTS.md` now carries portable always-on rules for post-review follow-up
  early warnings, changed-line traceability, same-worktree write scope,
  targeted secret-audit hygiene, and direct-main landing interpretation
- `workflows/skills/anti-slop-review/SKILL.md` now owns the richer
  control-surface and test-signal review language imported from `moves`
- `workflows/skills/followup-prevention/SKILL.md` now owns the stronger
  early-warning and categorization guidance adapted from `life.exe`
- `workflows/skills/prove-it/SKILL.md` now owns the generic
  frontier-before-aggregate proof discipline distilled from `moves`
- `workflows/skills/merge-to-main-defaults/SKILL.md` is the new owner for the
  previously missing direct-main workflow default

## Raw Notes

- `moves-algorithm` exact-window evidence remained empty on both repo and
  harness surfaces; it mainly reinforced carryover-only honesty and skip
  boundaries.
- `life.exe` exact-window evidence also remained empty; its only still-clean
  parent-fit idea was the non-mutating prep-check concept, which was surfaced
  but not imported this week.
- `moves` only looked empty on the stale checked-out `main`; `git log --all`
  exposed the real July churn. The parent-worthy part was proof discipline, not
  hard-cutover machinery.
- I intentionally chose extension over addition wherever the owner already
  existed. The only new file in the parent is `merge-to-main-defaults`.
- The first `harness:ci` pass caught a real generated-guidance integrity issue:
  multi-line use-case bullets were being truncated in the generated
  `AGENTS.md` Skills Overview, so I normalized those touched bullets to
  single-line triggers and reran the full gate.

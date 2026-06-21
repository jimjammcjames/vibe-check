---
date: "2026-06-21"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream jun 21"
  - "prove it proof target lock"
  - "moves prove-it uplift"
  - "exact window none"
related_entries:
  - ".harness/context/history/2026-06-14-cross-repo-harness-upstream-jun14.md"
affected_files:
  - "AGENTS.md"
  - "workflows/skills/prove-it/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-06-21-0916-extract-harness-refresh-jun21.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
---

# cross-repo-harness-upstream-jun21

## Summary

Reviewed `moves`, `moves-algorithm`, and `life.exe` plus the shared
`compound` automation context for the exact local-date window from
2026-06-14 through 2026-06-21, then upstreamed one new repo-agnostic proof
discipline improvement into the parent: `prove-it` now requires proof-target
locking before evidence collection so agents do not validate an adjacent
symptom and mistake that for the user's actual claim.

## Context

The June 14 parent uplift already imported the broader review-guidance layer,
so this pass focused on genuinely new structural deltas rather than re-landing
older code-health language.

The sibling repo split was clear:

- `moves` had the only fresh parent-worthy harness/process change in-window: a
  `prove-it` refinement driven by a real UI-proof miss, where the earlier proof
  loop validated a nearby surface instead of the exact target the user cared
  about.
- `moves-algorithm` had an exact-window result of `none`; it mainly reinforced
  older mixed-runtime and simulation-hygiene lessons that remain useful but are
  already documented as older carryovers.
- `life.exe` also had an exact-window result of `none`; it mostly reinforced
  already-known durable follow-up, hook-environment, and validation-registry
  instincts, but none of those produced a cleaner net-new parent change than
  the `moves` proof-target uplift.
- The shared `compound` automation context again reinforced exact-window
  honesty: quiet windows should be called quiet instead of being padded with
  old carryovers.

## Technical Decision

Land only the fresh, clearly generalizable `prove-it` delta from `moves`, and
write it back in repo/platform/language-agnostic terms:

- expand the `prove-it` summary/use cases to explicitly cover hypothesis work,
  live or production-like proof, and "how do we know this is actually fixed?"
- add a `Proof Target Lock` section that requires the exact subject,
  equivalent state, failure predicate, pass predicate, and handoff artifacts to
  be named before proof work starts
- reinforce that before/after proof must compare equivalent states, and that
  user-supplied screenshots or corrections should anchor the target rather than
  letting the proof drift to an adjacent surface
- add a workflow reminder that target-scoped measurements should beat
  screenshot-only confidence when the claim is about one specific control,
  row, message, field, or output

Deliberately skip the still-attractive but repo-shaped or already-covered
ideas:

- no direct port of `moves` `vibe-check`, preview/demo release handoff, Expo,
  or native release workflows
- no new parent skill for the `moves` proof change; extending the existing
  `prove-it` owner is cleaner than spawning a sibling review/proof surface
- no `moves-algorithm` notification-contract, emulator, deploy, or Python
  runner surfaces
- no `life.exe` feature/monitor catalog, canary/live lane registry, or
  repo-specific hook/runtime wrappers
- no new simulation-hygiene patch this round because the parent already carries
  the generic setup guidance, and no new sibling evidence proved a missing
  owner or fresh regression here

## Security & Integrity Impact

This change strengthens truthfulness rather than adding enforcement breadth.
`prove-it` now makes it harder to claim success based on a nearby symptom,
non-equivalent fixture, or generic screenshot when the user's real target was
more specific. That should reduce false confidence and review-loop churn
without adding a brittle new blocker.

## Conformance & Enforcement

- `npm run harness:prep`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`

## Guidance Impact

`workflows/skills/prove-it/SKILL.md` now owns the portable proof-target-locking
guidance that emerged from the fresh `moves` lesson. `AGENTS.md` refreshed its
generated Skills Overview block to reflect the new `prove-it` summary and use
cases. No new parent skill or workflow wrapper was added; the existing proof
owner absorbed the delta.

## Raw Notes

- `moves` exact-window evidence pointed to one real harness/process change:
  `workflows/skills/prove-it/SKILL.md` was updated on 2026-06-16 after a
  finalized-footer proof miss, and both the linked history/session artifacts
  tied the skill change to that concrete workflow failure.
- The only tracked `AGENTS.md` change in this landing was the generated skills
  overview refresh from `harness:prep`; no manual operator guidance was added
  there this round.
- The first `harness:post` failure was a structured-session formatting issue,
  not a code or policy gap; compressing the session bullets back into the exact
  required parser shape cleared the medium gate and the later full `harness:ci`
  run finished green with `Severity: NONE`.
- `moves-algorithm` exact-window evidence was empty again; the strongest still
  portable lesson remains temp-repo simulation hygiene, but the parent already
  documents the generic version in setup guidance and did not show a fresh gap
  worth reopening.
- `life.exe` exact-window evidence was also empty; it reaffirmed several
  process instincts, but none beat the clarity or novelty of the `moves`
  `prove-it` uplift.
- I accidentally created the new session and meta entry in parallel once,
  which meant the scaffolded meta entry started without a live `session_refs`
  link. The entry was repaired in the same task so the linked audit trail is
  still correct before validation.

---
date: "2026-05-17"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream may 17"
  - "prove it skill"
  - "artifact freshness audit"
  - "operator path validation"
  - "partial validation gaps"
related_entries:
  - ".harness/context/history/2026-04-26-cross-repo-harness-upstream-apr26.md"
  - ".harness/context/history/2026-05-03-cross-repo-harness-upstream-may03.md"
  - ".harness/context/history/2026-05-10-cross-repo-harness-upstream-may10.md"
affected_files:
  - "AGENTS.md"
  - "workflows/skills/anti-slop-review/SKILL.md"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/feature-discovery/SKILL.md"
  - "workflows/skills/find-regressions/SKILL.md"
  - "workflows/skills/prove-it/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-05-17-1208-cross-repo-harness-extract-may17.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
  - "#automation"
---

# cross-repo-harness-upstream-may17

## Summary

Upstreamed the strongest still-generic harness improvements surfaced across
`moves`, `moves-algorithm`, and `life.exe` for the exact window from
2026-05-10 through 2026-05-17 by adding a reusable `prove-it` evidence
workflow and sharpening existing parent skills around proof routing, audit
freshness, and durable validation claims.

## Context

This pass compared the canonical parent against the sibling harness installs in
`/Users/jamesdugle/Repos/moves`, `/Users/jamesdugle/Repos/moves-algorithm`, and
`/Users/jamesdugle/Repos/life.exe`, plus the repo-associated
compound/unresolved-churn automation context for the same May 10-17 window.
Three patterns stood out:

- `moves` contributed the clearest still-missing parent workflow: one shared
  proof discipline for debugging, validation, and comparison work, plus a
  useful reminder that discovery uncertainty and evidence uncertainty are not
  the same thing.
- `moves-algorithm` contributed mostly audit-shape pressure rather than new
  harness mechanics in-window: compare artifact freshness against code
  freshness early, keep exact-window reporting honest even when the window is
  empty, and treat stale audit context as a real finding.
- `life.exe` contributed abstract validation-language improvements rather than
  direct harness files: durable surfaces should validate through the real
  operator path, and lane claims should state `full`, `partial`, or `none`
  instead of flattening everything into vague readiness language.

The sibling repos also reinforced several attractive but still repo-shaped
ideas that the parent intentionally did not import: Moves-specific Firebase,
Expo, React Native, and release-lane workflows; notification-contract runners
and mixed-runtime bootstrap details from `moves-algorithm`; and the
feature-catalog, NanoClaw, and `merge to main` workflow shape from `life.exe`.

## Technical Decision

Land only the improvements that fit existing parent owners without widening the
surface into stack-specific policy:

- add `prove-it` as the shared evidence workflow for proof matrices,
  ground-truth selection, and disposable experiments
- extend `feature-discovery` so truth/cause/evidence uncertainty hands off to
  `prove-it` instead of being treated as product discovery
- extend `anti-slop-review` so non-trivial claims are checked for explicit
  proof discipline and direct evidence selection
- extend `find-regressions` so unresolved-churn audits compare artifact
  freshness against code freshness before claiming the repo is quiet
- extend `durable-surface-contracts` so durable validation claims can mark
  lanes as `full`, `partial`, or `none`, and execution-boundary changes verify
  through the real operator-facing entrypoint

Deliberately skip the still repo-shaped ideas:

- no JS-runtime-guard or package-manager policy import from `moves`
- no Firebase, Firestore, Expo, React Native, or hosted-release skills from
  `moves`
- no notification-contract or mixed Python/Node bootstrap workflow from
  `moves-algorithm`
- no `life.exe` feature catalog, NanoClaw-specific live validation,
  `merge-to-main-defaults`, or "all repos must use the same `.harness/*`
  layout" assumption

## Security & Integrity Impact

These changes strengthen review and validation truthfulness without weakening
any gate. `prove-it` gives future agents a sanctioned way to build measuring
sticks instead of claiming confidence from one happy path, `find-regressions`
now makes stale audit context visible earlier, and
`durable-surface-contracts` is clearer about partial support and operator-path
proof so durable surfaces are less likely to overclaim readiness.

## Conformance & Enforcement

- `npm run harness:prep`
- `node --test harness-tests/tests/skills.test.mjs`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci` failed only at the provider-backed
  `undocumented-detector.mjs` step after the deterministic CI prelude: Gemini
  did not produce the expected output, then Codex fallback ended with
  `Provider unavailable (rate limit/network). Cannot proceed.`

## Guidance Impact

`AGENTS.md` now advertises the new `prove-it` skill through the generated
Skills Overview. `feature-discovery`, `anti-slop-review`, `find-regressions`,
and `durable-surface-contracts` now carry the selected sibling-repo lessons in
their existing owners instead of leaving those patterns trapped in downstream
repo-specific skills or automation memory.

## Raw Notes

- The automation worktree remained detached and still could not create
  `HEAD.lock` under the linked-worktree metadata path, so durable edits moved
  to the attached primary checkout on `main`.
- I mistakenly launched `harness:new:session` and the linked `harness:new:meta`
  in parallel once; the resulting session-slug miss proved the repo guidance
  about creating linked context artifacts sequentially is real rather than
  ceremonial.
- For the exact May 10-17 window, `moves-algorithm` and `life.exe` were mostly
  useful as structural signals and audit-memory context, not as sources of new
  tracked harness diffs ready to copy directly.
- The parent already had the multiple-same-day-session hard fail that
  `moves-algorithm` still lacks, so that sibling finding was treated as
  confirmation of the current parent behavior rather than a new patch.

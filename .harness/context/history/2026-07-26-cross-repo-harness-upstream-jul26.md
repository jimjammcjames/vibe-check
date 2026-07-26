---
date: "2026-07-26"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream jul 26"
  - "product outcomes vs verifier policy"
  - "deferrable non core seam landing rule"
  - "moves agnostic parents"
related_entries:
  - ".harness/context/history/2026-07-19-cross-repo-harness-upstream-jul19.md"
affected_files:
  - "AGENTS.md"
session_refs:
  - ".harness/context/sessions/2026-07-26-1204-extract-harness-refresh-jul26.md"
tags:
  - "#harness-meta"
---

# cross-repo-harness-upstream-jul26

## Summary

Reviewed the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe` for the exact local window `2026-07-19` through `2026-07-26`, plus
their linked `compound` automation context. Only `moves` produced fresh parent-
worthy guidance, so the parent landing stayed intentionally small: `AGENTS.md`
now makes proof-scope separation and deferrable non-core seam handling
explicit.

## Context

The weekly split was sharp:

- `life.exe` was exact-window quiet on `AGENTS.md`, `agent-prep`,
  `tools/agent-harness/`, `workflows/skills/`, `skills/`, and
  `history/{entries,sessions}`. Its older validation-lane and prep-check ideas
  stayed useful as contrast, not as fresh parent input.
- `moves-algorithm` was exact-window quiet on `AGENTS.md`, `.harness/`,
  `workflows/skills/`, and `.harness/context/{history,sessions}`. Its older
  contract-runner idea remains too notification-shaped and path-pinned to
  upstream directly.
- `moves` had heavy owner-surface churn, but most of it was release-proof
  bookkeeping or repo-local skill architecture. Only two AGENTS-level rules
  survived a strict parent-generic filter.

The shared `compound` automation prompt and memory increased the selection
pressure: exact-window-first, history/session-first, and no carryover imports
unless a fresh codification landed in-window and the parent still lacked it.

## Technical Decision

Keep the parent uplift inside `AGENTS.md` only:

- add an always-on rule that non-trivial goals should be written as product
  outcomes and safety boundaries, while reviewer identity, evidence packaging,
  hashes, seals, runner mechanics, and similar verifier policy stay in the
  validation plan
- add a generic landing rule that an independently deferrable non-core
  property, provider seam, or verifier signal must not remain half-integrated
  in a source-frozen landing; if it cannot meet the current task contract, its
  incomplete delta must be removed or isolated before final verification

These were the only fresh weekly deltas that stayed repo/platform/language
agnostic after comparing the sibling repos and their `compound` automation
context.

Deliberately skip the rest:

- no `moves` `.agents/skills` migration or `vibe-check` retirement
- no `moves` emulator/shadow/release-proof machinery, `verified-loop`, or
  Shepard/ledger orchestration
- no `moves-algorithm` notification-contract runner or repo-local contract docs
- no `life.exe` feature catalog, prep-check harness-core change, or repo-local
  PR wrapper layout
- tighten the imported wording so it scopes goals earlier without reducing
  verifier authority or sounding like failing review signals can simply be
  deferred

## Security & Integrity Impact

This change narrows over-claiming and false blockers rather than widening
authority:

- verifier or reviewer policy can no longer quietly become part of the claimed
  product behavior in the parent's always-on guidance
- incomplete non-core seams are now expected to be removed or isolated before
  final verification rather than left partially integrated in a landing
- no runtime, Git, provider, or file-permission scope widened in the parent
  repo

## Conformance & Enforcement

- pass: `npm run harness:prep`
- pass: `npm run harness:iterate`
- pass: `npm run harness:post`
- pass: `npm run harness:post -- --staged`
- pass: initial `npm run harness:ci` (`Severity: NONE`) on the pre-artifact-update candidate
- pass: rerun `npm run harness:post -- --staged` after recording that first CI result
- fail: rerun `npm run harness:ci` on the artifact-updated candidate; `harness-guardian`
  correctly flagged the first AGENTS wording as an enforcement-weakening risk
- pass: rerun `npm run harness:post -- --staged` after tightening the AGENTS wording
- pass: rerun `npm run harness:ci` after the fail-closed reword (`Severity: NONE`)

## Guidance Impact

- `AGENTS.md` now owns two new portable always-on rules imported from the fresh
  `moves` window: separate product outcomes from verifier policy, and do not
  let non-core seams remain half-integrated in a source-frozen landing.
- No new parent skill, CLI, or harness-core surface was added.

## Raw Notes

- Exact sibling window: `2026-07-19` through `2026-07-26` local time.
- Repo-linked `compound` automations reviewed:
  `compound` -> `moves`,
  `compound-3466cc1b8b1f` -> `moves-algorithm`,
  `compound-b3d324e04af6` -> `life.exe`.
- Fresh `moves` evidence came from AGENTS commits `797ec0df`, `1fba418d`, and
  `0bd06120`, plus the related history rationale in
  `2026-07-14-verified-loop-product-proof-circuit-breaker.md` and
  `2026-07-22-frontend-v2-v17-train-a.md`.
- `life.exe` and `moves-algorithm` both reinforced exact-window quiet reporting
  and skip boundaries rather than new parent changes.
- Manual anti-slop review of the tiny parent diff found no broader owner drift,
  duplicate guidance surface, or test-theater risk worth expanding into a new
  skill or harness-core change.
- The first rerun of `harness:ci` on the artifact-updated candidate failed in
  `harness-guardian`; it interpreted the original AGENTS wording as weakening
  review authority. The follow-up reword tightened the rules so they stay
  useful without creating a bypass path for verifier findings, and the final
  rerun cleared the full CI bundle with `Severity: NONE`.

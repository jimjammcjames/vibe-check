---
date: "2026-05-10"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream may 10"
  - "feature discovery followup prevention"
  - "skills overview descriptive only"
  - "shared assets packaging validation"
  - "runtime diagnostics unresolved churn"
related_entries:
  - ".harness/context/history/2026-04-12-cross-repo-portability-uplift.md"
  - ".harness/context/history/2026-04-26-cross-repo-harness-upstream-apr26.md"
  - ".harness/context/history/2026-05-03-cross-repo-harness-upstream-may03.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/lib/skills.mjs"
  - "AGENTS.md"
  - "harness-tests/tests/skills.test.mjs"
  - "workflows/skills/anti-slop-review/SKILL.md"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/feature-discovery/SKILL.md"
  - "workflows/skills/find-regressions/SKILL.md"
  - "workflows/skills/followup-prevention/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-05-10-1204-cross-repo-harness-extract-may10.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
  - "#automation"
---

# cross-repo-harness-upstream-may10

## Summary

Upstreamed the remaining clearly portable workflow improvements discovered
across `moves`, `moves-algorithm`, and `life.exe` by adding two new generic
skills (`feature-discovery` and `followup-prevention`), tightening the parent
review/audit/surface-contract guidance, and making the generated AGENTS skill
index explicitly descriptive rather than permission-granting.

## Context

This pass revisited sibling repos with the harness installed and reviewed the
exact window from 2026-05-03 through 2026-05-10 inclusive, plus the current
compound-style unresolved-churn context tied to those repos. The earlier parent
extracts on April 12, April 26, and May 3 had already carried over the session
retry hardening, detached-worktree safety, durable surface monitor taxonomy,
and validation-suite registration guidance, so the goal here was to avoid
re-importing the same ideas under new names.

The repo investigations converged on a narrow set of still-portable gaps:

- `moves` contributed a real front-door discovery workflow and stronger
  judgment-based review heuristics, plus a useful reminder that machine-local
  runtime/bootstrap cleanup should not silently widen feature PRs.
- `life.exe` contributed the clearest remaining codification gap: repeated
  follow-up or redirection should become durable repo behavior rather than being
  treated as one-off polish. It also had a clearer generated skills-overview
  contract.
- `moves-algorithm` did not add fresh harness history in the May 3-10 window,
  but it reinforced one portable lesson: shared manifests and assets need an
  explicit packaging plus validation story, not just repo-local assumptions.

The attached automation worktree was still on a detached HEAD and could not
update its linked-worktree `HEAD` metadata inside the sandbox, so durable edits
were moved to the attached primary checkout after restoring the Node 20 runtime
and reinstalling dependencies.

## Technical Decision

Land only the improvements that fit existing parent owners without importing
stack-specific release, deploy, runtime, or registry structure:

- add `feature-discovery` as the generic front-door skill for ambiguous
  feature/workflow requests
- add `followup-prevention` as the generic skill for repeated redirects,
  stronger follow-up asks, and large non-feature lessons
- extend `anti-slop-review` with smaller-seam test selection, mock-discipline,
  control-surface choice, and fresh verification reset guidance
- extend `find-regressions` so unresolved-churn audits restore runtime before
  trusting signal, inspect provider diagnostics, and state when an exact window
  has no new churn
- extend `durable-surface-contracts` so shared assets need declared packaging,
  durable surfaces prefer default validation gates on their deploy/update path,
  and lane readiness cannot stay implicit
- extend `merge-main-open-pr` so machine-local bootstrap/runtime cleanup is not
  silently folded into feature PRs
- strengthen the generated AGENTS Skills Overview block and the parent Harness
  doc so the index is clearly descriptive only and does not widen permissions

Deliberately skip the still-repo-shaped ideas:

- `moves` `web-release-lane`, Expo/React Native/Firebase validation skills, and
  richer session-pointer commands
- `life.exe` `merge-to-main-defaults`, `nanoclaw-live-validation`, raw
  feature/monitor catalog schema, and `source_thread_id`
- `moves-algorithm`'s notification-specific shared-contract checker and closed
  session lifecycle

## Security & Integrity Impact

These changes strengthen workflow clarity and audit quality without weakening
any gate. The generated Skills Overview block now explicitly states that it is
descriptive only, which reduces the chance that agents treat the generated list
as a permission surface. The new skills and updated review/audit guidance also
push repeated follow-up lessons, ambiguous feature shaping, runtime/provider
diagnostics, and shared-asset validation into tracked owners instead of leaving
them implicit in chat or ad hoc operator memory.

## Conformance & Enforcement

- `node --test harness-tests/tests/skills.test.mjs`
- `npm run harness:prep`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci` reached `harness-guardian` and then blocked on provider
  environment rather than diff integrity:
  Gemini failed with a broken Homebrew `simdjson` dynamic library load, and the
  Codex fallback could not access `~/.codex/sessions`, refresh models over the
  network, or initialize its rollout recorder inside this sandbox

## Guidance Impact

`AGENTS.md` now has always-on triggers for ambiguous work (`feature-discovery`)
and repeated user redirects (`followup-prevention`). The new skills live under
`workflows/skills/`, the existing `anti-slop-review`, `find-regressions`,
`durable-surface-contracts`, and `merge-main-open-pr` owners carry the portable
cross-repo lessons, and the generated Skills Overview contract is now explicit
both in `.harness/framework/lib/skills.mjs` and in `.harness/Harness.md`.

## Raw Notes

- `moves` had active harness/product history during 2026-05-03 through
  2026-05-10, but the only direct harness/workflow addition in-window was the
  repo-specific `web-release-lane` skill; the parent-worthy value was the
  workflow structure around discovery, review, and PR-scope hygiene.
- `moves-algorithm` had no harness history/session entries in the exact window.
  Its best remaining generic signal was the broader lesson that shared assets
  need declared packaging plus validation, not the notification-specific
  contract runner itself.
- `life.exe` had no harness history/session entries in the exact window either.
  The strongest remaining portable gap was explicit follow-up prevention and a
  clearer generated skills-overview contract.

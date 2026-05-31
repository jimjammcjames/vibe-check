---
date: "2026-05-31"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream may 31"
  - "merge scope checker"
  - "gemini startup truthfulness"
  - "mixed runtime harness porting"
  - "runtime contract guidance"
related_entries:
  - ".harness/context/history/2026-05-17-cross-repo-harness-upstream-may17.md"
  - ".harness/context/history/2026-05-24-cross-repo-harness-upstream-may24.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/providers/gemini.mjs"
  - ".harness/setup/AGENT-SETUP.md"
  - ".harness/setup/README.md"
  - "AGENTS.md"
  - "harness-tests/tests/gemini-provider.test.mjs"
  - "harness-tests/tests/merge-scope-checker.test.mjs"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
  - "workflows/skills/merge-main-open-pr/scripts/check-merge-scope.mjs"
  - "workflows/skills/merge-pr/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-05-31-1202-extract-harness-refresh-may31.md"
tags:
  - "#harness-meta"
---

# cross-repo-harness-upstream-may31

## Summary

Upstreamed the strongest still-generic harness improvements surfaced across
`moves`, `moves-algorithm`, and `life.exe` for the exact window from
2026-05-24 through 2026-05-31 by tightening provider-readiness truthfulness,
adding an explicit mixed-scope merge payload guard, and codifying mixed-runtime
porting plus runtime-contract guidance in the parent docs and skills.

## Context

This pass started from the prior May 24 `extract` memory so it could avoid
re-importing already-landed session-pointer work. The sibling-repo scouts and
the shared compound automation context converged on a narrow portable set:

- `moves` had the clearest workflow delta ready to reuse: a merge-scope
  inspection helper and merge-skill cleanup around current-session pointer
  lifecycle, plus a stronger runtime-truthfulness contract drawn from repeated
  login-shell/runtime drift incidents.
- `moves-algorithm` had no in-window harness commits, but it reinforced one
  reusable adoption lesson: keep the shared harness core generic and adapt only
  repo-owned test/lint/discovery wrappers when a repo spans multiple runtimes.
- `life.exe` again surfaced attractive but wider architecture changes such as
  fail-closed auto-drafted context artifacts and validation registries. Those
  ideas remain interesting, but they would materially widen the parent’s
  interaction model, so this pass kept them as explicit skips rather than
  sneaking in a new control plane.
- The shared compound memory still showed an open parent carryover:
  `review-coverage.json` could mark Gemini as available even when a fresh
  `agent-failures.log` proved the CLI could not actually start because of a
  deterministic local dylib failure. That made provider-readiness truthfulness
  directly in scope for this run.

## Technical Decision

Land only the improvements that fit existing parent owners without widening the
parent into repo-shaped feature catalogs, release front doors, or mounted-workspace
governance:

- strengthen the Gemini provider availability probe so the parent only reports
  Gemini as available when the CLI can actually start, not merely when the
  binary exists on `PATH`
- add a generic `merge-main-open-pr` scope-checker helper that classifies
  staged merge payloads and fails closed when governance surfaces are merged
  together with runtime surfaces without an explicit acknowledgement
- upgrade `merge-main-open-pr` and `merge-pr` so they teach merge-payload
  inspection, artifact finalization, and current-session pointer cleanup at the
  right workflow endpoints
- extend `durable-surface-contracts` with lifecycle validation guidance for
  real operator-facing workflows instead of happy-path-only claims
- extend setup docs with the reusable mixed-runtime porting rule: keep harness
  core generic and adapt repo-owned wrappers instead of teaching the framework
  each repo’s toolchain
- extend `AGENTS.md` and `.harness/Harness.md` with a generic runtime-truthfulness
  rule so runtime drift is debugged at the shell/runtime contract boundary
  rather than papered over with temporary wrapper glue

Deliberately skip the still larger or repo-shaped ideas for now:

- no `moves` `vibe-check` single front door convergence
- no `life.exe` auto-created history/session drafts or validation-suite registry
- no `moves-algorithm` notification-contract or packaging helpers
- no stack-shaped React Native, Expo, NanoClaw, Hermes, or feature-catalog
  policies

## Security & Integrity Impact

These changes strengthen fail-closed behavior rather than widening bypasses.
The Gemini availability probe now refuses optimistic coverage when the provider
cannot actually boot. The merge-scope checker reduces the chance of hiding
governance-surface churn inside an accidental mixed runtime payload. The skill
and doc updates also make lifecycle proof and runtime-contract truthfulness
explicit, which reduces false confidence without weakening any existing gate.

## Conformance & Enforcement

- `node --test harness-tests/tests/gemini-provider.test.mjs harness-tests/tests/merge-scope-checker.test.mjs harness-tests/tests/provider-selection.test.mjs`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`

## Guidance Impact

`AGENTS.md` and `.harness/Harness.md` now carry the runtime-truthfulness rule
instead of leaving shell/runtime drift as an informal sibling-repo lesson.
`.harness/setup/README.md` and `.harness/setup/AGENT-SETUP.md` now capture the
mixed-runtime adoption rule in the durable install guidance. The parent
`merge-main-open-pr`, `merge-pr`, and `durable-surface-contracts` skills now
hold the selected workflow lessons from the sibling repos instead of forcing
future operators to rediscover them through weekly extract runs.

## Raw Notes

- The worktree started detached with missing `node_modules`; this pass first
  repaired bootstrap (`npm ci`), moved onto a named branch, and then continued
  with the cross-repo review.
- The final `harness:ci` run now reports `available_providers: ["codex"]` and
  `unavailable_providers: ["gemini"]` in
  `.harness/diagnostics/latest/review-coverage.json`, which closes the
  optimistic Gemini-readiness carryover that was open in compound memory.
- The `moves-algorithm` and `life.exe` scouts mostly contributed selection
  pressure and “skip this for now” clarity rather than tracked code ready to
  copy directly.
- The skipped `life.exe` auto-draft context flow still looks like a meaningful
  follow-up candidate, but it would change how the parent creates/stages task
  artifacts enough that it deserves its own dedicated design pass.

---
date: "2026-06-21"
started_at: "2026-06-21T09:16:37.687Z"
tags:
  - "#harness"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-06-21-cross-repo-harness-upstream-jun21.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-fields.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-collision.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-sections.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-sections.md"
skills_used:
  - "detached-worktree-safety"
  - "feature-discovery"
  - "anti-slop-preflight"
---

# extract-harness-refresh-jun21

## Summary

Audited the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe`, used three parallel repo scouts plus shared automation context, and
reduced the parent landing to one new portable delta: stronger proof-target
discipline in `prove-it`.

## User Intent

Inspect the sibling repos that carry this harness, spawn a subagent per repo
for last-week history plus compound-automation context, integrate only the
repo/platform/language-agnostic subset into the canonical parent, run the
harness on the result, and leave the workspace clean enough to land on `main`
if the final candidate is solid.

## Timeline

- [seq-01] user: requested a cross-repo harness extract across `moves`, `moves-algorithm`, and `life.exe`, with a subagent per repo, portable-only integration, final harness validation, and permission to push if the landing is clean.
- [seq-02] assistant: read the repo instructions, confirmed the worktree was on detached `HEAD`, and ran `npm run harness:prep`.
- [seq-03] assistant: hit the bootstrap preflight for missing `node_modules/`, repaired it with `npm ci`, and reran `harness:prep` successfully.
- [seq-04] assistant: reviewed the prior extract memory, the June 14 parent history/session pair, and the relevant local skills so this pass would focus on net-new structural deltas.
- [seq-05] assistant: fetched `origin/main`, confirmed the detached base was current enough, switched onto branch `extract-harness-refresh-jun21`, and spawned three read-only repo scouts for `moves`, `moves-algorithm`, and `life.exe`.
- [seq-06] assistant: compared current sibling harness surfaces, current skill inventories, and shared automation memory locally while the scouts ran.
- [seq-07] assistant: isolated one credible new parent candidate from `moves`: the `prove-it` proof-target-locking change added on 2026-06-16 after a real UI-proof miss.
- [seq-08] assistant: confirmed `moves-algorithm` and `life.exe` were exact-window `none` results and that their strongest lessons were older carryovers or explicit skip boundaries, not fresher parent changes.
- [seq-09] assistant: created the new session and meta entry scaffolds, then corrected the meta/session linkage after an overly parallel creation attempt left the new entry unlinked at first.
- [seq-10] assistant: updated `workflows/skills/prove-it/SKILL.md` in repo-agnostic terms and started writing the linked history/session record.
- [seq-11] assistant: ran `harness:iterate`, fixed the strict session-bullet formatting after the first `harness:post` failure, then cleared `harness:post`, `harness:post -- --staged`, and a final green `harness:ci`.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first automation-memory read relied on `$CODEX_HOME` being populated in-shell, then I switched to explicit absolute paths under `/Users/jamesdugle/.codex/automations/...`.
- process_issue: `harness:prep` initially failed because the fresh worktree did not have `node_modules/`; the bootstrap preflight correctly stopped the task before later harness stages.
- process_issue: I briefly created the new session and meta entry in parallel, which meant the new meta scaffold missed the session link on first write; the artifacts were repaired immediately in the same task.
- thrash: none

## Workflow Repetition

- repeated_workflow: review sibling harness installs, insist on an exact last-week window first, then import only the repo-agnostic delta instead of broadening the parent with attractive local systems.
- custom_script: used focused `git log`, `find`, `rg`, direct skill/history reads, and `/Users/jamesdugle/.codex/automations/{extract,compound}/memory.md` plus three explorer subagents to separate a single fresh parent-worthy proof change from older carryovers and repo-shaped noise.

## Codify Candidates

- candidate: target=skill; description=keep the new proof-target-locking rule inside the existing `prove-it` owner instead of creating another sibling review/proof skill.

## Guidance Impact

- `workflows/skills/prove-it/SKILL.md` now requires proof-target locking,
  equivalent-state comparison, and target-scoped evidence selection before
  agents claim a proof loop is complete.
- `AGENTS.md` refreshed its generated skills overview entry for `prove-it` when
  `harness:prep` reran after the skill update.

## Outcome

The parent landing stayed intentionally narrow: one new portable proof
discipline change in `prove-it`, with the remaining sibling ideas captured as
explicit skips or already-covered carryovers. The full harness ladder is now
green on the current candidate.

---
date: "2026-05-31"
started_at: "2026-05-31T12:02:54.548Z"
tags:
  - "#harness"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-05-31-cross-repo-harness-upstream-may31.md"
skills_used:
  - "detached-worktree-safety"
  - "anti-slop-preflight"
---

# extract-harness-refresh-may31

## Summary

Reviewed the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe` plus their recent compound-audit context, then upstreamed only the
portable subset into the canonical parent repo.

## User Intent

Inspect sibling repos that carry a version of this harness, run a parallel
subagent per repo for the last-week harness and compound context, integrate the
portable improvements into this canonical parent, run the harness on the result,
and leave the workspace clean enough to land on `main`.

## Timeline

- [seq-01] user: asked for a thorough sibling-repo harness review, parallel repo scouts, integration of repo-agnostic improvements only, and a final clean landing path.
- [seq-02] assistant: read the existing `extract` automation memory, ran the required `harness:prep`, and hit the expected bootstrap blocker because `node_modules` was missing.
- [seq-03] assistant: repaired bootstrap with `npm ci`, confirmed the worktree was detached but aligned closely enough with `origin/main`, switched onto a named branch, and created the linked session artifact before durable edits.
- [seq-04] assistant: spawned read-only subagents for `moves`, `moves-algorithm`, and `life.exe`, then compared the sibling harness surfaces and compound memory against the parent to choose the portable subset.
- [seq-05] assistant: implemented the selected parent changes around Gemini provider truthfulness, merge-scope inspection, merge-session cleanup, lifecycle validation guidance, mixed-runtime porting setup guidance, and runtime-contract guidance.
- [seq-06] assistant: added focused regression tests for the Gemini availability probe and merge-scope checker, then reran targeted tests and the normal `harness:iterate` loop.
- [seq-07] assistant: folded the subagent findings back into the session and history artifacts, including explicit skips for the larger `life.exe` auto-draft architecture and the repo-shaped `vibe-check` front door.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first raw filesystem inventory pass tripped over ephemeral sibling-repo provider-state debris, so I switched the comparison to tracked-file inventories instead of continuing with a noisy scan.
- process_issue: bootstrap initially failed because `node_modules/` was missing, and the environment also confirmed the open compound carryover that the installed Gemini CLI could not actually start because of a missing `libsimdjson.29.dylib`.
- thrash: none

## Workflow Repetition

- repeated_workflow: compare the canonical parent against sibling harness installs, pull in only the repo-agnostic subset, and keep repo-shaped lessons in the final summary rather than widening the parent blindly.
- custom_script: used a tracked-file cross-repo inventory diff and focused `sed`/`rg` reads to compare common `.harness/`, `AGENTS.md`, and `workflows/skills/` surfaces without inheriting untracked runtime noise.

## Codify Candidates

- candidate: target=history; description=keep the skipped `life.exe` auto-drafted context flow as a separate parent-architecture follow-up instead of letting weekly extract runs slowly grow that behavior by accident.

## Guidance Impact

- updated `AGENTS.md` and `.harness/Harness.md` with runtime-truthfulness
  guidance
- updated `.harness/setup/README.md` and `.harness/setup/AGENT-SETUP.md` with
  mixed-runtime harness-porting guidance
- updated `durable-surface-contracts`, `merge-main-open-pr`, and `merge-pr`
  with the selected sibling workflow lessons
- added focused regression tests for the new provider and merge-scope helpers

## Outcome

The canonical parent now carries the portable May 31 uplift set: truthful
Gemini availability detection, an explicit mixed-scope merge payload guard,
better merge workflow cleanup around session pointers and final artifacts,
mixed-runtime setup guidance, lifecycle validation guidance, and clearer
runtime-contract debugging rules. The larger `life.exe` auto-draft context
architecture, the `moves` `vibe-check` front door, and stack-specific sibling
rules were intentionally left out for now.

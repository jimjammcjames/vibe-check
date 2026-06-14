---
date: "2026-06-14"
started_at: "2026-06-14T15:27:58.300Z"
tags:
  - "#harness"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-06-14-cross-repo-harness-upstream-jun14.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-fields.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-collision.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-sections.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-sections.md"
skills_used:
  - "detached-worktree-safety"
  - "anti-slop-preflight"
---

# extract-harness-refresh-jun14

## Summary

Reviewed the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe`, used parallel repo scouts plus compound automation memory for the
exact June 7-14 window, and upstreamed the strongest generic code-health
guidance into the parent harness surfaces.

## User Intent

Inspect sibling repos that carry this harness, use a subagent per repo for the
last-week history plus compound context, integrate only the repo-agnostic
subset into the canonical parent, run the harness on the result, and leave the
workspace clean enough to land on `main`.

## Timeline

- [seq-01] user: requested a cross-repo harness extract across `moves`, `moves-algorithm`, and `life.exe`, with subagents, portable-only imports, final harness validation, and permission to push to `main`.
- [seq-02] assistant: inspected the repo state, noticed the worktree was on a detached `HEAD`, and confirmed the automation memory path explicitly because `$CODEX_HOME` was not populated in the shell.
- [seq-03] assistant: ran `npm run harness:prep`, hit the bootstrap preflight for missing `node_modules`, repaired it with `npm ci`, and reran prep successfully.
- [seq-04] assistant: moved the worktree onto branch `extract-harness-refresh-jun14`, created the linked session artifact, and reviewed the prior May extract history so the June pass would focus on net new structural lessons.
- [seq-05] assistant: spawned read-only repo scouts for `moves`, `moves-algorithm`, and `life.exe`, then compared the shared compound automation memory and current parent owners locally while they ran.
- [seq-06] assistant: determined the cleanest parent uplift was to strengthen existing owners rather than add a new sibling review skill, then updated `AGENTS.md`, `anti-slop-review`, and `review-skill` accordingly.
- [seq-07] assistant: created the linked meta entry and started recording the exact-window findings, selected imports, and explicit skips.
- [seq-08] assistant: ran `harness:iterate`, `harness:post`, and `harness:post -- --staged` successfully, then let the first `harness:ci` run go all the way to `agent-code-review.mjs`, which correctly failed because the touched artifacts still said final validation was pending.
- [seq-09] assistant: updated the history/session artifacts with the completed verification evidence and started a second `harness:ci` run on the corrected candidate.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first automation-memory read assumed `$CODEX_HOME` would exist in-shell; after that failed, I switched to the explicit absolute path under `/Users/jamesdugle/.codex/automations/extract/memory.md`.
- process_issue: `harness:prep` initially failed on missing repo-local dependencies because `node_modules/` was absent in the fresh worktree, and the first `harness:ci` run later failed only because the touched artifacts still said validation was pending.
- thrash: none

## Workflow Repetition

- repeated_workflow: review sibling harness installs, keep the shared parent generic, and treat exact-window emptiness as a first-class finding instead of inventing churn from older carryovers.
- custom_script: used focused `git log`, `find`, `sed`, `blame`, and spawned repo scouts against sibling harness surfaces plus `/Users/jamesdugle/.codex/automations/compound/memory.md` to separate portable deltas from repo-shaped noise.

## Codify Candidates

- candidate: target=history; description=keep the larger `life.exe` durable-surface inventory and validation-lane catalog idea as an explicit skipped follow-up until the parent wants a dedicated generic design pass.

## Guidance Impact

- updated `AGENTS.md` with proactive coding guardrails around task contracts,
  smallest-seam validation, and non-speculative compatibility work
- updated `workflows/skills/anti-slop-review/SKILL.md` with broader
  code-health review coverage drawn from the strongest generic `moves` lessons
- updated `workflows/skills/review-skill/SKILL.md` so the operator-facing
  review bundle points at the stronger anti-slop review surface

## Outcome

The parent now carries the strongest June-portable review-guidance uplift:
clear proactive coding guardrails in `AGENTS.md` plus a deeper anti-slop
review lens for task-contract truthfulness, test-signal quality, state/function
contract discipline, and guidance-overlap pressure. The bigger
`life.exe` catalog architecture and the `moves-algorithm` contract/deploy
surfaces stayed in the explicit skip bucket for now, and the final green
`harness:ci` rerun closes the documentation-evidence gap the first CI pass
surfaced.

---
date: "2026-04-26"
started_at: "2026-04-26T13:51:12.393Z"
tags:
  - "#harness-meta"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-04-12-cross-repo-portability-uplift.md"
  - ".harness/context/history/2026-04-26-cross-repo-harness-upstream-apr26.md"
skills_used:
  - "anti-slop-preflight"
  - "detached-worktree-safety"
  - "find-regressions"
  - "durable-surface-contracts"
  - "review-skill"
---

# cross-repo-harness-upstream-apr26

## Summary

Audit the harness installs in `moves`, `moves-algorithm`, and `life.exe`,
then upstream the strongest repo-agnostic improvements into the canonical
parent while keeping the final shape portable across stacks.

## User Intent

Review sibling repos plus their recent harness history and compound-automation
context, integrate worthwhile generic improvements into this repo, run the
harness against the result, and leave the workspace clean enough to land on
`main` if validation allows.

## Timeline

- [seq-01] user: asked for a cross-repo harness review plus selective upstreaming into the canonical parent, with one subagent per sibling repo.
- [seq-02] assistant: ran the required `harness:prep` in the automation worktree, fixed the local Node/dependency drift, and loaded the relevant local skills plus prior extract memory.
- [seq-03] assistant: spawned read-only repo investigators for `moves`, `moves-algorithm`, and `life.exe` to scan harness setup, past-week history, and compound-automation context in parallel.
- [seq-04] assistant: compared sibling repo harness surfaces against the parent, found a blocked detached worktree, and discovered the attached primary checkout already held the unlanded April 12 portability diff.
- [seq-05] assistant: pivoted durable work to the attached `/Users/jamesdugle/Repos/vibe check` checkout because the sandboxed automation worktree could not write `HEAD.lock` for branch or staging operations.
- [seq-06] assistant: created a fresh April 26 session/meta pair in the attached checkout, then treated the existing April 12 dirty portability diff as baseline WIP instead of recreating those edits from scratch.
- [seq-07] assistant: added the missing portability layer on top of that baseline: `detached-worktree-safety`, the expanded `find-regressions` / `durable-surface-contracts` / `review-memory-coherence` guidance, the `REPO_AGENTS_GUIDANCE.md` reviewer packet rename, and the base-tripwire cleanup hardening.
- [seq-08] assistant: synced the generated skills overview through `harness:prep`, reran the focused harness tests for reviewer context, shared config loading, undocumented-detector scope, and tripwire cleanup, and then cleared `harness:iterate`, `harness:post`, and the staged gate.
- [seq-09] assistant: recorded the `moves` subagent findings about the runtime bridge, safe Jest wrapper, and broader code-health/merge-scope ideas, while noting that most harness-core behavior already matched or lagged the current parent less than expected.
- [seq-10] assistant: recorded the `moves-algorithm` subagent finding that there was no fresh past-week harness evolution and that its manifest-driven shared-contract runner should stay a future abstraction rather than a direct parent import.
- [seq-11] assistant: recorded the `life.exe` subagent findings that detached-worktree safety, bounded review-gate design, and automation registry/status language were the strongest portable ideas, while leaving its feature/monitor/suite registry model out of scope for now.
- [seq-12] assistant: ran `npm run harness:ci` on the staged final candidate and confirmed the only remaining blocker was the provider-backed `harness-guardian` step, where Gemini produced no verdict and the Codex fallback failed on `~/.codex/sessions` / auth-model refresh permissions inside the sandbox.

## Corrections & Thrash

- user_correction: none
- agent_correction: treated the dirty April 12 portability diff in the primary checkout as in-scope WIP instead of recreating those edits from scratch.
- process_issue: the sandboxed automation worktree allowed file edits but blocked Git metadata writes under `.git/worktrees/vibe-check`, so branch creation failed on `HEAD.lock`.
- thrash: created a new session in the attached checkout after the initial durable-work plan had to move off the automation worktree.
- thrash: the focused `base-tripwire` suite was much slower than the other touched tests because each case provisions sandbox and temporary worktrees, so the focused validation pass took multiple long polls before it completed cleanly.

## Workflow Repetition

- repeated_workflow: reran `harness:prep` after fixing runtime drift and again in the attached checkout before resuming durable harness work.
- repeated_workflow: let the heavy `base-tripwire` integration suite run to completion after the faster reviewer/config tests had already passed, because the tripwire cleanup hardening needed real end-to-end proof.
- custom_script: used only built-in harness commands plus read-only repo inspection commands across sibling repos; no bespoke migration script has been added.

## Codify Candidates

- candidate: target=skill; add a portable detached-worktree safety playbook to the parent so automation worktrees do not start durable edits from detached snapshots.
- candidate: target=history; capture the portability uplift as one canonical meta thread that explains which sibling-repo improvements were landed versus intentionally skipped as not yet generic enough.
- candidate: target=agents; keep richer review-context staging and original-request handoff in the parent harness so reviewers can distinguish touched versus inherited artifact context.
- candidate: target=history; keep late follow-up portability work in a new linked meta entry instead of silently widening the older April 12 thread once the topic meaningfully changed.

## Guidance Impact

- Added `workflows/skills/detached-worktree-safety/SKILL.md`.
- Expanded `find-regressions`, `durable-surface-contracts`,
  `review-code`, and `review-memory-coherence` with the newly validated
  portable guidance.
- Kept the earlier April 12 portability subset as its own linked history/thread
  instead of widening that older entry again.

## Outcome

The attached `main` checkout now carries both the earlier April 12 portability
subset and this April 26 follow-up layer. The newly added pieces cover
detached-worktree landing safety, unresolved-churn/automation guidance, review
context naming, and tripwire cleanup hardening, while the stronger but not yet
generic ideas from `moves`, `moves-algorithm`, and `life.exe` have been left
out of the diff and recorded as explicit skips for the final report. The
medium loop and staged gate passed, and the only unresolved outer-loop blocker
is the sandboxed provider environment behind `harness-guardian`.

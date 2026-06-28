---
date: "2026-06-28"
started_at: "2026-06-28T12:22:44.330Z"
tags:
  - "#harness"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-06-28-cross-repo-harness-upstream-jun28.md"
skills_used:
  - "detached-worktree-safety"
  - "anti-slop-preflight"
  - "codify-learnings"
  - "review-memory-coherence"
---

# extract-harness-refresh-jun28

## Summary

Audited the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe`, used parallel repo scouts plus shared automation context, and
reduced the parent landing to one narrow portability fix: task-local
`affected_files` overrides for new history/meta scaffolds.

## User Intent

Review the other repos that carry this harness, launch a parallel scout per
repo for last-week entries plus `compound` automation context, integrate only
repo/platform/language-agnostic deltas into the canonical parent, run the
harness on the result, and leave the workspace clean enough to push to `main`
if the landing is solid.

## Timeline

- [seq-01] user: Requested a cross-repo harness extract across `moves`, `moves-algorithm`, and `life.exe`, with a subagent per repo, portable-only integration, full harness validation, and permission to push if the result is clean.
- [seq-02] assistant: Read the repo instructions, confirmed the worktree was detached, and ran `npm run harness:prep`.
- [seq-03] assistant: Hit bootstrap preflight for missing `node_modules/`, repaired it with `npm ci`, reran `harness:prep`, and reviewed the relevant repo skills plus prior extract history/memory.
- [seq-04] assistant: Fetched `origin/main`, confirmed the detached base was current, switched onto branch `extract-harness-refresh-jun28`, and launched three repo scouts for `moves`, `moves-algorithm`, and `life.exe`.
- [seq-05] assistant: Cross-checked the sibling repos locally with exact-window git logs and the shared `compound` automation memory while the scouts ran.
- [seq-06] assistant: Identified the strongest fresh parent-fit signal in `moves`: managed publish/merge context that made task-local `affected_files` scope explicit without proving the parent should adopt the whole wrapper flow.
- [seq-07] assistant: Confirmed `moves-algorithm` and `life.exe` remained exact-window `none` on harness surfaces locally, and that their strongest lessons were older carryovers rather than better fresh parent changes.
- [seq-08] assistant: Created the new session and linked meta entry, then implemented a narrower parent uplift: repeated `--affected-file` overrides for `harness new:entry` and `harness new:meta`.
- [seq-09] assistant: Updated `.harness/Harness.md`, `merge-main-open-pr`, and `merge-pr` so the task-local scope rule lives in existing parent owners instead of a new wrapper.
- [seq-10] assistant: Added focused CLI coverage for the new override path, accidentally started the full harness test suite once via `npm test`, then corrected course to the intended targeted `harness-cli` test.
- [seq-11] assistant: Received the `life.exe` scout result, which reinforced carryover-only signals around validation registration, history-only repair policy, and hook-env sanitization but not a better fresh landing than the `affected_files` uplift.
- [seq-12] assistant: Received the `moves` and `moves-algorithm` scout results, which reinforced the gate-artifact vs code-bearing-artifact distinction, proof-artifact freshness/provenance pressure, and exact-window-none honesty without yielding a cleaner weekly parent change than the new scaffold override.
- [seq-13] assistant: Ran `npm run harness:iterate`, passed the focused `harness-cli` test, reran `npm run harness:post` after fixing the test-lint issue, and cleared the medium gate on the current candidate.
- [seq-14] assistant: Staged the full candidate, cleared `npm run harness:post -- --staged`, then ran `npm run harness:ci` to a final `Severity: NONE` pass.

## Corrections & Thrash

- user_correction: none
- agent_correction: switched from an accidental broad `npm test` invocation to the intended focused `node --import tsx --test harness-tests/tests/harness-cli.test.mjs` run once it was clear the package script was expanding to the whole suite.
- process_issue: `harness:prep` initially failed because the fresh worktree did not have `node_modules/`; bootstrap preflight correctly stopped the task before later harness stages.
- thrash: none

## Workflow Repetition

- repeated_workflow: resolve the exact weekly window first, compare sibling repos plus shared automation memory, then import only the smallest parent-shaped delta instead of copying broader repo-local systems.
- custom_script: used focused `git log` over harness surfaces, direct reads of sibling history/session artifacts, `/Users/jamesdugle/.codex/automations/{extract,compound}/memory.md`, and three parallel repo scouts to separate one clean parent-worthy scaffold improvement from broader wrapper/canary/catalog ideas.

## Codify Candidates

- candidate: target=history; description=keep weekly cross-repo extract landings narrow by extending existing parent owners when the sibling signal is a reusable rule, not a reason to add a new wrapper or control plane.

## Guidance Impact

- `.harness/framework/cli/harness.mjs` now accepts repeated
  `--affected-file` overrides for `new:entry` and `new:meta`.
- `.harness/Harness.md` now explains when to use task-local `affected_files`
  overrides on larger preexisting branches or publish/merge follow-up work.
- `workflows/skills/merge-main-open-pr/SKILL.md` and
  `workflows/skills/merge-pr/SKILL.md` now route operators to the override when
  a fresh artifact must describe only the current task on a broader branch.

## Outcome

The parent change stayed intentionally narrow and generic: no new wrapper CLI,
no `life.exe` control plane import, and no `moves-algorithm` simulation-hygiene
reopen. `harness:iterate`, the focused `harness-cli` test,
`harness:post`, `harness:post -- --staged`, and `harness:ci` are all green on
the current candidate.

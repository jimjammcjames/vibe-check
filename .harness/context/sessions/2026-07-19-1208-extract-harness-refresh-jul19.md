---
date: "2026-07-19"
started_at: "2026-07-19T12:08:10.288Z"
tags:
  - "#harness"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-07-19-cross-repo-harness-upstream-jul19.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-fields.md"
  - ".harness/context/history/2026-01-04-test-fixture-entry-collision.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-sections.md"
  - ".harness/context/history/2026-01-04-test-fixture-decision-affected-override.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-basic.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-sections.md"
  - ".harness/context/history/2026-01-04-test-fixture-meta-affected-override.md"
skills_used:
  - "detached-worktree-safety"
  - "anti-slop-preflight"
  - "add-new-skill"
  - "codify-learnings"
  - "review-skill"
---

# extract-harness-refresh-jul19

## Summary

Audited the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe`, used parallel repo scouts plus shared automation context, and
reduced the parent landing to a generic guidance-layer uplift: stronger
`prove-it`, stronger `followup-prevention`, a new `merge-to-main-defaults`
skill, and tighter AGENTS rules around worktree writes and secret-audit
hygiene.

## User Intent

Review the other repos that carry this harness, launch a subagent per repo for
the past-week harness/context window plus compound-automation context, import
only the repo/platform/language-agnostic improvements into the canonical
parent, run the harness on the result, leave the workspace clean, and push to
`main` if the landing is solid.

## Timeline

- [seq-01] user: requested a cross-repo harness extract across `moves`, `moves-algorithm`, and `life.exe`, with a subagent per repo, portable-only integration, full harness validation, and permission to push if the result is clean.
- [seq-02] assistant: read repo instructions, found the worktree detached, hit `harness:prep` bootstrap failure on missing `node_modules/`, and reviewed the parent repo skills/history before changing anything.
- [seq-03] assistant: fetched `origin/main`, confirmed the detached base was current, switched onto branch `extract-harness-refresh-jul19`, ran `npm ci`, reran `harness:prep`, and created this linked session.
- [seq-04] assistant: launched three read-only repo scouts for `moves`, `moves-algorithm`, and `life.exe`, then compared durable sibling repos plus `compound` automation state locally.
- [seq-05] assistant: identified the first parent-worthy deltas in existing owners: stronger `anti-slop-review`, stronger `followup-prevention`, a direct-main landing default, and matching AGENTS rules.
- [seq-06] assistant: landed the first parent edits, synced the generated skills overview with `harness:prep`, and confirmed `moves-algorithm` remained exact-window `none`.
- [seq-07] assistant: received the `life.exe` scout result, kept the non-mutating `prep --check` concept as a surfaced backlog item, and intentionally skipped a larger harness-core uplift this pass.
- [seq-08] assistant: received the `moves` scout result, which showed the checked-out `main` was stale and that the real fresh parent delta was proof-frontier discipline rather than release-lane machinery.
- [seq-09] assistant: folded the generic `moves` proof discipline into `prove-it`, added same-worktree write and secret-audit hygiene to `AGENTS.md`, created the linked meta entry, and prepared the candidate for validation.
- [seq-10] assistant: passed `harness:iterate`, `harness:post`, and `harness:post -- --staged`, then hit one real `harness:ci` failure when the generated `AGENTS.md` Skills Overview truncated wrapped use-case bullets in two touched skills.
- [seq-11] assistant: flattened those touched use-case bullets to single lines, reran `harness:prep`, reran `harness:post` plus `harness:post -- --staged`, and passed the final `harness:ci` run on the exact landing candidate.

## Corrections & Thrash

- user_correction: none
- agent_correction: corrected an early local assumption that `moves` was exact-window quiet; the stale checked-out `main` hid July churn until the subagent and a repo-wide `git log --all` view made the proof-skill delta visible.
- agent_correction: corrected two touched skill use-case bullets after `agent-code-review` proved the generated `AGENTS.md` Skills Overview was truncating wrapped lines.
- process_issue: `harness:prep` initially failed in the fresh worktree because `node_modules/` was missing; `npm ci` was the correct bootstrap repair before continuing.
- thrash: the attractive `life.exe` `prep --check` idea was deliberately held back once it was clear the clean parent owner and test scope were not as crisp as the guidance-layer imports.

## Workflow Repetition

- repeated_workflow: resolve the exact local date window first, compare sibling repos plus shared automation memory, then port only the smallest parent-shaped delta instead of copying broader repo wrappers or runtime governance.
- custom_script: used focused `git log --all` over sibling harness surfaces, direct reads of repo-local history/session artifacts, `~/.codex/automations/{compound,extract}/memory.md`, and three parallel repo scouts to separate fresh generic deltas from carryover-only or repo-shaped ideas.

## Codify Candidates

- candidate: target=skill; description=keep proof-frontier discipline in `prove-it` instead of cloning a whole repo-local `verified-loop` when the real portable gap is matrix/goal behavior, not provider orchestration.

## Guidance Impact

- `AGENTS.md` now makes same-worktree writes, targeted secret-audit hygiene,
  changed-line traceability, direct-main interpretation, and post-review
  follow-up early warnings explicit.
- `workflows/skills/anti-slop-review/SKILL.md` now owns the richer
  control-surface and test-signal review guidance.
- `workflows/skills/followup-prevention/SKILL.md` now treats first follow-ups as
  early warnings and captures the missing-default categories more explicitly.
- `workflows/skills/prove-it/SKILL.md` now owns the generic
  frontier-before-aggregate proof discipline distilled from `moves`.
- `workflows/skills/merge-to-main-defaults/SKILL.md` is the new direct-main
  landing owner.

## Outcome

The candidate stayed intentionally generic and cleared the full harness ladder
after one honest CI correction: no repo-local `verified-loop` copy, no
`life.exe` control-plane catalog, no `moves-algorithm` contract/deploy
surfaces, and no `prep --check` harness-core uplift this week.
`harness:iterate`, `harness:post`, `harness:post -- --staged`, and the final
`harness:ci` are all green on the exact landing candidate.

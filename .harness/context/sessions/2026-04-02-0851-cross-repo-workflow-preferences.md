---
date: "2026-04-02"
started_at: "2026-04-02T08:51:42.053Z"
tags:
  - "#workflow"
  - "#preferences"
  - "#docs"
  - "#harness-fix"
related_history:
  - ".harness/context/history/2026-04-02-cross-repo-workflow-preferences.md"
  - ".harness/context/history/2026-04-03-harness-cli-smoke-fast-fail.md"
skills_used:
  - "codify-learnings"
  - "para-memory-files"
  - "merge-main-open-pr"
  - "merge-pr"
---

# cross-repo-workflow-preferences

## Summary

Collected recurring workflow and communication preferences from sibling repos,
the current repo's harness history, and `.codex/MEMORY.md`, then added a
dedicated `User Preferences` section to `AGENTS.md` so future repos can keep
accumulating the same stable guidance in one place. When the user then asked to
open and merge a PR, the task also expanded into fixing a nested harness smoke
test that polluted repo-local tripwire fixtures and blocked `harness:post`.

## User Intent

Inspect other repos for codified workflow best practices, extract the stable
cross-repo lessons, reference personal memory, and create a durable
`User Preferences` section in `AGENTS.md` for future accumulation, then open a
PR and merge the resulting change.

## Timeline

- [seq-01] user: asked to inspect other repos for workflow best practices, reference memory, and add a reusable `User Preferences` section to `AGENTS.md`.
- [seq-02] assistant: ran `npm run harness:prep`, reviewed `codify-learnings` and `review-skill`, and checked current harness history before editing.
- [seq-03] assistant: searched sibling repos including `moves`, `moves-algorithm`, `life.exe`, `life-observability`, and `paperclip` for repeated workflow rules around rebases, detached worktrees, local `main`, validation, and durable docs.
- [seq-04] assistant: read `.codex/MEMORY.md`, confirmed the user's durable communication preferences around visual structure and top-down explanations, and treated those as seed content for the new section.
- [seq-05] assistant: created this session plus a decision entry, then updated `AGENTS.md` with workflow and communication preferences distilled from the cross-repo guidance and personal memory.
- [seq-06] assistant: prepared harness validation so the new guidance lands with durable provenance instead of remaining chat-only.
- [seq-07] user: asked to open a PR and merge the change.
- [seq-08] assistant: reran `harness:prep`, loaded the `merge-main-open-pr` and `merge-pr` skills, and found the worktree was still on detached `HEAD`.
- [seq-09] assistant: held off on branch and PR work because `harness:post` is a required gate and the existing history entry needed truthful final validation.
- [seq-10] assistant: repaired missing local JS tooling with `npm install`, then traced the remaining `harness:post` failures to nested `post` and `ci` smoke checks in `harness-cli.test.mjs` that were stranding synthetic tripwire fixtures in the repo.
- [seq-11] assistant: created a separate `fix` history entry for the smoke-test blocker and updated `harness-cli.test.mjs` to make nested smoke runs fail fast before recursive verification could mutate shared repo-local fixtures.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first `harness:new:entry --session-slug` attempt did not recognize the just-created session, so the entry command was rerun after confirming the CLI's session-resolution behavior.
- process_issue: `qmd` semantic memory search was unavailable in this shell, so the memory lookup fell back to direct reads of `.codex/MEMORY.md`.
- process_issue: the worktree started on detached `HEAD`, so the requested PR-open-and-merge flow could not proceed until the validation blocker was understood and the work was moved onto a real branch.
- thrash: `harness:post` initially failed first on missing local `tsx`, then on synthetic `2099-...` tripwire fixtures that a nested harness smoke test left staged in the repo.

## Workflow Repetition

- repeated_workflow: when a cross-repo lesson looks durable, gather the local repo guidance first, then inspect sibling `AGENTS.md`, skills, and history before promoting only the stable overlap into always-on guidance.
- repeated_workflow: when a requested ship or PR flow is blocked by repo verification, stop the branch and PR work long enough to make the gate truthful and stable rather than pushing around the failure.
- custom_script: used targeted `rg` searches across sibling repos plus direct reads of `.codex/MEMORY.md` because the semantic memory search tool was not installed in this environment.

## Codify Candidates

- candidate: target=agents; description=keep a dedicated `User Preferences` section in `AGENTS.md` for cross-repo James-specific workflow and communication defaults, seeded from sibling repos and `.codex/MEMORY.md`.
- candidate: target=history; description=record that nested harness smoke tests must fail fast or clean up their own synthetic repo-local fixtures, or they can poison unrelated `harness:post` runs during PR prep.

## Outcome

The repo now has a durable `User Preferences` section in `AGENTS.md` covering
rebase-first stale-branch sync, detached-HEAD safety, local `main` caution,
clean sync endings, canonical entrypoints, plain-language workflow contracts,
history-aware conflict resolution, real-path validation, and the user's
communication preferences from memory. The requested PR/merge workflow also
surfaced and documented a separate harness smoke-test pollution bug, which is
now tracked in a dedicated `fix` entry and paired with a test-side cleanup
change before branch/PR work continues.

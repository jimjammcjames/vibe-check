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
  - ".harness/context/history/2026-04-03-user-preferences-smoke-fix.md"
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
- [seq-12] assistant: moved the detached work onto branch `james/user-preferences-smoke-fix`, staged the change set, passed the staged gate, committed, and pushed the branch.
- [seq-13] assistant: ran `harness:ci`, which advanced through the full suite but failed in the guardian step because the branch changed harness-facing surfaces without a dedicated `#harness-meta` entry.
- [seq-14] assistant: created a dedicated meta entry so the branch carries explicit harness-core provenance before rerunning the outer loop.
- [seq-15] assistant: reran the outer loop and found the local Gemini path still unreliable, then switched to the documented Codex provider flow; the direct `--codex` CLI flag exposed a provider-selection test interaction, so a gitignored `.harness/config.local.yml` override was used instead.
- [seq-16] assistant: reran `harness:ci` successfully with the local Codex override, committed the meta/session follow-up, pushed the reviewed head, and opened PR `#6`.
- [seq-17] assistant: found that GitHub marked PR `#6` conflicting because `main` had merged PR `#5` on overlapping files, then rebased this branch onto the updated `origin/main` and resolved the sole smoke-test conflict by keeping both the isolated context-root path and the fail-fast cleanup logic.
- [seq-18] assistant: the rebased branch then inherited stricter history/session validation from current `main`, so the tracked session and all three branch history entries were updated with explicit `Guidance Impact` sections before the final verification rerun.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first `harness:new:entry --session-slug` attempt did not recognize the just-created session, so the entry command was rerun after confirming the CLI's session-resolution behavior.
- process_issue: `qmd` semantic memory search was unavailable in this shell, so the memory lookup fell back to direct reads of `.codex/MEMORY.md`.
- process_issue: the worktree started on detached `HEAD`, so the requested PR-open-and-merge flow could not proceed until the validation blocker was understood and the work was moved onto a real branch.
- process_issue: the documented `npm run harness:ci -- --codex` path leaked `HARNESS_PROVIDER=codex` into `npm test`, which made `provider-selection.test.mjs` assert the wrong provider-availability behavior.
- process_issue: after rebasing onto current `main`, the branch's older history/session artifacts no longer matched the stricter `Guidance Impact` requirements enforced by the updated policy audit.
- thrash: `harness:post` initially failed first on missing local `tsx`, then on synthetic `2099-...` tripwire fixtures that a nested harness smoke test left staged in the repo.
- thrash: the first full `harness:ci` pass still failed after the substantive fixes because the branch needed an explicit `#harness-meta` entry for its harness-facing surfaces.
- thrash: the first ready PR still opened as conflicting because `main` advanced with overlapping harness guidance and smoke-test changes after the branch had already been pushed.

## Workflow Repetition

- repeated_workflow: when a cross-repo lesson looks durable, gather the local repo guidance first, then inspect sibling `AGENTS.md`, skills, and history before promoting only the stable overlap into always-on guidance.
- repeated_workflow: when a requested ship or PR flow is blocked by repo verification, stop the branch and PR work long enough to make the gate truthful and stable rather than pushing around the failure.
- repeated_workflow: when a repo documents a local-only provider override path, prefer that over process-wide env overrides if the override would otherwise leak into test behavior.
- custom_script: used targeted `rg` searches across sibling repos plus direct reads of `.codex/MEMORY.md` because the semantic memory search tool was not installed in this environment.

## Codify Candidates

- candidate: target=agents; description=keep a dedicated `User Preferences` section in `AGENTS.md` for cross-repo James-specific workflow and communication defaults, seeded from sibling repos and `.codex/MEMORY.md`.
- candidate: target=history; description=record that nested harness smoke tests must fail fast or clean up their own synthetic repo-local fixtures, or they can poison unrelated `harness:post` runs during PR prep.
- candidate: target=history; description=when a branch mixes harness-facing docs or tests with behavior changes, preserve topic clarity by keeping the behavioral entries and adding a separate `#harness-meta` artifact for governance.

## Guidance Impact

This task changed standing tracked guidance in `AGENTS.md` by adding the durable
`User Preferences` section for James-specific workflow and communication
defaults. It also added matching history artifacts that explain the smoke-test
cleanup path and the harness-meta provenance expected when branches touch
harness-facing docs or tests.

## Outcome

The repo now has a durable `User Preferences` section in `AGENTS.md` covering
rebase-first stale-branch sync, detached-HEAD safety, local `main` caution,
clean sync endings, canonical entrypoints, plain-language workflow contracts,
history-aware conflict resolution, real-path validation, and the user's
communication preferences from memory. The requested PR/merge workflow also
surfaced and documented a separate harness smoke-test pollution bug, which is
now tracked in a dedicated `fix` entry and paired with a test-side cleanup
change that now coexists with the newer mainline context-root isolation. PR
`#6` is open against the rebased branch, and the remaining step is rerunning
the final verification/push cycle on top of updated `main` before merge.

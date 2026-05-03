---
date: "2026-05-03"
started_at: "2026-05-03T19:29:18.339Z"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-05-03-cross-repo-harness-upstream-may03.md"
skills_used:
  - "anti-slop-preflight"
  - "detached-worktree-safety"
  - "codify-learnings"
  - "durable-surface-contracts"
  - "review-skill"
---

# cross-repo-harness-extract-may03

## Summary

Audit the current harness installs in `moves`, `moves-algorithm`, and
`life.exe`, then upstream only the strongest repo-agnostic improvements into
the canonical parent without importing downstream runtime or product-shape
assumptions wholesale.

## User Intent

Review sibling repos plus their recent harness history and compound-automation
context, integrate worthwhile generic improvements into this repo, run the
harness against the result, and land the workspace cleanly if the sandboxed
environment allows it.

## Timeline

- [seq-01] user: Asked for a thorough cross-repo harness review with one subagent per sibling repo, plus selective integration of generic parent-worthy improvements.
- [seq-02] assistant: Ran the required `harness:prep` in the automation worktree, hit Node 18 plus missing `node_modules` preflight failures, and loaded the relevant local skills and prior extract memory.
- [seq-03] assistant: Confirmed the automation worktree was detached and that sandboxed Git metadata writes under `.git/worktrees/vibe-check` were blocked, then pivoted durable edits to the attached primary checkout on `main`.
- [seq-04] assistant: Spawned read-only repo investigators for `moves`, `moves-algorithm`, and `life.exe` to inspect harness setup, recent history/session artifacts, and compound-automation context in parallel.
- [seq-05] assistant: Compared the parent against prior April 12 and April 26 upstream extracts to avoid replaying already-landed portability work.
- [seq-06] assistant: Narrowed the new parent-worthy deltas to a generic harness CLI session-link hardening pass, stronger codification/PR-prep skills, small AGENTS bootstrap clarifications, and a durable-surface contract uplift informed by `life.exe`.
- [seq-07] assistant: Patched `.harness/framework/cli/harness.mjs` and `harness-tests/tests/harness-cli.test.mjs` to add bounded `--session-slug` retry, exact-selector self-check support for `new:session`, and safe shell-quoted recovery commands.
- [seq-08] assistant: Updated `codify-learnings`, `review-skill`, `merge-main-open-pr`, `durable-surface-contracts`, and `AGENTS.md` with the selected generic workflow improvements.
- [seq-09] assistant: Moved the new retry assertions into a fresh focused test file after `harness:post` correctly rejected touching the older `harness-cli.test.mjs` file with its grandfathered `readFileSync` fixture pattern.
- [seq-10] assistant: Ran `node --test harness-tests/tests/harness-cli.test.mjs harness-tests/tests/harness-session-retry.test.mjs`, `npm run harness:prep`, `npm run harness:iterate`, and `npm run harness:post` successfully.
- [seq-11] assistant: Staged the intended landing set, hit a real staged-policy miss because the new retry test file was not listed in the meta entry `affected_files`, fixed that history coverage, and reran `npm run harness:post -- --staged` to green.
- [seq-12] assistant: Ran `npm run harness:ci`; it passed the deterministic CI checks and then blocked only at `harness-guardian`, where Gemini produced no verdict and Codex fallback could not access `~/.codex/sessions` or refresh remote models inside the sandbox.
- [seq-13] assistant: Subagents reported that `moves` contributed the concrete parent-worthy improvements, `moves-algorithm` mainly reinforced mixed-runtime/bootstrap and future manifest ideas, and `life.exe` mainly contributed abstract automation/monitor patterns rather than a drop-in harness delta.

## Corrections & Thrash

- user_correction: none
- agent_correction: Stopped broad directory diffing after it surfaced noisy local provider state and refocused the comparison on tracked harness files plus relevant history/session artifacts.
- process_issue: The sandboxed automation worktree allowed file edits but blocked Git metadata writes under `/Users/jamesdugle/Repos/vibe check/.git/worktrees/vibe-check`, so branch creation failed on `HEAD.lock`.
- thrash: Durable work had to move from the automation worktree to the attached primary checkout because the detached worktree could not safely perform Git operations inside the sandbox.

## Workflow Repetition

- repeated_workflow: Reran `harness:prep` after restoring the repo runtime in the primary checkout and again after the skill changes so the generated AGENTS skill overview stayed synchronized.
- repeated_workflow: Compared current extract candidates against prior extract memory and linked history before importing anything new, to avoid replaying already-landed parent work.
- custom_script: `source ~/.nvm/nvm.sh && nvm use`
- custom_script: `npm run harness:new:session -- --slug "cross-repo-harness-extract-may03"`
- custom_script: `npm run harness:new:meta -- --slug "cross-repo-harness-upstream-may03" --session-slug "cross-repo-harness-extract-may03"`
- custom_script: `node --test harness-tests/tests/harness-cli.test.mjs harness-tests/tests/harness-session-retry.test.mjs`
- custom_script: `npm run harness:prep`
- custom_script: `npm run harness:iterate`
- custom_script: `npm run harness:post`
- custom_script: `npm run harness:post -- --staged`
- custom_script: `npm run harness:ci`

## Codify Candidates

- candidate: target=skill; description=Keep session-link retry, exact-selector self-checks, and safe shell-quoted recovery hints in the parent harness CLI because sandboxed or fast-follow context creation can race just-created session files.
- candidate: target=skill; description=Strengthen `codify-learnings` with artifact routing, abstraction-first codification, and skill-gap repair so future extracts patch the right owner instead of leaving behavior-changing lessons only in history.
- candidate: target=skill; description=Capture the `life.exe` monitor-taxonomy and validation-suite registration ideas inside `durable-surface-contracts` rather than importing its repo-specific registry shape directly.

## Guidance Impact

- Updated `AGENTS.md` with actionable bootstrap/tooling recovery guidance and a
  generic rule to prefer skills/review prompts over new blockers for
  judgment-heavy code-health concerns.
- Updated `workflows/skills/codify-learnings/SKILL.md`,
  `workflows/skills/review-skill/SKILL.md`,
  `workflows/skills/merge-main-open-pr/SKILL.md`, and
  `workflows/skills/durable-surface-contracts/SKILL.md`.
- Added harness-core behavior and tests in `.harness/framework/cli/harness.mjs`
  and `harness-tests/tests/harness-session-retry.test.mjs`.

## Outcome

The parent now carries one concrete harness-core fix from `moves`, a small set
of sharper generic workflow skills, and a modest AGENTS/durable-surface
contract uplift informed by `moves`, `moves-algorithm`, and `life.exe`. The
runtime bridge, safe Jest wrapper, merge-scope checker, notification manifest
runner, and `life.exe` automation/feature registry model were left out because
they still need a cleaner cross-repo abstraction than this parent currently
offers. The medium loop and staged gate passed; the only unresolved validation
gap is the provider-backed `harness-guardian` step inside `harness:ci`, where
the sandbox blocks Codex session-home access and remote model refresh.

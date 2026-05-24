---
date: "2026-05-24"
started_at: "2026-05-24T12:10:13.935Z"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-05-24-cross-repo-harness-upstream-may24.md"
skills_used:
  - "anti-slop-preflight"
  - "detached-worktree-safety"
  - "review-skill"
---

# cross-repo-harness-extract-may24

## Summary

Compare the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe`, upstream only the still-portable improvements into the canonical
parent, run the harness on the result, and leave the working tree clean enough
to land on `main`.

## User Intent

Look through the sibling repos plus their recent harness context and
compound-style automation context, integrate only the beneficial changes that
can be made repo/platform/language agnostic, skip repo-shaped ideas, and
summarize exactly what was integrated, why, and from where.

## Timeline

- [seq-01] user: Asked for a thorough cross-repo harness review across `moves`, `moves-algorithm`, and `life.exe`, requested one subagent per repo, and explicitly allowed a final push to `main` after full harness validation.
- [seq-02] assistant: Ran `npm run harness:prep` in the parent repo, hit the bootstrap preflight failure because `node_modules/` was missing, restored dependencies with `npm ci`, and reran prep before deeper review.
- [seq-03] assistant: Read the parent Harness doc plus the earlier May 3, May 10, and May 17 upstream entries to avoid replaying already-landed portability work.
- [seq-04] assistant: Spawned three read-only repo scouts for `/Users/jamesdugle/Repos/moves`, `/Users/jamesdugle/Repos/moves-algorithm`, and `/Users/jamesdugle/Repos/life.exe` scoped to the exact `2026-05-17` through `2026-05-24` window plus compound-style carryover context.
- [seq-05] assistant: Compared the sibling harness/setup surfaces locally and pulled shared automation memory to separate fresh parent-worthy deltas from older carryover debt.
- [seq-06] assistant: Moved off detached `HEAD` onto `extract-may24-portability`, created the May 24 session, and then accidentally reproduced the live `cmdNewEntry()` retry bug when the linked `new:meta` call raced the just-created session.
- [seq-07] assistant: Retried the linked meta creation sequentially with the exact session selector so the audit trail stayed intact before code edits.
- [seq-08] assistant: Implemented the per-worktree current-session pointer feature, fixed the live frozen-session retry gap in `cmdNewEntry()`, and updated the parent AGENTS/Harness/skill guidance around validation truthfulness and portable cross-repo contract shape.
- [seq-09] assistant: Added focused CLI tests for current-session selection, manual session switching/clearing, and the explicit retry race where `new:meta` starts first and the session appears during the retry window.
- [seq-10] assistant: Ran the focused harness CLI tests successfully, reran the local harness loop, and let the full `harness:ci` agent reviews police the change instead of bypassing slow checks.
- [seq-11] assistant: Fixed two real self-review findings from the harness agent pass: first the test helper cleared the wrong Git metadata path for current-session cleanup, then the history entry was missing the shared helper from `affected_files`.
- [seq-12] assistant: Verified the flaky `agent-memory-coherence` stage in isolation, found the failure was transient Codex fallback saturation rather than a repo issue, and completed a final full green `harness:ci` run with the supported `--codex-reasoning low` override.

## Corrections & Thrash

- user_correction: none
- agent_correction: Changed the initial “small doc/skill-only uplift” plan once the sibling scouts and the live race repro made it clear the parent should also land the concrete session-pointer CLI feature and the live retry fix.
- process_issue: I launched `harness:new:session` and the linked `harness:new:meta` in parallel once, which reproduced the open live caller bug exactly as the compound automation memory warned.
- thrash: The sibling repos surfaced several attractive but overlapping ideas; the final diff deliberately kept only the session-routing feature and small owner-friendly guidance upgrades instead of adding overlapping new review or feature-entry skills.
- thrash: The first full `harness:ci` pass caught a real cleanup mismatch in the new shared test helper, and the second pass caught incomplete `affected_files` coverage for that helper path; both were fixed in-repo rather than waived.

## Workflow Repetition

- repeated_workflow: Restored bootstrap health with `npm ci` before trusting later harness or audit signal.
- repeated_workflow: Anchored the extract to the exact `2026-05-17` through `2026-05-24` window and treated empty windows in `moves-algorithm` and `life.exe` as carryover-only context instead of inventing fresh churn.
- repeated_workflow: Compared candidate imports against the parent’s earlier cross-repo extract entries before landing anything so already-upstreamed patterns were not silently duplicated.
- custom_script: `npm ci`
- custom_script: `npm run harness:prep`
- custom_script: `npm run harness:new:session -- --slug "cross-repo-harness-extract-may24"`
- custom_script: `npm run harness:new:meta -- --slug "cross-repo-harness-upstream-may24" --session-slug "2026-05-24-1210-cross-repo-harness-extract-may24"`
- custom_script: `node --import tsx --test harness-tests/tests/harness-cli.test.mjs harness-tests/tests/harness-session-retry.test.mjs`
- custom_script: `npm run harness:iterate`
- custom_script: `npm run harness:post`
- custom_script: `npm run harness:post -- --staged`
- custom_script: `npm run harness:ci`
- custom_script: `HARNESS_CODEX_REASONING=low node .harness/framework/scripts/agent-memory-coherence.mjs`
- custom_script: `npm run harness:ci -- --codex-reasoning low`

## Codify Candidates

- candidate: target=history; description=Capture the new per-worktree current-session pointer model and live retry fix as a harness-meta portability uplift rather than leaving them only in this session.
- candidate: target=skill; description=Teach durable-surface validation guidance to distinguish bounded local gates from protected live workflows and to require real CI wiring when a gate is supposed to protect PRs or merges.
- candidate: target=agents; description=Codify clone-shape-safe reusable guidance so shared skills and docs do not pin personal absolute paths by default.

## Guidance Impact

- Updated `AGENTS.md` with the current-session workflow rule and a portable
  no-hardcoded-personal-paths reminder.
- Updated `.harness/Harness.md` to explain `session:use`,
  `session:clear`, and the per-worktree current-session pointer contract.
- Updated `workflows/skills/durable-surface-contracts/SKILL.md`,
  `workflows/skills/find-regressions/SKILL.md`, and
  `workflows/skills/merge-main-open-pr/SKILL.md` with the selected sibling
  lessons about validation truthfulness, CI enforcement reality, and mixed
  scope.

## Outcome

The parent now carries one real operator feature from `moves` plus a handful of
small generic truthfulness upgrades from the sibling-repo and compound-audit
context. The full harness loop has already been run against the work and has
twice produced actionable self-review findings, both of which were corrected in
place; the final clean rerun is now green, so the only remaining work is
landing the validated change to `main`.

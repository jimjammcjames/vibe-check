---
date: "2026-05-10"
started_at: "2026-05-10T12:04:43.677Z"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-05-10-cross-repo-harness-upstream-may10.md"
skills_used:
  - "anti-slop-preflight"
  - "detached-worktree-safety"
  - "add-new-skill"
  - "codify-learnings"
  - "durable-surface-contracts"
---

# cross-repo-harness-extract-may10

## Summary

Compare the harness installs in `moves`, `moves-algorithm`, and `life.exe`
against the canonical parent, integrate only the still-portable improvements,
run the harness against the result, and leave the workspace clean enough to
land on `main`.

## User Intent

Look through sibling repos plus their recent harness context and associated
compound-style automation lessons, upstream anything beneficial that can be
made repo/platform/language agnostic, skip stack-specific ideas, and summarize
exactly what was integrated, why, and from where.

## Timeline

- [seq-01] user: Asked for a thorough cross-repo harness review across `moves`, `moves-algorithm`, and `life.exe`, with one subagent per repo, selective repo-agnostic integration, and final harness validation before any push to `main`.
- [seq-02] assistant: Ran the required `npm run harness:prep` in the automation worktree and immediately hit actionable bootstrap drift: Node 18 instead of the declared Node 20 runtime and missing `node_modules`.
- [seq-03] assistant: Restored the runtime with `nvm use 20`, ran `npm ci`, reran `harness:prep`, and reviewed the parent's prior April 12, April 26, and May 3 cross-repo upstream entries to avoid duplicating already-landed portability work.
- [seq-04] assistant: Spawned three repo investigators in parallel for `moves`, `moves-algorithm`, and `life.exe` covering the exact window from 2026-05-03 through 2026-05-10 plus current compound/unresolved-churn context.
- [seq-05] assistant: Confirmed the automation worktree was detached and could not update its linked-worktree `HEAD` inside the sandbox, created an initial session there, then cleaned that mistaken untracked session file and pivoted durable work to the attached primary checkout on `main`.
- [seq-06] assistant: Created the linked May 10 session/meta scaffolds in the primary checkout and compared the live repo findings against the parent's existing owners.
- [seq-07] assistant: Chose the minimal portable set: new `feature-discovery` and `followup-prevention` skills, stronger review/audit/surface-contract guidance, PR-scope hygiene, and a clearer generated Skills Overview contract.
- [seq-08] assistant: Patched the selected parent files, reran `harness:prep`, and corrected the new skills so their Use Cases render cleanly in the generated AGENTS overview.
- [seq-09] assistant: Filled the linked history/session artifacts with the exact May 3-10 review window, the pivot-to-primary-checkout note, the integrated lessons, and the deliberately skipped repo-specific ideas.
- [seq-10] assistant: Ran `node --test harness-tests/tests/skills.test.mjs`, `harness:prep`, `harness:iterate`, `harness:post`, and `harness:post -- --staged` successfully, then confirmed `harness:ci` only failed at the provider-backed guardian boundary because Gemini had a missing `simdjson` dylib and Codex fallback lacked session/network access in the sandbox.

## Corrections & Thrash

- user_correction: none
- agent_correction: Stopped trying to attach a branch inside the automation worktree after `HEAD.lock` failures proved that linked-worktree metadata writes were blocked in this sandboxed path.
- process_issue: The first session scaffold was created in the detached automation worktree before the `HEAD` write limitation was fully confirmed; it had to be removed with `git clean` so the durable work could move to the primary checkout cleanly.
- thrash: The cross-repo comparison initially surfaced several attractive but overlapping ideas (`merge-to-main-defaults`, `code-health-review`, notification contract runners, raw feature catalogs). The final diff kept only the net-new portable pieces and folded overlapping insights into existing parent owners instead of importing sibling shapes wholesale.

## Workflow Repetition

- repeated_workflow: Restored the repo runtime and reran `harness:prep` before trusting any later harness signal, matching the same bootstrap-first pattern used in sibling unresolved-churn audits.
- repeated_workflow: Compared new extract candidates against the parent's April 12, April 26, and May 3 upstream entries before porting anything, so already-landed portability work was not replayed under new labels.
- custom_script: `source ~/.nvm/nvm.sh && nvm use 20`
- custom_script: `npm ci`
- custom_script: `npm run harness:prep`
- custom_script: `npm run harness:new:session -- --slug "cross-repo-harness-extract-may10"`
- custom_script: `npm run harness:new:meta -- --slug "cross-repo-harness-upstream-may10" --session-slug "cross-repo-harness-extract-may10"`
- custom_script: `git clean -f .harness/context/sessions/2026-05-10-1203-cross-repo-harness-extract-may10.md`
- custom_script: `npm run harness:iterate`
- custom_script: `npm run harness:post`
- custom_script: `npm run harness:post -- --staged`
- custom_script: `npm run harness:ci`

## Codify Candidates

- candidate: target=skill; description=Add a generic `feature-discovery` owner so ambiguous feature or workflow requests do not jump straight from vague intent into implementation.
- candidate: target=skill; description=Add a generic `followup-prevention` owner so repeated user redirects become durable repo behavior instead of chat-only polish.
- candidate: target=skill; description=Teach `durable-surface-contracts` that shared assets need declared packaging plus validation and that lane readiness cannot stay implicit.
- candidate: target=agents; description=Make the generated Skills Overview contract explicit so it is not mistaken for a permission or policy-widening surface.

## Guidance Impact

- Added always-on AGENTS triggers for `feature-discovery` and
  `followup-prevention`.
- Added new skills at `workflows/skills/feature-discovery/` and
  `workflows/skills/followup-prevention/`.
- Updated `anti-slop-review`, `find-regressions`,
  `durable-surface-contracts`, and `merge-main-open-pr` with the selected
  cross-repo portability lessons.
- Updated `.harness/framework/lib/skills.mjs`, `harness-tests/tests/skills.test.mjs`,
  and `.harness/Harness.md` so the generated Skills Overview block is clearly
  descriptive only.

## Outcome

The parent now carries the main still-portable gaps surfaced by the sibling
repos without inheriting their stack-specific release, deploy, or runtime
contracts. The intentionally skipped items are the repo-shaped skills and
schemas that would have overfit the parent: `web-release-lane`,
`merge-to-main-defaults`, `nanoclaw-live-validation`, the notification-specific
shared-contract runner, the raw `life.exe` feature/monitor catalog shape, and
the closed-session/session-pointer variants from the sibling harness forks. The
remaining validation blocker is provider-environment health inside
`harness:ci`, not a deterministic repo-policy or test failure.

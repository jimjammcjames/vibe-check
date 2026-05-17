---
date: "2026-05-17"
started_at: "2026-05-17T12:08:41.753Z"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-05-17-cross-repo-harness-upstream-may17.md"
skills_used:
  - "anti-slop-preflight"
  - "detached-worktree-safety"
  - "add-new-skill"
  - "find-regressions"
---

# cross-repo-harness-extract-may17

## Summary

Compare the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe`, upstream only the still-portable improvements into the canonical
parent, run the harness on the result, and leave the primary checkout clean
enough to land on `main`.

## User Intent

Look through the sibling repos plus their recent harness context and
compound-style automation context, integrate only the beneficial changes that
can be made repo/platform/language agnostic, skip repo-shaped ideas, and
summarize exactly what was integrated, why, and from where.

## Timeline

- [seq-01] user: Asked for a thorough cross-repo harness review across `moves`, `moves-algorithm`, and `life.exe`, with one subagent per repo, selective repo-agnostic integration, and final harness validation before any push to `main`.
- [seq-02] assistant: Ran `npm run harness:prep` in the automation worktree, hit missing `node_modules`, restored dependencies with `npm ci`, and reread the parent Harness doc plus the earlier April 26, May 3, and May 10 upstream entries to avoid duplicating already-landed portability work.
- [seq-03] assistant: Spawned three repo investigators in parallel for `moves`, `moves-algorithm`, and `life.exe` scoped to the exact 2026-05-10 through 2026-05-17 window plus the related compound/unresolved-churn context.
- [seq-04] assistant: Compared current parent skills against likely sibling candidates, including `moves` `prove-it`, `moves` code-health routing, `moves-algorithm` audit-freshness lessons, and `life.exe` durable validation language.
- [seq-05] assistant: Confirmed the automation worktree still could not create `HEAD.lock` under `/Users/jamesdugle/Repos/vibe check/.git/worktrees/vibe-check`, so durable edits moved to the attached `/Users/jamesdugle/Repos/vibe check` checkout on `main`.
- [seq-06] assistant: Created the May 17 session in the primary checkout, then retried the linked meta creation sequentially after one failed parallel attempt proved the session-link race was real.
- [seq-07] assistant: Narrowed the parent diff to one new generic skill plus small updates to existing owners rather than importing repo-shaped release, runtime, mobile, notification, or feature-catalog surfaces.
- [seq-08] assistant: Added `workflows/skills/prove-it/SKILL.md`, updated `feature-discovery`, `anti-slop-review`, `find-regressions`, and `durable-surface-contracts`, and reran `harness:prep` to regenerate the AGENTS Skills Overview with the new skill entry.
- [seq-09] assistant: Ran `node --test harness-tests/tests/skills.test.mjs`, `npm run harness:iterate`, `npm run harness:post`, and `npm run harness:post -- --staged` successfully on the primary checkout.
- [seq-10] assistant: Ran `npm run harness:ci`; the deterministic CI prelude completed, but the provider-backed `undocumented-detector.mjs` step failed because Gemini did not produce expected output and Codex fallback ended with `Provider unavailable (rate limit/network)`.

## Corrections & Thrash

- user_correction: none
- agent_correction: Abandoned the first plan to branch or land from the detached automation worktree after the sandbox again blocked linked-worktree `HEAD.lock` writes.
- process_issue: I mistakenly launched `harness:new:session` and the linked `harness:new:meta` in parallel once, which caused a real session-slug race and forced a sequential retry.
- thrash: The sibling repos surfaced several tempting but overlapping ideas. The final diff deliberately kept only the truly generic proof, audit-freshness, and validation-language upgrades and left stack-shaped workflow surfaces out.

## Workflow Repetition

- repeated_workflow: Restored the repo bootstrap in the detached automation checkout before trusting any later harness or comparison signal.
- repeated_workflow: Compared new extract candidates against the parent's April 26, May 3, and May 10 upstream entries before importing anything, so already-landed portability work was not replayed under new labels.
- repeated_workflow: Kept the sibling analysis anchored to the exact 2026-05-10 through 2026-05-17 window and separated empty-window findings from older carryover context.
- custom_script: `npm ci`
- custom_script: `npm run harness:prep`
- custom_script: `npm run harness:new:session -- --slug "cross-repo-harness-extract-may17"`
- custom_script: `npm run harness:new:meta -- --slug "cross-repo-harness-upstream-may17" --session-slug "cross-repo-harness-extract-may17"`
- custom_script: `node --test harness-tests/tests/skills.test.mjs`
- custom_script: `npm run harness:iterate`
- custom_script: `npm run harness:post`
- custom_script: `npm run harness:post -- --staged`
- custom_script: `npm run harness:ci`

## Codify Candidates

- candidate: target=skill; description=Add a generic `prove-it` skill so evidence-heavy debugging, validation, and comparison work has one shared proof workflow instead of downstream repo-specific variations.
- candidate: target=skill; description=Teach `feature-discovery` to hand off truth and causality questions to `prove-it` so discovery and proof remain separate owners.
- candidate: target=skill; description=Teach `find-regressions` to compare artifact freshness against code freshness before unresolved-churn audits claim the repo is quiet.
- candidate: target=skill; description=Teach `durable-surface-contracts` to express partial lane support honestly and validate execution-boundary changes through the real operator entrypoint.

## Guidance Impact

- Added `workflows/skills/prove-it/SKILL.md`.
- Updated `workflows/skills/feature-discovery/SKILL.md`,
  `workflows/skills/anti-slop-review/SKILL.md`,
  `workflows/skills/find-regressions/SKILL.md`, and
  `workflows/skills/durable-surface-contracts/SKILL.md`.
- Regenerated the AGENTS Skills Overview through `npm run harness:prep` so the
  new skill is discoverable during prep.

## Outcome

The parent now carries the strongest still-portable lessons from the sibling
repos for this window without inheriting their stack-specific runtime, release,
mobile, contract-runner, or feature-catalog assumptions. The remaining work is
to decide how far to land from this sandbox: the deterministic checks are
green, but the outer loop is still blocked by provider availability in
`undocumented-detector.mjs`.

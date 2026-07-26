---
date: "2026-07-26"
started_at: "2026-07-26T12:04:43.432Z"
tags:
  - "#tag"
related_history:
  - ".harness/context/history/2026-07-26-cross-repo-harness-upstream-jul26.md"
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
  - "review-skill"
---

# extract-harness-refresh-jul26

## Summary

Reviewed the sibling harness installs in `moves`, `moves-algorithm`, and
`life.exe` plus their linked `compound` automation context for the exact local
window `2026-07-19` through `2026-07-26`, then reduced the parent landing to
two generic `AGENTS.md` rules imported from fresh `moves` guidance only.

## User Intent

Audit the other repos carrying this harness, launch a subagent per repo for the
past-week harness/context window plus repo-linked `compound` automation
context, import only repo/platform/language-agnostic improvements into the
canonical parent, run the harness on the result, and leave the workspace clean
enough to push if the landing is solid.

## Timeline

- [seq-01] user: Requested a cross-repo harness review across `moves`, `moves-algorithm`, and `life.exe`, with one subagent per repo, generic-only integration, full harness validation, and permission to push when clean.
- [seq-02] assistant: Read the parent repo instructions, reviewed prior extract/compound memory, ran `npm run harness:prep`, hit the expected missing-`node_modules/` bootstrap failure, and repaired it with `npm ci`.
- [seq-03] assistant: Read the parent `Harness.md`, the prior July 19 extract history/session, and the relevant workflow skills before making any edits.
- [seq-04] assistant: Confirmed the parent worktree was detached but current with `origin/main`, then moved it onto branch `extract-harness-refresh-jul26a`.
- [seq-05] assistant: Created and selected the linked session, after rerunning the pointer step with the required Git-metadata permission because the first session creation wrote the file but could not set the pointer inside the sandbox.
- [seq-06] assistant: Located the sibling repo paths and the repo-linked `compound` automation IDs: `compound` for `moves`, `compound-3466cc1b8b1f` for `moves-algorithm`, and `compound-b3d324e04af6` for `life.exe`.
- [seq-07] assistant: Spawned one read-only scout per sibling repo, each scoped to the exact local window `2026-07-19` through `2026-07-26` plus its linked `compound` automation context.
- [seq-08] assistant: While the scouts ran, inspected the parent owner surfaces directly and did one raw git/history pass over the sibling harness surfaces to cross-check the eventual scout output.
- [seq-09] assistant: Received the scout verdicts: `life.exe` quiet, `moves-algorithm` quiet, and `moves` noisy but mostly repo-local; only two AGENTS-level rules from `moves` survived the generic-only screen.
- [seq-10] assistant: Applied the minimal parent uplift in `AGENTS.md`: separate product outcomes from verifier policy, and do not let independently deferrable non-core seams block a source-frozen landing outside the task's safety contract.
- [seq-11] assistant: Created the linked meta entry and recorded the cross-repo selection pressure, explicit skips, and the repo-linked `compound` automation evidence.
- [seq-12] assistant: Reran `harness:prep`, passed `harness:iterate`, passed `harness:post`, staged the candidate, and passed `harness:post -- --staged` while keeping the history/session artifacts current with the completed gates.
- [seq-13] assistant: Passed the final `harness:ci` run with `Severity: NONE`, including the harness review bundle, and prepared the exact staged candidate for commit and landing.
- [seq-14] assistant: After updating the artifacts with the first green CI result, reran the staged gate successfully and reran `harness:ci` on the exact new candidate. `harness-guardian` then flagged the first AGENTS wording as weakening review authority, so the imported rules were tightened to stay fail-closed before another CI rerun.
- [seq-15] assistant: Passed the staged gate again after the fail-closed reword and then passed the full `harness:ci` rerun with `Severity: NONE`, clearing the exact corrected candidate.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first attempt to create the task branch failed on a worktree `HEAD.lock` permission error inside repo Git metadata; rerunning the branch switch with the required unsandboxed permission resolved it, and the original branch name then proved to already exist in another worktree.
- agent_correction: the first `harness:new:session` attempt created the session file but failed to create the Git-metadata pointer directory; rerunning the pointer step via `harness:session:use` with the required permission completed the linkage cleanly.
- agent_correction: the first AGENTS wording imported from `moves` was too permissive for the parent harness guardian. The final wording now scopes goals earlier and requires incomplete non-core seams to be removed or isolated before final verification, rather than sounding like failing verifier signals can simply be deferred.
- process_issue: `npm run harness:prep` initially failed because `node_modules/` was missing in this fresh parent worktree. `npm ci` was the correct bootstrap repair before analysis or edits.
- thrash: none

## Workflow Repetition

- repeated_workflow: resolve the exact local week first, compare sibling repo owners plus linked automation memory in parallel, then upstream only the smallest parent-shaped delta that survives a strict generic-only filter.
- custom_script: used focused repo reads of `AGENTS.md`, `.harness/`, `workflows/skills/`, repo-equivalent history/session surfaces, `git log --all` on owner paths, and the repo-linked `compound` automation files under `~/.codex/automations/`.

## Codify Candidates

- candidate: target=agents; description=keep proof-scope separation and deferrable-non-core-seam landing discipline as always-on parent AGENTS guidance instead of importing larger sibling proof/release systems.

## Guidance Impact

- `AGENTS.md` now owns two new portable rules distilled from the fresh `moves`
  window: separate product outcomes from verifier policy, and do not let
  non-core seams remain half-integrated in a source-frozen landing.
- No new skill, CLI, or harness-core surface was added.

## Outcome

The sibling review narrowed to a minimal parent-shaped landing rather than a
broader framework import. `life.exe` and `moves-algorithm` were exact-window
quiet on their harness-equivalent owners; `moves` carried real weekly churn,
but only two AGENTS-level rules were generic enough to keep. The first wording
passed an initial CI run but failed `harness-guardian` on the exact
artifact-updated candidate, so the final wording was tightened to keep verifier
authority fail-closed. The corrected candidate then passed the staged gate and
full `harness:ci` rerun with `Severity: NONE`, so it is ready for commit and
landing.

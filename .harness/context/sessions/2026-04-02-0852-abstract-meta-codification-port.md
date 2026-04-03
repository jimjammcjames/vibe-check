---
date: "2026-04-02"
started_at: "2026-04-02T08:52:23.148Z"
tags:
  - "#harness-meta"
  - "#skills"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-04-02-abstract-meta-codification-behaviors.md"
skills_used:
  - "add-new-skill"
  - "codify-learnings"
  - "merge-main-open-pr"
  - "merge-pr"
---

# abstract-meta-codification-port

## Summary

Compared the current harness against `moves` and `life.exe`, extracted the
missing meta-learning behaviors, and ported them into this repo as generic
workflow guidance, stronger review/codify skills, explicit guidance-impact
tracking, and one new abstract skill for durable runtime/automation contracts.

## User Intent

Find the self-improving and proactive codification behavior those repos had
evolved, then make sure the same ideas exist here in an abstract, reusable form
instead of only in repo-specific implementations.

## Timeline

- [seq-01] user: asked to find the meta-learning / proactive self-improving codification behavior from `moves` and `life.exe` and extract it here in the abstract.
- [seq-02] assistant: ran `harness:prep`, inspected the repo-local harness skills/history, and started a gap analysis against the sibling repos.
- [seq-03] assistant: audited `moves` AGENTS, skills, history, and review prompts, then inspected `life.exe` AGENTS, history templates, prep tooling, and feature/monitor policy.
- [seq-04] assistant: identified the main portable gaps as guidance-followthrough tracking, skill use-case enforcement, richer session-aware review prompts, and an abstract durable-surface contract workflow.
- [seq-05] assistant: created this session plus the matching meta entry, then patched the harness docs, templates, policy audit, tests, and skill catalog to encode those behaviors directly.
- [seq-06] assistant: regenerated the prep output to sync the AGENTS skills overview and confirm the new portable skill surfaced correctly.
- [seq-07] assistant: hit the repo-documented missing-tooling path on the first `harness:iterate`, ran `npm install`, and reran the loop instead of treating the harness as broken.
- [seq-08] assistant: `harness:post` exposed that `base-tripwire.test.mjs` still wrote a legacy-style temporary fix entry under the real history tree, so the synthetic fixture was upgraded to the current v3 strict-entry contract.
- [seq-09] assistant: reran `harness:iterate` and `harness:post`, then confirmed the full medium verification loop passed with the stronger codification rules in place.
- [seq-10] user: asked to open a PR and merge the change.
- [seq-11] assistant: created a named branch from the detached head, staged the intended diff, and passed the staged harness gate.
- [seq-12] assistant: the pre-commit dogfooding hook unexpectedly committed only two temporary tripwire fixture files, so the intended changes were left unstaged.
- [seq-13] assistant: recovered by creating a fresh branch from `origin/main` and carrying only the real working-tree changes forward, leaving the bad local-only commit behind.
- [seq-14] assistant: traced the bad commit to `base-tripwire.test.mjs` staging temp files into the real repo index during dogfooding, then fixed the test to use an isolated temporary `GIT_INDEX_FILE` and reran `harness:iterate` plus `harness:post` successfully.
- [seq-15] assistant: `harness:ci` then exposed that the temp index still leaked into the tripwire worktree itself, so `.harness/framework/scripts/base-tripwire.mjs` was hardened to clear `GIT_INDEX_FILE` and `GIT_DIR` for all worktree-local commands.
- [seq-16] assistant: hardened the remaining `base-tripwire.test.mjs` staged-fixture cases with `try/finally` cleanup, removed leftover temporary artifacts, and prepared the final commit candidate for PR verification.
- [seq-17] assistant: the next `harness:ci` pass failed on a leaked temporary linked-session fixture from `harness-cli.test.mjs`, so the recursive `post`/`ci` timeout tests were moved onto an isolated `HARNESS_CONTEXT_ROOT` and the `new:session` template assertion was extended to require `## Outcome`.
- [seq-18] assistant: a manually interrupted clean-room `harness:ci` rerun left temporary config-discovery tripwire fixtures behind, so those disposable files were removed and the outer loop was restarted without another forced kill.
- [seq-19] assistant: the final rerun passed `harness:post -- --staged` and the full `harness:ci` stack, including policy audit, base-tripwire, memory-coherence, harness-guardian, undocumented detection, and agent code review.

## Corrections & Thrash

- user_correction: none
- agent_correction: narrowed the `life.exe` import to abstract contract/documentation behavior instead of porting its repo-specific feature catalog and host-runtime governance wholesale.
- agent_correction: upgraded the tripwire test fixture to the current strict-entry schema instead of weakening policy audit to tolerate the old synthetic entry.
- agent_correction: abandoned the first local PR branch after the hook-created fixture-only commit and moved the real work onto a fresh clean branch from `origin/main`.
- agent_correction: isolated tripwire test staging onto a temporary git index so the pre-commit dogfooding run no longer mutates the real commit index.
- agent_correction: cleared leaked git-index env vars inside `base-tripwire.mjs` worktree-local commands so the isolated source index does not poison patch application in the temp base worktree.
- agent_correction: wrapped the remaining staged-fixture tripwire tests in `try/finally` so failure paths still clean up temp files and index state.
- agent_correction: isolated recursive harness CLI timeout tests onto a temporary context root so killed dogfooding runs cannot leak untracked session fixtures back into CI policy audit.
- process_issue: `life.exe` uses a different history/tooling stack than the `.harness` lineage, so the comparison had to happen at the behavior level instead of by copying exact files.
- process_issue: the first local `harness:iterate` run failed because this checkout was missing the JS packages expected by the lint step, which required a local `npm install` before the normal loop could continue.
- process_issue: the repo's self-checking pre-commit flow can stage temporary tripwire fixture files during dogfooding, so a commit can land the wrong payload if those fixtures are not isolated from the real index.
- process_issue: base-tripwire integration tests were safe for ordinary local test runs but unsafe inside the real pre-commit hook because they shared the commit index with the dogfooding run.
- process_issue: after isolating the source index, the tripwire runner still inherited that env into the temp base worktree, which broke patch application until the worktree-local commands were scrubbed.
- process_issue: even after the env-isolation fixes, failure-path cleanup still mattered because any tripwire assertion that exited early could leave disposable fixture files visible to later verification passes.
- process_issue: recursive timeout-based harness CLI tests can run enough of the nested suite to create real session artifacts before the subprocess is killed, so they need their own temporary context root just like other synthetic artifact tests.
- process_issue: forcibly stopping a full `harness:ci` run can still strand disposable test fixtures in the checkout until they are removed, so repo-wide formatting checks right after a kill reflect cleanup state as much as product state.
- thrash: the current repo already contained the first wave of portable harness upgrades, so the work shifted from broad import to a more careful gap analysis before editing anything.
- thrash: the stricter audit surfaced a second-order test-fixture problem during verification, so the harness loop had to pause for one more test-only fix before `harness:post` could go green.
- thrash: the first commit attempt landed the wrong files, which forced a branch handoff before the actual PR-ready commit could be created.

## Workflow Repetition

- repeated_workflow: compare sibling repos' AGENTS, skills, templates, and history notes first, then port only the durable behavior that survives removal of product-specific context.
- repeated_workflow: rerun `harness:iterate` and `harness:post` after each harness/test-fixture correction so the final result reflects the real policy contract.
- repeated_workflow: when a hook or dogfooding run contaminates the index, move the intended work onto a fresh branch from the base rather than rewriting the mistaken local commit.
- repeated_workflow: when integration tests need staged state during hook execution, give them an isolated temporary index instead of letting them touch the real repo index.
- custom_script: used built-in harness commands (`harness:prep`, `harness:new:session`, `harness:new:meta`) plus local `rg`/`sed` inspection; no new helper script was introduced.

## Codify Candidates

- candidate: target=skill; require every skill to publish concrete use cases so prep-time discovery stays reliable.
- candidate: target=history; record explicit guidance impact when durable docs or policies move with a code change.
- candidate: target=agents; search sessions as well as history before repeating complex work, because workflow thrash often lives in sessions first.

## Guidance Impact

This task changed the standing repo contract in tracked artifacts: `AGENTS.md`
and `.harness/Harness.md` now explicitly require session-aware lookup and
guidance-followthrough capture, new templates carry `Guidance Impact`, and the
skill catalog now includes a generic durable-surface contract workflow.

## Outcome

The repo now has the missing abstract behaviors from `moves` and `life.exe`:
stronger codify/review prompts, deterministic skill use-case enforcement,
explicit guidance-impact capture, session-aware lookup guidance, and a generic
way to document long-lived runtime or automation surfaces without importing a
repo-specific feature-catalog implementation, and the final `harness:post`
verification passed after upgrading the affected tripwire test fixture to the
same strict-entry contract the new audit now enforces, with the work now
continuing on a clean branch after the first commit attempt landed only
temporary hook fixtures and the last remaining staged-fixture cleanup paths now
hardened before the PR/merge gate, with the later recursive CLI timeout-test
leak closed as well and the branch now green through the full outer CI loop.

---
date: "2026-03-30"
started_at: "2026-03-30T07:58:32.361Z"
tags:
  - "#harness"
  - "#research"
related_history:
  - ".harness/context/history/2026-03-30-simplify-session-lifecycle-and-trace-adoption-research.md"
  - ".harness/context/history/2026-03-30-harden-ci-verification-tests.md"
skills_used:
  - "NONE"
---

# remove-close-session-and-trace-research

## Summary

Removed the close-session lifecycle from the canonical harness, fixed a
repo-relative session-linking regression, and used the historical traces across
the sibling repos to separate portable harness evolutions from repo-specific
governance. During merge follow-up, also hardened the verification tests that
were failing in GitHub Actions.

## User Intent

Stop treating sessions as active/closed stateful records, keep the task data
without a close step, and then use the real traces from past repos to decide
what the canonical harness should and should not absorb.

## Timeline

- [seq-01] user: Asked what the newly added session model meant and wanted the intended operating model rather than "user stories."
- [seq-02] assistant: Explained the current session/history model, the intended usage, and the source repos that introduced those concepts.
- [seq-03] user: Asked to remove `close:session` because active/inactive state is not valuable and the data should just remain.
- [seq-04] assistant: Removed `close:session`, session status/ended-at semantics, and the active-session dependency from canonical CLI, policy, docs, and tests.
- [seq-05] user: Asked for deeper research across all past repo traces to decide what should be brought over and what should not.
- [seq-06] assistant: Mined representative history/session traces from `moves`, `moves-algorithm`, `life.exe`, and `mooo`, then ran broader pattern searches and counts to find repeated behavior.
- [seq-07] assistant: Found recurring multi-session friction in `moves`, strong evidence for keeping correction/workflow/codify sections, and a clear boundary between portable harness behavior and runtime-specific governance.
- [seq-08] assistant: While creating this task's own meta entry, discovered that the canonical CLI had started writing absolute `session_refs` and patched it back to exact repo-relative paths with regression coverage.
- [seq-09] assistant: Wrote the trace-backed adoption memo and updated canonical docs so sessions are described as append-only task notes with no close step.
- [seq-10] assistant: Opened the draft PR, saw GitHub Actions fail before any project checks ran because `actions/setup-node` expected a committed npm lockfile, then prepared the follow-up fix by unignoring and staging `package-lock.json`.
- [seq-11] assistant: After the lockfile fix, the rerun reached the global prettier gate and failed on five tracked files; normalized those files, confirmed the formatter issue locally, and discarded the temporary tripwire baseline artifacts that the local outer-loop run generated during its own self-check.
- [seq-12] user: Asked to merge the PR.
- [seq-13] assistant: Rechecked the latest GitHub Actions run, found that `npm test` was still failing inside CI, and traced the concrete failing subtests from the Actions logs.
- [seq-14] assistant: Reproduced the failures locally, confirmed the deterministic red was the tripwire discovery fixture, and identified that the guardian test was still coupled to provider availability on GitHub runners.
- [seq-15] assistant: Hardened the verification tests by making the tripwire fixture branch-aware, moving the guardian review stub into a child-process HTTP server, and giving the `post`/`ci` smoke tests more startup headroom.
- [seq-16] assistant: Re-ran the focused failing suite locally and got a clean pass before starting the full harness verification pass for merge.
- [seq-17] assistant: The first full `harness:post` rerun exposed one more nested-test race: `harness-cli.test.mjs` spawns another `test:local`, and `mcp-gen.test.mjs` was sharing the same `.tmp/mcp-gen` root across parent and child processes.
- [seq-18] assistant: Isolated `mcp-gen` temp fixtures by `process.pid`, reran formatting, and resumed the harness loop with the extra test fix included in the merge follow-up.

## Corrections & Thrash

- user_correction: [seq-03] The user explicitly rejected the active/closed lifecycle and asked to keep session data without any close step.
- agent_correction: [seq-08] The new meta entry exposed that `session_refs` were being written as absolute filesystem paths, so the CLI and tests were corrected before continuing.
- agent_correction: [seq-11] The first CI follow-up fixed the missing lockfile but assumed that was the only remote blocker; the rerun showed the repo still needed global prettier normalization before merge.
- agent_correction: [seq-15] The first guardian-test hardening attempt used an in-process HTTP stub, but `execSync` blocked the same event loop and deadlocked the test until the stub was moved to a child process.
- process_issue: [seq-10] The PR's `Harness CI Check` failed in GitHub Actions before running the repo checks because `.gitignore` excluded `package-lock.json` while the workflow used `actions/setup-node` with `cache: npm`.
- process_issue: [seq-11] The local `harness:ci` run generates temporary tripwire baseline artifacts in the worktree, so those byproducts had to be removed instead of being folded into the PR.
- process_issue: [seq-13] The remaining GitHub Actions failure was not a harness logic regression; it came from verification tests that assumed more isolated branch state or more provider availability than the GitHub runner actually had.
- process_issue: [seq-17] The local harness loop also revealed a nested-test temp-directory race where parent and child `test:local` runs were both using `.tmp/mcp-gen`.
- thrash: none

## Workflow Repetition

- repeated_workflow: when porting harness behavior from sibling repos, read the real session/history traces first and separate portable workflow primitives from repo-specific runtime governance before changing canonical docs or gates.
- repeated_workflow: when a harness-core change touches artifact shape or linking, update the CLI, docs, templates, and at least one regression test in the same pass.
- custom_script: used `rg`, `sed`, and targeted cross-repo trace counts over `moves`, `moves-algorithm`, `life.exe`, and `mooo` so the adoption decision was grounded in the actual artifacts rather than README summaries alone.
- repeated_workflow: when a merge is blocked by GitHub Actions, inspect the exact failing subtest from the run log before changing harness behavior; in this pass that separated real harness contracts from brittle fixture assumptions.
- repeated_workflow: any test suite that may be invoked recursively by harness smoke tests needs per-process temp roots instead of a shared repo-local fixture directory.

## Codify Candidates

- candidate: target=agents; description=When a sibling repo shows a repeated pattern, port only the repo-agnostic workflow primitive into canonical and keep host/runtime governance behind optional adapters unless multiple repos converge on the same portable contract.

## Outcome

The canonical harness no longer has `close:session` or active/closed session
state, session linking now stays repo-relative, and the repo now includes a
trace-backed memo that separates portable harness patterns from `life.exe` and
`mooo` runtime-specific governance. The merge follow-up also restores the
committed npm lockfile expected by the CI workflow so the published PR can pass
its GitHub Actions setup step, and the tracked files checked by global prettier
have now been normalized for the GitHub Actions outer loop as well. The final
follow-up hardens the remaining CI verification tests so the tripwire fixture,
guardian verification path, and CLI smoke tests all match the real execution
environment more closely, and the nested `mcp-gen` test race has been removed
by isolating temp fixtures per process.

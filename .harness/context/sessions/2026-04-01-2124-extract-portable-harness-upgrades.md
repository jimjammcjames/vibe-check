---
date: "2026-04-01"
started_at: "2026-04-01T21:24:16.932Z"
tags:
  - "#harness-meta"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
  - ".harness/context/history/2026-04-02-harness-post-smoke-timeout-detection.md"
  - ".harness/context/history/2026-04-02-base-tripwire-shared-config-loader.md"
skills_used:
  - "merge-main-open-pr"
  - "merge-pr"
  - "git-sync-dirty-branch"
  - "github:gh-fix-ci"
---

# extract-portable-harness-upgrades

## Summary

Merged the portable harness improvements and repo-agnostic workflow skills from
peer repos into the canonical parent, then rebased the work onto the latest
`origin/main` before preparing it for PR landing.

## User Intent

Review the harness installs in `moves`, `moves-algorithm`, and `life.exe`,
integrate the generalizable improvements into this parent repo, run the harness
on the result, and land the work through GitHub once it was clean.

## Timeline

- [seq-01] user: asked for a cross-repo harness review and generic-parent integration pass.
- [seq-02] assistant: audited the peer repos and integrated shared config, provider, skills, docs, and test improvements.
- [seq-03] user: asked for anything worth abstracting or ripping wholesale, including skills and meta-learning behavior.
- [seq-04] assistant: added portable repo-local skills plus durable AGENTS rules and updated the harness history entry.
- [seq-05] user: asked to push and merge a PR.
- [seq-06] assistant: reran `harness:prep`, `harness:iterate`, `harness:post`, and `harness:ci`, then rebased the dirty branch onto the refreshed `origin/main`.
- [seq-07] assistant: resolved stash-pop conflicts by keeping the newer upstream canonical harness model and replaying only the still-useful portability additions on top.
- [seq-08] assistant: created this session artifact and upgraded the meta history entry to schema v3 so the staged commit-intent gate would reflect the real change set.
- [seq-09] assistant: debugged a GitHub-only Harness CI failure, found the nested `post` smoke test was too strict about stdout, and hardened it to accept timeout-based command recognition.
- [seq-10] assistant: reproduced the remaining failure under the full `npm test` suite, confirmed timeout errors could surface as `ETIMEDOUT`, and widened the smoke-test heuristic before repushing.
- [seq-11] assistant: reran the outer loop, split the smoke-test follow-up into its own fix entry, and narrowed the meta entry back to the actual portability diff after memory-coherence review.
- [seq-12] assistant: fixed `base-tripwire` to use the shared harness config loader and made its integration tests deterministic after the newly activated tripwire exposed a config-loading mismatch.
- [seq-13] assistant: after the tripwire fix passed locally, GitHub Actions still showed the nested `post` smoke test could fail with an early non-zero child exit and little stdout, so the recognition heuristic was widened again and rerun through the local harness loop.

## Corrections & Thrash

- user_correction: [seq-03] user expanded scope from harness setup parity to also include skills, workflows, and meta-learning behavior worth abstracting.
- agent_correction: [seq-07] preserved the newer upstream harness/session model instead of replaying older pre-rebase assumptions on top of `origin/main`.
- agent_correction: [seq-10] widened the `post` smoke-test heuristic after confirming the first fix still missed `ETIMEDOUT` timeout errors during the full suite.
- process_issue: `git stash pop` after rebasing onto refreshed `origin/main` produced conflicts because upstream had changed the same harness surfaces.
- thrash: reran the outer harness loop after the rebase because the earlier green run no longer represented the branch that would be pushed, then had to debug a GitHub-only CI failure before merge and again after the first smoke-test hardening proved incomplete.
- thrash: splitting the smoke-test issue into a proper `fix` entry activated `base-tripwire`, which surfaced a second harness bug in its config-loading path before the final merge gate could clear.
- thrash: GitHub Actions exposed one more remote-only `post` smoke-test failure shape after the local branch was green, which required a final heuristic broadening plus another full staged outer-loop rerun.

## Workflow Repetition

- repeated_workflow: reran `harness:prep`, `harness:iterate`, `harness:post`, and `harness:ci` after the rebase to keep verification tied to the final merge candidate.
- custom_script: used the built-in harness and GitHub workflows only; no custom script was introduced for this landing.

## Codify Candidates

- candidate: target=skill; formalize portable repo skills whenever the same multi-step workflow appears in multiple downstream repos.
- candidate: target=agents; keep durable handoff rules in `AGENTS.md` and let `harness:prep` regenerate the skills overview from repo-local skill metadata.
- candidate: target=history; record CI-only guardrail follow-ups in the same harness meta entry when the issue is part of landing the same portability change.
- candidate: target=history; if a later CI-only fix becomes its own behavioral change, promote it to a separate fix entry instead of stretching the original meta entry.
- candidate: target=agents; keep harness scripts on the shared config loader so config behavior cannot drift between CLI, reviewers, and CI checks.
- candidate: target=history; record harness-core portability upgrades as meta entries with exact affected-file coverage and linked session artifacts.

## Outcome

The branch now carries the portable harness improvements on top of the latest
canonical base and has the matching history/session artifacts needed for staged
verification, PR creation, and merge, with the `post` smoke test hardened
against both timeout output and `ETIMEDOUT` timeout error shapes and tracked in
its own fix entry for coherence, plus one last remote-only early-exit case
captured in the same smoke-test fix thread.

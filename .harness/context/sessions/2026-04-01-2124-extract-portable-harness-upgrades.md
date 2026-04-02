---
date: "2026-04-01"
started_at: "2026-04-01T21:24:16.932Z"
tags:
  - "#harness-meta"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
skills_used:
  - "merge-main-open-pr"
  - "merge-pr"
  - "git-sync-dirty-branch"
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

## Corrections & Thrash

- user_correction: [seq-03] user expanded scope from harness setup parity to also include skills, workflows, and meta-learning behavior worth abstracting.
- agent_correction: [seq-07] preserved the newer upstream harness/session model instead of replaying older pre-rebase assumptions on top of `origin/main`.
- process_issue: `git stash pop` after rebasing onto refreshed `origin/main` produced conflicts because upstream had changed the same harness surfaces.
- thrash: reran the outer harness loop after the rebase because the earlier green run no longer represented the branch that would be pushed, then had to debug a GitHub-only CI failure before merge.

## Workflow Repetition

- repeated_workflow: reran `harness:prep`, `harness:iterate`, `harness:post`, and `harness:ci` after the rebase to keep verification tied to the final merge candidate.
- custom_script: used the built-in harness and GitHub workflows only; no custom script was introduced for this landing.

## Codify Candidates

- candidate: target=skill; formalize portable repo skills whenever the same multi-step workflow appears in multiple downstream repos.
- candidate: target=agents; keep durable handoff rules in `AGENTS.md` and let `harness:prep` regenerate the skills overview from repo-local skill metadata.
- candidate: target=history; record CI-only guardrail follow-ups in the same harness meta entry when the issue is part of landing the same portability change.
- candidate: target=history; record harness-core portability upgrades as meta entries with exact affected-file coverage and linked session artifacts.

## Outcome

The branch now carries the portable harness improvements on top of the latest
canonical base and has the matching history/session artifacts needed for staged
verification, PR creation, and merge.

---
date: "2026-04-05"
started_at: "2026-04-05T04:53:33.862Z"
tags:
  - "#harness"
  - "#audit-followup"
related_history:
  - ".harness/context/history/2026-04-05-close-open-harness-audit-issues.md"
skills_used:
  - "codify-learnings"
  - "review-skill"
---

# fix-open-harness-audit-issues

## Summary

Implemented the remaining harness audit fixes across base-ref resolution, CI
review-coverage diagnostics, deterministic smoke and tripwire tests, and the
durable workflow docs that explain how these guardrails are supposed to work.

## User Intent

Apply the previously approved hardening plan end-to-end instead of stopping at
analysis, and leave the repo with both the code changes and the codified
workflow updates needed to keep the same churn from repeating.

## Timeline

- [seq-01] user: requested implementation of the full open-audit hardening plan for the current harness repo.
- [seq-02] assistant: ran `npm run harness:prep`, reviewed the codification skills, and created the linked session plus meta entry for the harness-core work.
- [seq-03] assistant: added a shared base-ref resolver plus `print-base-ref.mjs`, removed per-script base-ref drift, and switched the relevant harness scripts to the shared config loader and resolver path.
- [seq-04] assistant: added CI review-coverage diagnostics, GitHub summary output, workflow artifact uploads, and updated the repo skills and docs to stop hard-coding `origin/main`.
- [seq-05] assistant: rewrote the harness CLI smoke tests to watch startup markers, sandboxed the base-tripwire integration tests, and added targeted coverage for base-ref fallback plus review-coverage reporting.
- [seq-06] assistant: reran focused tests, fixed sandbox config duplication and concurrent full-suite cleanup assertions, replaced `readFileSync` in the new provider-selection tests to satisfy test-lint, and iterated on harness validation until only the placeholder context artifacts remained.
- [seq-07] assistant: backfilled this session and the linked meta entry with the actual implementation details, codified guidance, and validation record required by policy audit.
- [seq-08] user: asked to open a pull request and merge the validated harness hardening change.
- [seq-09] assistant: confirmed GitHub auth, found the worktree was detached at the validated commit, and prepared to create a dedicated branch before pushing so the PR/merge flow can proceed safely.
- [seq-10] assistant: created `james/fix-open-harness-audit-issues`, staged the full harness diff, and passed `npm run harness:post -- --staged` before cutting the commit.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first sandbox helper inserted `base_ref` without normalizing the copied reviewer block, which produced duplicate YAML keys and hid the real tripwire assertions until the helper was rewritten to replace-or-insert deterministically.
- process_issue: local verification was initially blocked because `tsx` was not installed in this workspace, so `npm ci` had to run before the new harness tests could execute; later, the PR-open workflow also revealed the worktree was detached, so a fresh branch had to be created from the validated commit before pushing.
- thrash: full `harness:ci` surfaced three sequential non-product blockers after the functional changes were already in place: Prettier formatting drift, a `test-lint` complaint about `readFileSync` in a new test, and policy-audit failures from the still-skeletal session/meta artifacts.

## Workflow Repetition

- repeated_workflow: implement one harness-core slice, run focused tests first, then rerun `harness:iterate` and the full `harness:ci` gate until the next deterministic failure reveals the next missing codification or regression-proofing step.
- repeated_workflow: when an automation worktree is detached, confirm the validated commit is reachable from the intended base, then create a dedicated branch before starting the push/PR workflow so the tested diff is preserved under an explicit head ref.
- custom_script: none

## Codify Candidates

- candidate: target=history; description=scoped fixture-absence assertions are more stable than whole-repo `git status` baselines when the full harness test suite runs concurrently and other tests may create their own temporary context artifacts.
- candidate: target=agents; description=create and flesh out the linked session/history artifacts before the final policy-audit loop so harness-core changes do not stall on placeholder context files late in the turn.

## Guidance Impact

- Added a durable session-linkage sequencing rule to `AGENTS.md` and
  `.harness/Harness.md`, taught merge-related skills to resolve the base ref
  through the shared helper instead of hard-coding `origin/main`, and updated
  the merge PR skill to split unrelated harness/tooling blockers into a
  follow-up thread unless they are inseparable from the merge candidate.

## Outcome

The repo now has one shared base-ref resolver, machine-readable CI review
coverage diagnostics, deterministic smoke and tripwire tests, and aligned
workflow docs for merge handling plus session linkage. Focused regression tests
passed, and the full `npm run harness:ci` gate passed after the formatting,
test-lint, and context-artifact follow-ups were closed; the validated diff is
now staged on a dedicated branch and ready for commit/push.

---
date: "2026-04-05"
started_at: "2026-04-05T12:10:02.055Z"
tags:
  - "#harness-meta"
  - "#ci"
related_history:
  - ".harness/context/history/2026-04-05-guardian-context-artifact-filter.md"
skills_used:
  - "NONE"
---

# guardian-context-artifact-filter

## Summary

Fix the clean-branch `harness:ci` failure where `harness-guardian` treated
temporary history/session artifacts as harness-core changes.

## User Intent

Run a thorough cross-repo harness audit, integrate only portable parent
improvements, and make sure this repo's own harness passes on the final state.

## Timeline

- [seq-01] user: asked for a cross-repo audit of `moves`, `moves-algorithm`, and `life.exe`, with only repo-agnostic improvements integrated into the canonical parent.
- [seq-02] assistant: prepped the harness, reviewed parent history and skills, and launched one subagent per sibling repo.
- [seq-03] assistant: fast-forwarded local `main` to `origin/main`, which already carried the April 2 parent portability pass.
- [seq-04] assistant: ran `npm run harness:post`, which passed, then `npm run harness:ci`, which failed in `harness-guardian.test.mjs`.
- [seq-05] assistant: traced the failure to `harness-guardian.mjs` filtering on every `.harness/**` path instead of the configured `harnessCore` boundary.
- [seq-06] assistant: created a harness meta entry and session pair, updated the guardian filter, and added regression coverage for temporary context artifacts.

## Corrections & Thrash

- user_correction: none
- agent_correction: none
- process_issue: an isolated guardian test run cannot bind its hermetic localhost stub server in this sandbox, so validation had to rely on the normal repo loops instead of that standalone command alone.
- thrash: `harness:ci` on the synced clean branch exposed a red parent test before any new portability patch was even started, which forced a harness bug-fix detour.

## Workflow Repetition

- repeated_workflow: fast-forward the parent first before deciding whether any remaining sibling-repo improvements still need extraction.
- custom_script: none

## Codify Candidates

- candidate: target=history; record that guardian review must honor configured `harnessCore` globs rather than blanket `.harness/**` prefixes.

## Guidance Impact

- none. This repair only updates harness code and test coverage.

## Outcome

The sibling-repo audit confirmed most portable improvements were already landed
on April 1-2. Current work narrowed to a real parent regression fix: make the
guardian ignore context-artifact churn and rerun the harness loops on the
result.

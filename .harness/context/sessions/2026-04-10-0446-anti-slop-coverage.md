---
date: "2026-04-10"
started_at: "2026-04-10T04:46:37.891Z"
tags:
  - "#harness"
  - "#quality"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-04-10-expand-anti-slop-coverage.md"
skills_used:
  - "add-new-skill"
  - "codify-learnings"
  - "merge-main-open-pr"
  - "merge-pr"
---

# anti-slop-coverage

## Summary

Expanded anti-slop coverage beyond root-doc and cleanup hygiene by adding a
broader `anti-slop-review` skill and wiring the existing preflight/review flow
to cover the non-API slop families the user cared about.

## User Intent

Ignore API/package-grounding concerns, but make sure the rest of the recurring
AI-slop patterns are covered and then land the change through a PR merge.

## Timeline

- [seq-01] user: Asked which common anti-slop patterns were already covered versus not covered and asked for thorough research.
- [seq-02] assistant: Mapped the current repo coverage against the broader recurring pattern families and reported that surface clutter and local cleanup were covered, while robustness, security, tests, architecture, docs drift, and performance were not explicitly covered.
- [seq-03] user: Said they did not care about API/package issues and wanted everything else covered.
- [seq-04] assistant: Ran `harness:prep`, reviewed the current anti-slop skills plus PR/merge workflow skills, created this session and the linked meta entry, and moved the work onto a real branch.
- [seq-05] assistant: Added a new `anti-slop-review` skill for broader post-implementation review, expanded `anti-slop-preflight` to route work into it, and updated `review-skill` so the standard handoff bundle now includes that broader anti-slop pass before `refine-code`.
- [seq-06] assistant: Ran `harness:prep`, `harness:iterate`, `harness:post`, and `harness:post -- --staged` to verify the combined anti-slop cleanup plus coverage-expansion diff before committing.

## Corrections & Thrash

- user_correction: [seq-03] The user explicitly excluded API/package-grounding concerns from scope while asking for the remaining recurring anti-slop families to be covered.
- agent_correction: none
- process_issue: none
- thrash: none

## Workflow Repetition

- repeated_workflow: keep the always-on agent rule short, put the detailed decision tree in a dedicated skill, and make the standard review bundle call that skill so coverage expands without bloating the entrypoint docs.
- repeated_workflow: when a new quality concern has both preflight and postflight pieces, split them into an entrypoint chooser plus a diff-review skill instead of overloading one checklist with incompatible timing.
- custom_script: used `rg` plus targeted reads of the current skill set and recent history/session artifacts before widening the anti-slop contract.

## Codify Candidates

- candidate: target=skill; description=Keep anti-slop as a layered system: preflight for surface ownership and fake leverage, postflight review for semantic/structural slop, and refine-code for local cleanup.

## Guidance Impact

- Added `anti-slop-review`, expanded `anti-slop-preflight`, and updated
  `review-skill` so the broader anti-slop review becomes part of the standard
  final pass.

## Outcome

The repo now has explicit coverage for the non-API anti-slop families the user
prioritized: dead code, docs drift, robustness, security, test quality,
architecture drift, and performance/resource handling. Verification is clean,
and the remaining work is to commit, open a PR, and merge it.

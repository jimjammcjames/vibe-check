---
date: "2026-03-26"
started_at: "2026-03-26T08:55:41.589Z"
tags:
  - "#harness"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-03-26-canonical-harness-refresh.md"
skills_used:
  - "NONE"
---

# canonical-harness-refresh

## Summary

Upgraded the stale canonical harness to absorb the most reusable improvements
that independently emerged in the active sibling repos, then validated the new
workflow inside the canonical repo itself.

## User Intent

Identify the common harness evolutions across the related repos, order them by
leverage, port the most valuable portable pieces into this canonical version
first, and finish with a concrete summary plus next-step recommendations.

## Timeline

- [seq-01] user: asked which common improvements from the sibling repos should be brought into the canonical harness.
- [seq-02] assistant: compared the canonical repo against the newer harness surfaces in the sibling repos and ordered the likely ports by leverage.
- [seq-03] assistant: implemented session artifacts, staged commit-intent checks, provider fallback, Copilot support, and doc/config refreshes.
- [seq-04] assistant: updated harness tests, installed missing local dependencies, and reran targeted verification.

## Corrections & Thrash

- user_correction: none
- agent_correction: [seq-04] `harness:new:meta` ran before the new session was visible because both commands were launched in parallel, so the history entry had to be linked to the session manually afterward.
- process_issue: [seq-04] local verification was initially blocked because `npm install` had not been run in this workspace and `tsx` was missing.
- thrash: none

## Workflow Repetition

- repeated_workflow: compare the canonical repo against the most current sibling repos, extract the shared improvements, then port the portable subset before touching repo-specific governance ideas.
- custom_script: none

## Codify Candidates

- candidate: target=history; capture the canonical adoption order so future harness refreshes start from an explicit prioritized backlog instead of a fresh repo tour.
- candidate: target=agents; teach agents not to launch session creation and linked history creation in parallel when immediate linkage matters.

## Outcome

The canonical harness now includes the highest-leverage common evolutions:
v3 history artifacts, session artifacts, staged commit-intent enforcement,
provider fallback, GitHub Copilot support, local override config, refreshed
docs, and targeted regression tests for the new CLI and policy behavior.

---
date: "2026-04-06"
started_at: "2026-04-06T00:38:59.948Z"
tags:
  - "#harness"
  - "#docs"
  - "#workflow"
related_history:
  - ".harness/context/history/2026-04-06-proactive-anti-slop-guardrails.md"
skills_used:
  - "add-new-skill"
  - "codify-learnings"
---

# anti-slop-doc-cleanup

## Summary

Removed the orphaned root research docs, added a proactive anti-slop preflight
skill, and refined the docs so the always-on rule lives in `AGENTS.md` while
the detailed preflight logic stays in the skill instead of the `Harness.md`
MUST block.

## User Intent

Explain the random report files at repo root, remove the orphaned ones, and
make the anti-slop behavior broader and more proactive than the existing
reactive cleanup workflow.

## Timeline

- [seq-01] user: Asked what the random report files at repo root were, wanted a broader AI-slop review, and asked whether the repo already had a skill for slop detection.
- [seq-02] assistant: Ran `harness:prep`, inspected the root files, read the relevant skills, and traced the report docs back to the canonical harness refresh commit plus linked history.
- [seq-03] assistant: Found that the root reports were tracked historical memos with no inbound references from the real operator docs, and that the closest existing slop help was the reactive `refine-code` skill.
- [seq-04] user: Asked to remove the orphaned docs and asked how to make anti-slop behavior proactive instead of reactive.
- [seq-05] assistant: Created a linked session and meta entry, then removed the three root memos and added a new `anti-slop-preflight` skill plus canonical-surface rules in the prep-time docs and setup guide.
- [seq-06] assistant: Re-ran `harness:prep` to sync the generated skills overview and confirm the new preflight guidance shows up before implementation work starts.
- [seq-07] user: Asked to refine the change by removing the extra `Harness.md` instructions and making the `AGENTS.md` rule simply point to `anti-slop-preflight`.
- [seq-08] assistant: Removed the `Harness.md` anti-slop section, simplified the `AGENTS.md` rule to a skill pointer, and updated the linked history/session artifacts to describe the final contract.

## Corrections & Thrash

- user_correction: [seq-04] The user chose removal over leaving the root memos in place as background artifacts and pushed for proactive anti-slop behavior rather than a purely review-time cleanup pass.
- user_correction: [seq-07] The user preferred a lighter always-on surface, keeping the durable rule as an `AGENTS.md` pointer to the skill rather than expanding the `Harness.md` MUST block.
- agent_correction: none
- process_issue: none
- thrash: none

## Workflow Repetition

- repeated_workflow: when the repo accumulates background research at the root, move the durable rule into the canonical entrypoint surfaces and delete the leftover memo instead of inventing another explanatory layer.
- repeated_workflow: when a quality concern is recurring, pair the reactive cleanup skill with a proactive preflight that runs before new surfaces or abstractions are created.
- custom_script: used `rg`, `git log`, and targeted history/session reads to verify whether the root docs were true entrypoints or retained research artifacts before deleting them.

## Codify Candidates

- candidate: target=skill; description=Add a proactive anti-slop preflight that maps canonical surfaces before new docs, helpers, commands, or workflow files are introduced.

## Guidance Impact

- Added a new `anti-slop-preflight` skill, added canonical-surface rules to
  `AGENTS.md`, updated `.harness/setup/AGENT-SETUP.md`, and clarified in
  `README.md` that background rationale belongs in
  `.harness/context/history/*` instead of repo-root memos.

## Outcome

The repo root now only carries stable entrypoints and reference docs, and the
canonical harness has an explicit proactive anti-slop path: `AGENTS.md` points
agents to `anti-slop-preflight`, the skills overview advertises it, and
`refine-code` still handles the reactive cleanup pass after implementation.

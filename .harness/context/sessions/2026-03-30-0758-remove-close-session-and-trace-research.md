---
date: "2026-03-30"
started_at: "2026-03-30T07:58:32.361Z"
tags:
  - "#harness"
  - "#research"
related_history:
  - ".harness/context/history/2026-03-30-simplify-session-lifecycle-and-trace-adoption-research.md"
skills_used:
  - "NONE"
---

# remove-close-session-and-trace-research

## Summary

Removed the close-session lifecycle from the canonical harness, fixed a
repo-relative session-linking regression, and used the historical traces across
the sibling repos to separate portable harness evolutions from repo-specific
governance.

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

## Corrections & Thrash

- user_correction: [seq-03] The user explicitly rejected the active/closed lifecycle and asked to keep session data without any close step.
- agent_correction: [seq-08] The new meta entry exposed that `session_refs` were being written as absolute filesystem paths, so the CLI and tests were corrected before continuing.
- process_issue: none
- thrash: none

## Workflow Repetition

- repeated_workflow: when porting harness behavior from sibling repos, read the real session/history traces first and separate portable workflow primitives from repo-specific runtime governance before changing canonical docs or gates.
- repeated_workflow: when a harness-core change touches artifact shape or linking, update the CLI, docs, templates, and at least one regression test in the same pass.
- custom_script: used `rg`, `sed`, and targeted cross-repo trace counts over `moves`, `moves-algorithm`, `life.exe`, and `mooo` so the adoption decision was grounded in the actual artifacts rather than README summaries alone.

## Codify Candidates

- candidate: target=agents; description=When a sibling repo shows a repeated pattern, port only the repo-agnostic workflow primitive into canonical and keep host/runtime governance behind optional adapters unless multiple repos converge on the same portable contract.

## Outcome

The canonical harness no longer has `close:session` or active/closed session
state, session linking now stays repo-relative, and the repo now includes a
trace-backed memo that separates portable harness patterns from `life.exe` and
`mooo` runtime-specific governance.

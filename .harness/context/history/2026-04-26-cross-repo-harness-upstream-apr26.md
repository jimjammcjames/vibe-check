---
date: "2026-04-26"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "detached worktree safety"
  - "tripwire cleanup leaked worktree"
  - "repo agents guidance review scope"
  - "unresolved churn audit"
  - "durable automation registry statuses"
related_entries:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
  - ".harness/context/history/2026-04-12-cross-repo-portability-uplift.md"
affected_files:
  - ".harness/framework/scripts/agent-code-review.mjs"
  - ".harness/framework/scripts/base-tripwire.mjs"
  - "AGENTS.md"
  - "harness-tests/tests/agent-code-review.test.mjs"
  - "harness-tests/tests/base-tripwire.test.mjs"
  - "workflows/skills/detached-worktree-safety/SKILL.md"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/find-regressions/SKILL.md"
  - "workflows/skills/review-code/SKILL.md"
  - "workflows/skills/review-memory-coherence/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-26-1351-cross-repo-harness-upstream-apr26.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
  - "#automation"
---

# cross-repo-harness-upstream-apr26

## Summary

Finished the next portability layer on top of the earlier April 12 extract by
adding detached-worktree landing guidance, hardening base-tripwire cleanup,
expanding the portable audit/automation skills, and tightening the reviewer
context contract so the staged repo guidance filename matches the prompt's
scratch-sandbox semantics.

## Context

The attached `main` checkout already carried an unlanded April 12 portability
diff covering shared local overrides, reviewer context staging, undocumented
detector scoping, and the first external-guidance adaptation rules. This April
26 pass revisited the sibling repos plus their recent harness history and
compound-automation context to decide what still remained worth upstreaming
into the canonical parent.

The strongest remaining generic signals came from three places:

- `moves`: keep/link/merge/cut adaptation rules and the still-useful
  `behavior-preserving-refactor` playbook were already present in the dirty
  April 12 diff, but the repo also reinforced the value of richer review
  context and explicit PR/readiness guardrails.
- `life.exe`: detached-worktree safety, bounded fail-closed review behavior,
  and automation-registry status vocabulary were the clearest portable wins.
- the local April 19 snapshot plus `compound` automation memory: base-tripwire
  cleanup could still leak temporary worktrees on early exits, and the parent
  still lacked the generic unresolved-churn / durable-automation guidance that
  had proven useful in recurring multi-repo audits.

## Technical Decision

Keep the older April 12 portability subset as its own linked meta thread and
land a narrow April 26 follow-up for the new improvements rather than widening
the earlier entry again.

Port only the repo-agnostic pieces that were still missing from the parent:

- add `detached-worktree-safety` as a first-class portable skill for moving
  durable work off detached snapshots before commit/rebase/push/merge steps
- harden `base-tripwire` so validation-discovery failures and early result
  branches return through `finally`, allowing temporary tripwire worktrees to
  be removed reliably, and update the integration test to prove cleanup with a
  commit SHA instead of a persistent scratch ref
- rename the staged repo guidance file in `agent-code-review` from `AGENTS.md`
  to `REPO_AGENTS_GUIDANCE.md` so scratch reviewers do not confuse it with a
  live control file, while keeping the richer touched/inherited context packet
  added in the earlier portability subset
- expand `find-regressions` with rolling-seven-day unresolved churn, hidden
  state inspection, and follow-up category reruns
- expand `durable-surface-contracts` with the abstract automation-registry
  fields and shared status vocabulary (`active`, `ready`, `paused`)
- strengthen `review-memory-coherence` so it can flag stale umbrella-entry
  reuse and sessions that read complete while still claiming active status

Deliberately skip the still-not-yet-generic ideas surfaced by the sibling
repos this week: the `moves` runtime bridge and safe Jest wrapper, the
`moves-algorithm` manifest-driven shared contract runner, and `life.exe`'s
feature/monitor/suite registry model plus its bounded push-review provider
plumbing. Those patterns look promising, but they still need a cleaner parent
abstraction pass instead of a direct import.

## Security & Integrity Impact

These changes strengthen fail-closed review and validation behavior without
weakening the harness contract. The reviewer prompt now receives repo guidance
under an intentionally non-magical filename, reducing the chance that a
scratch reviewer mistakes staged context for a live repo instruction surface.
The tripwire hardening keeps temporary worktrees from persisting after early
exit paths, which lowers the risk of stale synthetic worktree state affecting
later validations. The expanded skills also make durable automation ownership,
hidden-state audits, and detached-worktree landings more explicit before risky
git or runtime actions occur.

## Conformance & Enforcement

Validation on the final candidate reached these checkpoints:

- `node --import tsx --test harness-tests/tests/agent-code-review.test.mjs harness-tests/tests/base-tripwire.test.mjs harness-tests/tests/git-state.test.mjs harness-tests/tests/harness-config.test.mjs harness-tests/tests/undocumented-detector.test.mjs`
- `npm run harness:prep`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci` reached `harness-guardian` and then blocked on provider/runtime environment rather than on a diff failure: Gemini produced no guardian verdict, and the Codex fallback could not use `~/.codex/sessions` or refresh auth/model metadata in this sandbox.

The focused suite exercised the reviewer packet helpers, the shared
git-common-dir config merge, undocumented-detector documentation scope, and
the full base-tripwire cleanup path.

## Guidance Impact

`AGENTS.md` gained the generated skill-overview entries for
`detached-worktree-safety` plus the updated portability skill summaries.
`review-code`, `find-regressions`, `durable-surface-contracts`, and
`review-memory-coherence` now reflect the broader parent contract discovered in
the sibling repos, while `detached-worktree-safety` makes the repeated
automation-worktree landing rule discoverable as a reusable playbook.

## Raw Notes

- Repo investigators found useful patterns in all three sibling repos, but only
  `moves` and `life.exe` contributed changes that were ready to land directly
  in the parent this round.
- The attached primary checkout already held the unlanded April 12 portability
  subset, so this entry intentionally documents only the follow-up layer added
  on April 26 rather than re-explaining the earlier subset.
- The `base-tripwire` integration suite is materially slower than the other
  focused harness tests because it provisions sandbox and tripwire worktrees;
  the full focused run completed in about 141 seconds.

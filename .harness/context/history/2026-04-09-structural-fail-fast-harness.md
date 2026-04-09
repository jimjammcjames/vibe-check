---
date: "2026-04-09"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "bootstrap preflight"
  - "named branch guard"
  - "harness meta rule"
  - "strict session placeholders"
  - "structural fail fast harness"
related_entries:
  - ".harness/context/history/2026-04-02-abstract-meta-codification-behaviors.md"
  - ".harness/context/history/2026-04-03-user-preferences-smoke-fix.md"
  - ".harness/context/history/2026-04-05-close-open-harness-audit-issues.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/cli/harness.mjs"
  - ".harness/framework/lib/bootstrap-preflight.mjs"
  - ".harness/framework/lib/git-state.mjs"
  - ".harness/framework/lib/review-coverage.mjs"
  - ".harness/framework/scripts/bootstrap-preflight.mjs"
  - ".harness/framework/scripts/agent-memory-coherence.mjs"
  - ".harness/framework/scripts/policy-audit.mjs"
  - ".harness/framework/scripts/require-named-branch.mjs"
  - ".harness/setup/AGENT-SETUP.md"
  - ".harness/setup/README.md"
  - "AGENTS.md"
  - "harness-tests/helpers/harness-cli-helpers.mjs"
  - "harness-tests/tests/bootstrap-preflight.test.mjs"
  - "harness-tests/tests/git-state.test.mjs"
  - "harness-tests/tests/agent-memory-coherence.test.mjs"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/policy-audit.test.mjs"
  - "harness-tests/tests/provider-selection.test.mjs"
  - "package.json"
  - ".nvmrc"
  - "workflows/skills/history-first-branch-merge/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
  - "workflows/skills/merge-pr/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-09-1901-structural-fail-fast-harness.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
---

# structural-fail-fast-harness

## Summary

Closed the remaining structural churn from the unresolved audit by moving the
runtime contract and harness-meta/context completeness rules to earlier
deterministic gates, centralizing detached-HEAD recovery behind one helper, and
splitting shared logic out of the broad CLI/test hotspots.

## Context

The April 2, 2026 through April 9, 2026 churn audit found the same kinds of
late failures recurring across setup drift, missing `#harness-meta` provenance,
placeholder history/session artifacts, detached worktree recovery, and broad
hotspot files that absorbed too many unrelated follow-up fixes. The user asked
for simple durable solutions that generalize cleanly, not more commentary or
more late-stage branch-specific reminders.

## Technical Decision

Make the harness enforce the contract where the information is already known.
Concretely, the repo now declares a Node/npm runtime contract in
`package.json#engines` plus `.nvmrc`, shares one bootstrap-preflight analyzer
across the CLI and the standalone diagnostic script, moves harness-core
provenance checks into `policy-audit`, treats blank structured session bullets
and blank codify candidates as ordinary `post` failures, exposes one
`require-named-branch` helper for skills and operators, and extracts reusable
review-coverage / harness-cli test helpers so repeated follow-ups stop piling
into the same broad files. The same pass also fixes `agent-memory-coherence`
to stage linked session artifacts explicitly, matching the skill contract that
already expected `SESSIONS.txt`.

## Security & Integrity Impact

These changes strengthen integrity by failing earlier without weakening any
gate. Wrong runtimes and missing dependencies are rejected before deeper
harness stages run, harness-core diffs can no longer reach CI without explicit
`#harness-meta` provenance, skeletal context artifacts stop pretending to be
valid evidence during normal `post`, and PR/merge workflows now rely on one
deterministic named-branch recovery path instead of ad hoc detached-HEAD
cleanup.

## Conformance & Enforcement

`harness.mjs` now runs bootstrap preflight internally for `prep`, `post`, and
`ci`, while `.harness/framework/scripts/bootstrap-preflight.mjs` remains the
standalone diagnostic surface for operators who want to probe setup directly.
`policy-audit.mjs` now enforces Rule `M` for harness-core diffs, always
requires `Guidance Impact` on v3 history entries, and rejects blank structured
session bullets plus blank codify-candidate descriptions during ordinary
validation. `agent-memory-coherence.mjs` now stages linked session artifacts
for changed history entries and can be imported safely for unit tests. The test
suite now covers bootstrap-preflight analysis, named-branch state detection,
direct CLI preflight wiring, the harness-meta rule, linked-session staging for
memory coherence, and the stricter session/history placeholder checks.

## Guidance Impact

Added a durable rule to `AGENTS.md` preferring elegant structural fixes that
move invariants earlier or centralize them behind shared helpers, updated
`.harness/Harness.md` and the setup docs to explain the runtime contract and
fail-fast operator path, and changed the branch/merge skills to call the shared
named-branch helper instead of carrying their own detached-HEAD recipes.

## Raw Notes

- Validation passed with:
  `source ~/.nvm/nvm.sh && nvm use 20 >/dev/null && npm run test:local`
- The canonical harness loop reached green through:
  `source ~/.nvm/nvm.sh && nvm use 20 >/dev/null && npm run harness:iterate`
- Final verification passed with:
  `source ~/.nvm/nvm.sh && nvm use 20 >/dev/null && npm run harness:post`
  `source ~/.nvm/nvm.sh && nvm use 20 >/dev/null && npm run harness:post -- --staged`
  `source ~/.nvm/nvm.sh && nvm use 20 >/dev/null && npm run harness:ci`
- The change intentionally replaces npm-script preflight wrappers with a single
  CLI-owned boundary so direct `node .harness/framework/cli/harness.mjs prep`
  callers see the same runtime contract as `npm run harness:prep`.

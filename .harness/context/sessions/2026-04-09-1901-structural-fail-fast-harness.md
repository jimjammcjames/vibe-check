---
date: "2026-04-09"
started_at: "2026-04-09T19:01:54.790Z"
tags:
  - "#harness"
  - "#workflow"
  - "#fail-fast"
related_history:
  - ".harness/context/history/2026-04-09-structural-fail-fast-harness.md"
skills_used:
  - "codify-learnings"
  - "durable-surface-contracts"
---

# structural-fail-fast-harness

## Summary

Implemented the structural fail-fast harness hardening pass: a shared bootstrap
preflight now gates canonical harness commands, a shared named-branch helper
owns detached-HEAD recovery, policy audit enforces harness-meta provenance and
filled context artifacts earlier, and the operator docs now explicitly prefer
simple structural fixes over reactive late-stage patches.

## User Intent

Implement the durable solutions from the unresolved churn audit end-to-end,
update the repo guidance to prefer elegant structural fixes, and carry the
validated change all the way through PR open and merge instead of stopping at
analysis.

## Timeline

- [seq-01] user: asked for durable, simple solutions to the unresolved harness churn categories, explicitly preferring fixes that generalize well and fail deterministically.
- [seq-02] assistant: reviewed the current harness enforcement surfaces plus the linked audit artifacts and proposed a structural plan centered on earlier gates, shared helpers, and doc-backed workflow contracts.
- [seq-03] user: asked to implement the whole plan, update `AGENTS.md` to prefer elegant structural fixes over reactive ones, then open a PR and merge it.
- [seq-04] assistant: ran `npm run harness:prep`, reviewed the codification skills, created this linked session and the matching `#harness-meta` entry, and moved the detached checkout onto the working branch before durable edits.
- [seq-05] assistant: added the runtime contract (`.nvmrc`, `package.json#engines`), a shared bootstrap-preflight library and script, a shared git-state / named-branch helper, and new tests covering both surfaces.
- [seq-06] assistant: moved the bootstrap preflight into the harness CLI itself so `prep`, `post`, and `ci` share one canonical enforcement boundary, simplified the npm scripts back to direct CLI entrypoints, and extracted shared review-coverage helpers plus CLI test helpers to reduce hotspot churn.
- [seq-07] assistant: tightened `policy-audit.mjs` so harness-core diffs require `#harness-meta`, v3 entries always need `Guidance Impact`, sessions fail on blank structured bullets during ordinary `harness:post`, and codify-candidate placeholders are rejected deterministically.
- [seq-08] assistant: updated `.harness/Harness.md`, setup docs, `AGENTS.md`, and merge-related skills so the runtime contract, structural-fix preference, and canonical named-branch recovery are visible where operators actually work.
- [seq-09] assistant: installed dependencies under Node 20, fixed the one stale decision-entry fixture plus the missing blank-candidate validation case uncovered by the stricter rules, and reran `npm run test:local` until the full local suite passed.
- [seq-10] assistant: ran `npm run harness:iterate` to normalize the working tree, then backfilled this session and the linked meta entry so the stricter context rules describe the final diff rather than a scaffold placeholder.
- [seq-11] assistant: the first full `harness:ci` rerun failed once on a Prettier drift in `harness-cli.test.mjs`, which was normalized with `npm run harness:iterate`; the second CI run then reached `agent-memory-coherence.mjs` and exposed that the reviewer prompt expected `SESSIONS.txt` even though the script only staged `DIFF.txt` and `ENTRIES.txt`.
- [seq-12] assistant: fixed `agent-memory-coherence.mjs` to stage linked session artifacts explicitly, made the script import-safe so its helpers can be unit tested, added a regression test for linked and missing session refs, and reran `npm run test:local` successfully.
- [seq-13] assistant: reran `npm run harness:post`, `npm run harness:post -- --staged`, and `npm run harness:ci`; the final full gate passed cleanly once the memory-coherence input contract and the last formatting drift were corrected.

## Corrections & Thrash

- user_correction: none
- agent_correction: the first strict-policy test rerun exposed a stale decision-entry fixture that still reflected the older schema and a missing check for blank codify-candidate descriptions, so the fixture and validator were updated together to match the intended earlier-fail contract.
- process_issue: the workspace started on detached `HEAD` and the local environment was still on Node 18 without installed dependencies, so truthful validation required moving onto a real branch, switching to Node 20, and running `npm ci` before the harness loop.
- thrash: after the stricter session and meta rules were enabled, the intentionally skeletal context artifacts and blank codify candidate surfaced as deterministic blockers during local verification and had to be filled before staged and CI gates could pass.
- thrash: the first full CI pass also surfaced two final harness-core follow-ups after the main work was already in place: a formatting drift in `harness-cli.test.mjs` and a real `agent-memory-coherence` blind spot where linked sessions were never staged for the coherence reviewer.

## Workflow Repetition

- repeated_workflow: when the same invariant is being rediscovered late in `post`, CI, or review, move it to one earlier deterministic gate or one shared helper instead of layering another downstream reminder.
- repeated_workflow: for harness-core work, create the linked session/history artifacts early enough that later policy failures describe real gaps in the change instead of placeholder scaffolding left over from artifact creation.
- repeated_workflow: when a durable workflow needs a branch context, use one canonical named-branch recovery helper instead of repeating detached-HEAD recovery snippets across skills and docs.
- custom_script: none

## Codify Candidates

- candidate: target=agents; description=prefer the simplest structural fix that moves an invariant earlier or centralizes it behind one shared helper instead of adding another reactive late-stage patch.
- candidate: target=skill; description=merge and rebase workflows should invoke one shared named-branch guard helper so detached-HEAD recovery stays consistent across PR, merge, and branch-sync paths.
- candidate: target=history; description=session and history templates should warn clearly when scaffold bullets are intentionally incomplete so operators expect `harness:post` to reject placeholders until the artifact is filled in.

## Guidance Impact

- Added a structural-fix preference rule to `AGENTS.md`, documented the shared
  bootstrap preflight and earlier-fail philosophy in `.harness/Harness.md`,
  updated setup docs to point at the runtime contract and canonical branch
  helper, and taught merge-related skills to call the named-branch guard
  instead of carrying detached-HEAD recovery inline. The same harness-core
  pass also fixed `agent-memory-coherence.mjs` so coherence review receives the
  linked session artifacts its skill contract already expected.

## Outcome

The repo now enforces the runtime contract and context completeness closer to
the operator entrypoint, uses one shared helper for named-branch recovery, and
reduces hotspot churn in the CLI/test surfaces by moving shared logic into
dedicated modules. Local regression coverage passed through `npm run
test:local`, including the new memory-coherence regression coverage. The final
`harness:post`, staged policy gate, and full `harness:ci` run all passed on the
current branch, so the validated diff is ready for commit, push, PR creation,
and merge.

---
date: "2026-04-12"
started_at: "2026-04-12T12:04:27.374Z"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
related_history:
  - ".harness/context/history/2026-04-12-cross-repo-portability-uplift.md"
skills_used:
  - "anti-slop-preflight"
  - "add-new-skill"
  - "codify-learnings"
---

# cross-repo-harness-extract-apr12

## Summary

Reviewed the installed harness variants in `moves`, `moves-algorithm`, and
`life.exe`, compared them against the freshly updated canonical parent, and
ported only the pieces that stayed repo/platform/language agnostic after that
comparison.

## User Intent

Look through sibling repos that have this harness installed, investigate their
recent harness history plus compound-automation context in parallel, integrate
portable improvements into the generic parent, run the harness on the result,
and surface the still-too-specific ideas that should wait.

## Timeline

- [seq-01] user: requested a cross-repo extract across `moves`, `moves-algorithm`, and `life.exe`, explicitly allowing subagents and asking that only generalizable improvements be integrated.
- [seq-02] assistant: ran `npm run harness:prep`, reviewed prior extract memory and the repo's existing portability history/session artifacts, and launched one explorer per sibling repo.
- [seq-03] assistant: inspected the shared `compound` automation plus sibling AGENTS, skills, and recent harness entries while the explorers gathered repo-specific evidence.
- [seq-04] assistant: created this session and a linked meta history stub before editing harness-core files, docs, and skills.
- [seq-05] assistant: discovered local `main` was stale, fetched `origin/main`, and fast-forwarded to the new upstream anti-slop/fail-fast baseline before keeping any new portability work.
- [seq-06] assistant: re-triaged the portability candidates against the refreshed base, then implemented the reviewer-context, undocumented-detector, shared-local-config, and skill/doc changes that still remained missing.
- [seq-07] assistant: fixed a real dogfooding regression when importing `undocumented-detector.mjs` into a unit test triggered the script main path, then reran the focused harness suite under Node 20.
- [seq-08] assistant: ran `harness:iterate`, `harness:post`, and `harness:post -- --staged` successfully, then chased the remaining `harness:ci` blocker through Gemini, Copilot, and Codex provider paths.

## Corrections & Thrash

- user_correction: none
- agent_correction: after fast-forwarding `main`, re-scoped the planned ports because upstream had already landed the broader anti-slop and fail-fast improvements that would otherwise have duplicated this pass.
- process_issue: the first attempt to fast-forward `main` hit a transient `.git/index.lock`, so the sync had to be retried after confirming the stale lock was gone.
- thrash: the first focused undocumented-detector test imported the script and accidentally ran the real provider path because the file still executed `main()` on import; the fix was to add the same direct-execution guard pattern already used by other harness scripts and rerun the suite.
- thrash: the final outer-loop blocker was environmental rather than diff-shaped, so the run had to probe multiple provider paths (`gemini`, `copilot`, `codex` with repo-local `CODEX_HOME`) before concluding the sandbox still could not complete guardian review.

## Workflow Repetition

- repeated_workflow: reran `harness:prep` after the upstream fast-forward and again after the skill additions so the generated AGENTS skills overview stayed aligned with the final change set.
- custom_script: used targeted `node --test ...` runs for the touched harness surfaces before moving up to the full harness ladder.

## Codify Candidates

- candidate: target=skill; preserve a dedicated behavior-preserving refactor workflow whenever structural cleanup can silently remount legacy or experiment-era behavior.
- candidate: target=agents; keep external workflow ingestion as an explicit keep/link/merge/cut adaptation pass instead of a straight copy.
- candidate: target=history; keep cross-repo portability extractions in one linked meta thread that records both what was ported and which repo-specific ideas were intentionally deferred.

## Guidance Impact

- Updated `AGENTS.md`, `.harness/Harness.md`, and `.harness/setup/*` with the
  new adaptation/original-request/shared-override guidance.
- Expanded `add-new-skill`, `codify-learnings`, and `review-code`, and added
  `behavior-preserving-refactor`.
- Left manifest-driven shared contracts, feature catalogs, and merge-carried
  history-audit exceptions out of scope and recorded that decision in the
  linked meta entry.

## Outcome

The final kept diff ports four durable improvements into the generic parent:
reviewer input staging now matches the prompt contract, undocumented-detector
scope now matches deterministic policy scope, shared local harness overrides
can be layered across linked worktrees, and the repo now carries the portable
skill/codification guidance that was still missing here. The remaining ideas
from `moves-algorithm` and `life.exe` were judged structurally promising but
still too domain-shaped to land in this parent without a larger abstraction
pass. The medium loop and staged gate passed, while the full outer loop stopped
at provider/runtime issues in `harness-guardian` rather than on a diff failure.

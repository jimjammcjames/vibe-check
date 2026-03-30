---
date: "2026-03-30"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "remove close session canonical harness"
  - "session lifecycle without active closed state"
  - "cross repo trace research keep vs avoid"
  - "repo relative session refs"
related_entries:
  - ".harness/context/history/2026-03-26-canonical-harness-refresh.md"
affected_files:
  - ".gitignore"
  - ".harness/Harness.md"
  - ".harness/framework/cli/harness.mjs"
  - "README.md"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "CANONICAL_HARNESS_TRACE_RESEARCH.md"
  - "package-lock.json"
session_refs:
  - ".harness/context/sessions/2026-03-30-0758-remove-close-session-and-trace-research.md"
tags:
  - "#harness-meta"
  - "#research"
---

# simplify-session-lifecycle-and-trace-adoption-research

## Summary

Simplified the canonical session model by removing close-session lifecycle
state, fixed repo-relative session linking, and captured a trace-backed
bring-vs-avoid adoption memo from `moves`, `moves-algorithm`, `life.exe`, and
`mooo`.

## Context

The user explicitly rejected the active/closed session lifecycle as stale,
stating that the data mattered but the close step did not. The earlier
canonical refresh had ported that lifecycle from the `moves` lineage, but the
historical traces showed the real value was the task notebook content while the
status bit mostly surfaced as session-selection friction. Creating this task's
own meta entry also exposed a portability regression: `session_refs` were being
written as absolute filesystem paths rather than exact repo-relative artifact
paths.

## Technical Decision

Keep sessions as append-only task notes with `started_at`, linked history,
timeline, corrections, workflow repetition, codify candidates, and outcome, but
remove `close:session`, `ended_at`, and any active/closed enforcement from the
canonical contract. Preserve session linking via same-day auto-detection or
explicit `--session-slug`, and normalize discovered session files back to
repo-relative paths before writing `session_refs`. Capture the cross-repo trace
research in a dedicated memo that recommends keeping staged commit intent,
structured corrections, workflow/codify sections, provider flexibility, and
optional parallel local reviews while explicitly leaving `life.exe` and `mooo`
runtime governance out of core canonical behavior.

## Security & Integrity Impact

This simplifies operator state without weakening provenance. Commit-time context
still requires staged history plus staged session coverage, but there is no
longer a brittle lifecycle bit to drift out of sync with reality. Normalizing
`session_refs` back to repo-relative paths strengthens portability and keeps
staged matching deterministic across worktrees and machines. The trace memo
also reduces the risk of importing host-specific governance into a repo-agnostic
harness by default.

## Conformance & Enforcement

- Removed `close:session` and active/closed session semantics from the
  canonical CLI and docs surface.
- Kept `new:session`, but documented sessions as append-only task notes with no
  close step.
- Fixed the CLI so discovered sessions are normalized back to exact
  repo-relative `session_refs`.
- Added regression coverage proving a same-day session auto-links into a new
  meta entry with repo-relative session refs and a matching session backlink.
- Added `CANONICAL_HARNESS_TRACE_RESEARCH.md` so future ports can distinguish
  portable harness primitives from repo-specific runtime governance.
- Restored the committed npm lockfile expected by the GitHub Actions workflow by
  unignoring `package-lock.json` and keeping it tracked with the canonical
  harness repo.

## Raw Notes

- `moves`: 210 session files, 210 codify-candidate sections, 26 traces
  mentioning multi-session ambiguity or related `--session-slug` friction.
- `life.exe`: 52 session files, 50 workflow-note sections, and repeated
  validation patterns around runtime boundaries, canary checks, remote-first
  landing, and broker contracts.
- `moves-algorithm`: confirms the "keep the shared framework, adapt only the
  repo-owned execution surface" porting pattern.
- `mooo`: contributes remote-runtime, upmerge, and Copilot-production ideas, but
  not a better local history/session contract than the `moves` lineage.
- PR follow-up root cause: `.github/workflows/harness.yml` uses
  `actions/setup-node` with `cache: npm`, so excluding `package-lock.json`
  breaks the workflow before `npm ci` or `npm run harness:ci` even start.

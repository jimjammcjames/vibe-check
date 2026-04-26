---
date: "2026-04-12"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness portability"
  - "original request review context"
  - "git common dir config local"
  - "undocumented detector non real code"
  - "behavior preserving refactor"
related_entries:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
  - ".harness/context/history/2026-04-05-close-open-harness-audit-issues.md"
  - ".harness/context/history/2026-04-10-expand-anti-slop-coverage.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/lib/git-state.mjs"
  - ".harness/framework/lib/harness-config.mjs"
  - ".harness/framework/scripts/agent-code-review.mjs"
  - ".harness/framework/scripts/undocumented-detector.mjs"
  - ".harness/setup/AGENT-SETUP.md"
  - ".harness/setup/README.md"
  - "AGENTS.md"
  - "harness-tests/tests/agent-code-review.test.mjs"
  - "harness-tests/tests/git-state.test.mjs"
  - "harness-tests/tests/harness-config.test.mjs"
  - "harness-tests/tests/undocumented-detector.test.mjs"
  - "workflows/skills/add-new-skill/SKILL.md"
  - "workflows/skills/behavior-preserving-refactor/SKILL.md"
  - "workflows/skills/codify-learnings/SKILL.md"
  - "workflows/skills/review-code/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-12-1204-cross-repo-harness-extract-apr12.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
---

# cross-repo-portability-uplift

## Summary

Ported the most generalizable remaining harness improvements from sibling repos
by teaching the code reviewer to consume the full context packet it already
claims to use, aligning undocumented-diff scope with deterministic policy
rules, layering repo-shared local harness overrides beneath per-worktree
overrides, and carrying forward the portable skill/codification guidance that
still fit the canonical parent after the latest upstream fast-forward.

## Context

The April 12 cross-repo extract revisited `moves`, `moves-algorithm`, and
`life.exe` after the earlier parent extractions had already landed. The
parallel repo pass plus the `compound` automation context showed three classes
of remaining parent-worthy work: smaller harness-core gaps still present in
`moves` (`HARNESS_ORIGINAL_REQUEST`, richer review context staging, and
non-real-code detector scoping), an older but still-clean worktree ergonomics
improvement from `moves` (shared git-common-dir local overrides), and a few
generic workflow skills and codification rules that were still missing here.
During implementation, `origin/main` moved and brought in a large anti-slop and
fail-fast update, so the selected portability set was re-evaluated against the
fresh base before any new work was kept.

## Technical Decision

Land only the improvements that stayed repo-agnostic after that rebase:

- Add richer agent-review input staging so `agent-code-review` now includes
  `SESSIONS.txt`, `REVIEW_SCOPE.txt`, and optional `ORIGINAL_REQUEST.txt`, with
  touched-versus-inherited labeling for history and session artifacts.
- Update the `review-code` prompt to treat `ORIGINAL_REQUEST.txt` as optional
  authoritative caller intent when present.
- Reuse `policy-audit`'s real-code classification in
  `undocumented-detector.mjs` so doc-only or exempt-only diffs skip agent
  review entirely.
- Teach `loadHarnessConfig()` to merge a shared
  `<git common dir>/.harness/config.local.yml` before the per-worktree
  `.harness/config.local.yml`.
- Port the generic workflow guidance that still fit cleanly: external
  skill/workflow adaptation rules in `add-new-skill` and `codify-learnings`,
  short always-on AGENTS rules for adaptation/codification, and a new
  `behavior-preserving-refactor` skill.

Deliberately skip the still-domain-shaped ideas surfaced by the sibling repos:
notification-contract manifests, `system/features` inventory/monitor catalogs,
and merge-carried history-audit exceptions.

## Security & Integrity Impact

These changes strengthen existing review and policy integrity without weakening
any gate. The reviewer now receives the user intent and artifact-boundary
context it already needed to judge odd-looking diffs honestly, the
undocumented-detector now follows the same deterministic real-code boundary as
policy audit instead of waking providers for exempt/doc-only changes, and the
shared local override layer keeps machine-local provider pins consistent across
linked worktrees without changing tracked repo policy.

## Conformance & Enforcement

Added focused harness coverage for the new reviewer packet helpers, the shared
config-layer merge order, the git-common-dir helper, and the
undocumented-detector scope helper. `harness:prep` now advertises the new
`behavior-preserving-refactor` skill and the updated skill summaries, while the
operator docs explain both the shared/per-worktree local override contract and
the optional `HARNESS_ORIGINAL_REQUEST` input for `agent-code-review`.

## Guidance Impact

Updated `AGENTS.md` with short invariants for adapting external workflow
guidance and codifying repeated user steering, updated `.harness/Harness.md`
plus `.harness/setup/*` to document the shared local override layer and
optional original-request reviewer input, expanded `add-new-skill` and
`codify-learnings` so external skills/docs are adapted instead of copied
verbatim, updated `review-code` so the review prompt actually uses the staged
original request, and added the new
`workflows/skills/behavior-preserving-refactor/SKILL.md` playbook.

## Raw Notes

- Sibling repo signals used for the selection:
  - `moves`: original-request reviewer context, non-real-code detector scope,
    shared git-common-dir local overrides, and the
    `behavior-preserving-refactor` workflow.
  - `moves-algorithm`: manifest-driven shared-contract checks looked promising
    structurally but were still notification-specific, so they stayed out.
  - `life.exe`: `system/features` catalog/monitor contracts and merge-carried
    history-audit exceptions were useful patterns but still needed a cleaner
    parent abstraction pass.
- Focused validation under Node 20 passed with:
  `node --test harness-tests/tests/agent-code-review.test.mjs harness-tests/tests/git-state.test.mjs harness-tests/tests/harness-config.test.mjs harness-tests/tests/undocumented-detector.test.mjs`
- The broader harness ladder passed through:
  `npm run harness:iterate`
  `npm run harness:post`
  `npm run harness:post -- --staged`
- `npm run harness:ci` reached `harness-guardian` and then blocked on
  provider/runtime availability in the sandboxed environment rather than on the
  diff itself:
  Gemini returned no guardian result, Copilot failed with local keychain
  access (`SecItemCopyMatching failed -50`), and Codex fallback only ran after
  redirecting `CODEX_HOME` into the repo but still failed on outbound API
  connectivity to `api.openai.com`.

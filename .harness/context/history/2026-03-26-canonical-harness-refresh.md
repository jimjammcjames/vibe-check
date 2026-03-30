---
date: "2026-03-26"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "canonical harness stale"
  - "staged commit intent"
  - "session artifacts"
  - "copilot provider"
related_entries:
  - "NONE"
affected_files:
  - ".harness/Harness.md"
  - ".harness/config.yml"
  - ".harness/framework/cli/harness.mjs"
  - ".harness/framework/lib/agent-runner.mjs"
  - ".harness/framework/lib/harness-config.mjs"
  - ".harness/framework/providers/copilot.mjs"
  - ".harness/framework/providers/index.mjs"
  - ".harness/framework/scripts/policy-audit.mjs"
  - ".harness/framework/templates/history-decision.md"
  - ".harness/framework/templates/history-fix.md"
  - ".harness/framework/templates/history-meta.md"
  - ".harness/framework/templates/session.md"
  - "AGENTS.md"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/policy-audit.test.mjs"
  - "package.json"
session_refs:
  - ".harness/context/sessions/2026-03-26-0855-canonical-harness-refresh.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#providers"
---

# canonical-harness-refresh

## Summary

Refreshed the canonical harness so it now carries the same high-leverage
evolutions that independently proved useful in the active sibling repos:
session artifacts, staged commit-intent checks, provider fallback, GitHub
Copilot support, local override config, and aligned operator docs.

## Context

This repo is supposed to teach the canonical harness workflow, but in practice
it had fallen behind the living versions in `moves`, `moves-algorithm`,
`life.exe`, and `mooo`. The biggest gaps were structural, not cosmetic:
history templates were still v2, there was no session artifact model, staged
commit-intent enforcement was missing, and the runtime still assumed a single
primary provider with no local override story.

## Technical Decision

Port the most portable and highest-leverage improvements first instead of
trying to absorb every repo-specific governance layer at once. Concretely, that
meant adopting the `moves`-style session and staged-context model, extending
the provider runtime with fallback plus Copilot support, and rewriting the
canonical docs and setup surfaces so they describe the real workflow.

## Security & Integrity Impact

This change strengthens provenance and reviewability rather than loosening any
gate. Staged commits now have a deterministic path to carrying both code
rationale and task/session context, while provider fallback reduces the odds
that a single unavailable CLI silently disables outer-loop review steps. The
policy audit also gained explicit validation for session artifacts and staged
coverage expectations.

## Conformance & Enforcement

The canonical repo now exposes `new:session`, `harness:post -- --staged`,
`harness:ci:codex`, and `harness:ci:copilot`; v3
history templates include `related_entries`, `affected_files`, and
`session_refs`; and policy enforcement validates both the new history schema
and the new session schema. The harness CLI and docs were updated together so
the operator entrypoint, setup docs, templates, and tests all point to the
same workflow.

## Raw Notes

- Ordered adoption doc added in `CANONICAL_HARNESS_UPGRADE_PLAN.md`.
- Full cross-repo comparison retained in `HARNESS_EVOLUTION_REPORT.md`.

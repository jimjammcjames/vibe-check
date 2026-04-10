---
date: "2026-04-06"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "anti slop preflight"
  - "orphaned root docs"
  - "canonical surface"
  - "repo root memos"
related_entries:
  - ".harness/context/history/2026-03-26-canonical-harness-refresh.md"
  - ".harness/context/history/2026-03-30-simplify-session-lifecycle-and-trace-adoption-research.md"
affected_files:
  - ".harness/setup/AGENT-SETUP.md"
  - "AGENTS.md"
  - "README.md"
  - "workflows/skills/anti-slop-preflight/SKILL.md"
  - "CANONICAL_HARNESS_TRACE_RESEARCH.md"
  - "CANONICAL_HARNESS_UPGRADE_PLAN.md"
  - "HARNESS_EVOLUTION_REPORT.md"
session_refs:
  - ".harness/context/sessions/2026-04-06-0038-anti-slop-doc-cleanup.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#docs"
---

# proactive-anti-slop-guardrails

## Summary

Removed the orphaned repo-root research memos and codified a proactive
anti-slop preflight so agents tighten the canonical surface before they add new
docs, commands, scripts, or workflow files.

## Context

The root of the canonical harness repo had accumulated three large research and
adoption memos that were historically useful but no longer functioned as live
entrypoints. They had no inbound references from the actual operator docs and
made the root feel like a mix of canonical surfaces plus leftover working
papers. At the same time, the existing anti-slop guidance was mostly reactive:
`refine-code` helped clean up a diff after implementation, but there was no
durable preflight that pushed agents to extend existing surfaces before
creating new ones.

## Technical Decision

Delete the root memos rather than relocating them, because the durable change
rationale already lives in tracked harness history and the stable operator
surfaces already summarize the current model. Add a new
`anti-slop-preflight` skill, point `AGENTS.md` at it with a short always-on
rule, and keep the more detailed surface-mapping guidance inside the skill and
setup/reference docs rather than expanding the `Harness.md` MUST block.

## Security & Integrity Impact

This change reduces surface-area drift without weakening any enforcement.
Removing orphaned root memos lowers the odds of conflicting workflow guidance,
while the new preflight guidance makes it less likely that future work lands as
duplicate docs, speculative wrappers, or root-level scratch files that linger
past the task that created them.

## Conformance & Enforcement

The generated skills overview now advertises `anti-slop-preflight` as the
proactive complement to `refine-code`, while `AGENTS.md` points operators to
the skill before they add new docs, commands, abstractions, or root-level
surfaces. The setup guide and README now point long-lived background rationale
at `.harness/context/history/*`, and the three orphaned research memos were
removed from the repo root.

## Guidance Impact

Added a short `AGENTS.md` pointer to `anti-slop-preflight`, added the new
`workflows/skills/anti-slop-preflight/SKILL.md` playbook, kept the supporting
surface-map guidance in `.harness/setup/AGENT-SETUP.md`, and clarified in
`README.md` that repo-root docs should stay limited to stable entrypoints and
reference material.

## Raw Notes

- The deleted memos were introduced together in commit `801dc8e` during the
  canonical harness refresh.
- Existing anti-slop coverage lived in `refine-code`, which is intentionally a
  post-implementation cleanup pass rather than a preflight.

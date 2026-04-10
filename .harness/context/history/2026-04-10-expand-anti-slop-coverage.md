---
date: "2026-04-10"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "anti slop review"
  - "security tests architecture performance robustness"
  - "docs drift dead code"
  - "exclude api grounding"
related_entries:
  - ".harness/context/history/2026-04-06-proactive-anti-slop-guardrails.md"
affected_files:
  - "AGENTS.md"
  - "workflows/skills/anti-slop-preflight/SKILL.md"
  - "workflows/skills/anti-slop-review/SKILL.md"
  - "workflows/skills/review-skill/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-10-0446-anti-slop-coverage.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#quality"
---

# expand-anti-slop-coverage

## Summary

Expanded the anti-slop system beyond surface-area cleanup by adding a dedicated
post-implementation `anti-slop-review` skill and wiring the existing preflight
and review bundle to cover dead code, docs drift, robustness, security, test
quality, architecture, and performance/resource handling.

## Context

The existing anti-slop contract covered canonical-surface sprawl plus local
cleanup, but it did not explicitly audit the broader recurring AI-slop
families that show up after a diff exists. The user asked to ignore API/package
grounding concerns and make sure the remaining common failure modes are covered.

## Technical Decision

Keep `anti-slop-preflight` as the lightweight always-on entrypoint, add a new
`anti-slop-review` skill for the broader semantic and structural review pass,
and update `review-skill` so the normal handoff bundle runs that broader audit
before the existing `refine-code` cleanup pass. Deliberately leave API/package
grounding out of scope for this skill because the user explicitly does not
care about that family.

## Security & Integrity Impact

This strengthens review quality without adding a brittle deterministic gate.
The new skill makes security and trust-boundary review explicit, pushes tests
toward behavior-level signal, and makes docs drift, architectural duplication,
and performance/resource regressions part of the normal anti-slop review rather
than optional intuition.

## Conformance & Enforcement

`AGENTS.md` still points operators to `anti-slop-preflight`, which now tells
them to choose the follow-up review path before they start editing.
`review-skill` now includes `anti-slop-review`, and the generated skills
overview advertises both layers during `harness:prep`.

## Guidance Impact

Added `workflows/skills/anti-slop-review/SKILL.md`, expanded
`workflows/skills/anti-slop-preflight/SKILL.md`, and updated
`workflows/skills/review-skill/SKILL.md` so the broader anti-slop review is
part of the standard final cleanup workflow.

## Raw Notes

- Included families: dead/redundant code, complexity/fake leverage, docs and
  prompt truthfulness, robustness/failure handling, security/trust boundaries,
  test signal, architecture/ownership, and performance/resource handling.
- Excluded family: API/package grounding, per the user’s explicit preference.
- Validation passed with `npm run harness:iterate`, `npm run harness:post`,
  and `npm run harness:post -- --staged`.

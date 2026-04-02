---
date: "2026-04-01"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "portable repo workflow skills"
  - "skills overview sync"
  - "generic parent harness docs"
related_entries:
  - ".harness/context/history/2026-04-02-harness-post-smoke-timeout-detection.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/cli/harness.mjs"
  - ".harness/framework/lib/skills.mjs"
  - ".harness/setup/AGENT-SETUP.md"
  - "AGENTS.md"
  - "package.json"
  - "harness-tests/tests/harness-config.test.mjs"
  - "harness-tests/tests/skills.test.mjs"
  - "workflows/README.md"
  - "workflows/skills/add-new-skill/SKILL.md"
  - "workflows/skills/codify-learnings/SKILL.md"
  - "workflows/skills/find-regressions/SKILL.md"
  - "workflows/skills/history-first-branch-merge/SKILL.md"
  - "workflows/skills/logging-best-practices/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
  - "workflows/skills/merge-pr/SKILL.md"
  - "workflows/skills/refine-code/SKILL.md"
  - "workflows/skills/review-skill/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-01-2124-extract-portable-harness-upgrades.md"
tags:
  - "#harness-meta"
---

# generic-parent-harness-upgrades

## Summary

Upgraded the generic parent harness with generated `AGENTS.md` skill overview
sync, tighter setup guidance, and a first set of portable repo-local workflow
skills so downstream repos can inherit stronger workflow primitives without
inheriting app-specific architecture rules.

## Context

`moves` and `moves-algorithm` had evolved the installed harness beyond this
parent in a few clearly reusable ways. The parent did not refresh `AGENTS.md`
from repo-local skill metadata, its durable setup guidance lagged behind the
downstream repos, and it was missing several generic workflow skills that were
already helping downstream repos codify learnings and standardize PR work.

## Technical Decision

Port only the general-purpose harness improvements that were still missing from
the parent diff: generated skills-overview syncing during `harness:prep`,
tighter setup and `AGENTS.md` guidance, direct tests for the new behavior, and
a curated set of portable workflow skills covering skill creation,
codification, regression audits, branch conflict replay, logging guidance, code
refinement, PR prep, and PR merge. Deliberately skip downstream product
architecture rules and repo-specific skills.

## Security & Integrity Impact

The generated skills overview reduces instruction drift between
`workflows/skills/` and `AGENTS.md`, while the added repo guidance makes secret
hygiene and durable workflow updates explicit in tracked docs rather than chat
history. No new secret-bearing runtime surface was added in this final diff.

## Conformance & Enforcement

The changes stay inside harness-core surfaces plus repo-local workflow docs and
are recorded as a `meta` entry with `#harness-meta`. Added harness tests cover
skills-overview generation so the new parent behavior does not regress, and the
portable skills move recurring workflow knowledge into tracked repo assets.

## Raw Notes

- Added `.harness/setup/AGENT-SETUP.md`
- Extended `skills.mjs` so `harness:prep` regenerates the AGENTS skills overview block
- Updated docs and package scripts for the portable workflow/skills experience
- Added portable skills: `add-new-skill`, `codify-learnings`, `find-regressions`, `history-first-branch-merge`, `logging-best-practices`, `merge-main-open-pr`, `merge-pr`, `refine-code`, and `review-skill`
- Added generic AGENTS rules for guidance updates, secret hygiene, and explicit live-validation reporting
- Split the later Harness CI smoke-test fix into `.harness/context/history/2026-04-02-harness-post-smoke-timeout-detection.md`
- Left session-history enforcement and app-specific architecture conventions out of scope for this parent pass

---
date: "2026-04-01"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "harness config local overrides"
  - "skills overview sync"
  - "copilot provider fallback"
related_entries:
  - "NONE"
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

Upgraded the generic parent harness with portable config loading, AGENTS skill overview generation, broader agent provider support, and a first set of portable repo skills so downstream repos can inherit stronger workflow primitives without inheriting app-specific architecture rules.

## Context

`moves` and `moves-algorithm` had evolved the installed harness beyond this parent in a few clearly reusable ways. The parent still used ad hoc YAML parsing, lacked gitignored local agent overrides, did not refresh `AGENTS.md` from repo skills, only exposed Codex and Gemini in the shared provider registry, and was missing several generic repo-local skills that downstream repos were already using to codify learnings and branch workflows.

## Technical Decision

Port only the general-purpose harness improvements into the parent: a shared YAML config loader with local override support, generated skills-overview syncing during `harness:prep`, Copilot provider registration plus fallback-provider support, tighter setup docs, direct tests for the new behavior, and a curated set of portable workflow skills covering skill creation, codification, regression audits, branch conflict replay, logging guidance, code refinement, PR prep, and PR merge. Deliberately skip downstream product architecture rules and repo-specific skills.

## Security & Integrity Impact

Local agent overrides now live in `.harness/config.local.yml`, which is gitignored so machine-specific credentials and runtime paths stay out of source control. The generated skills overview reduces instruction drift between `workflows/skills/` and `AGENTS.md`, and the added provider fallback keeps review enforcement available without weakening any harness checks.

## Conformance & Enforcement

The changes stay inside harness-core surfaces plus repo-local workflow docs and are recorded as a `meta` entry with `#harness-meta`. Added harness tests cover config-local override behavior and AGENTS skills-overview generation to keep the new parent behavior from regressing.

## Raw Notes

- Added `.harness/framework/lib/harness-config.mjs`
- Added `.harness/framework/providers/copilot.mjs`
- Added `.harness/setup/AGENT-SETUP.md`
- Extended `skills.mjs` so `harness:prep` regenerates the AGENTS skills overview block
- Updated docs and package scripts for local overrides and Copilot CI entrypoints
- Added portable skills: `add-new-skill`, `codify-learnings`, `find-regressions`, `history-first-branch-merge`, `logging-best-practices`, `merge-main-open-pr`, `merge-pr`, `refine-code`, and `review-skill`
- Added generic AGENTS rules for guidance updates, secret hygiene, and explicit live-validation reporting
- Left session-history enforcement and app-specific architecture conventions out of scope for this parent pass

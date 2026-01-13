---
date: "2026-01-13"
type: "decision"
status: "active"
schema: "v2"
search_terms:
  - "portable skills"
  - "workflows/skills"
  - "SKILL.md"
  - "reusable workflow"
related:
  - "NONE"
tags:
  - "#architecture"
---

# portable-skills-infrastructure

## Summary

Established `workflows/skills/` as the home for portable, reusable workflow bundles (skills). Each skill is a folder with a `SKILL.md` containing YAML frontmatter (`id`, `summary`) and instructions.

## Context

Agents benefit from reusable workflow bundles that encapsulate domain-specific knowledge, tool integrations, or specialized capabilities. A standard location and format makes skills discoverable and composable.

## Decision

- Skills live in `workflows/skills/<skill-name>/SKILL.md`
- Each SKILL.md has YAML frontmatter with required `id` and `summary` fields
- AGENTS.md documents the skills convention and points to the location
- A stub skill exists as a template/placeholder

## Rationale

- Centralized location under `workflows/` keeps agent-related tooling together
- YAML frontmatter enables programmatic discovery and tooling
- Simple folder structure allows skills to include additional files if needed

## Consequences

- Skills are repo-specific (not globally installed)
- Skill discovery requires reading AGENTS.md or scanning `workflows/skills/`
- Future tooling can parse SKILL.md frontmatter for skill catalogs

## Validation

Stub skill exists at `workflows/skills/stub/SKILL.md` with proper frontmatter.

## Raw Notes

Related to MCP manifests in `workflows/mcp/`.

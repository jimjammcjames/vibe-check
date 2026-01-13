# Workflows

Repo-local workflow system for portable skills and MCP manifests.

## Structure

- `skills/` — reusable workflow bundles (markdown + optional scripts/resources)
- `mcp/` — MCP server manifests (metadata only; secrets via env vars)

## Skill file format

Each `skills/<id>/SKILL.md` begins with YAML frontmatter:

```yaml
---
id: my-skill
summary: One-line description of what this skill does.
---
```

Then the markdown body with full instructions/checklists.

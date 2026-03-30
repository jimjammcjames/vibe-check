# Agent Entry Point

**→ See [.harness/Harness.md](.harness/Harness.md) for the canonical workflow doc.**

**→ Run `npm run harness:prep` to get started.**

## Canonical Loop

- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`
- `npm run harness:new:session -- --slug "task-name"`
- `npm run harness:new:entry -- --slug "change-slug" --type fix|decision|meta`

## Portable Skills

Reusable workflow bundles live in [`workflows/skills/`](workflows/skills/).

Each skill is a folder containing `SKILL.md` with YAML frontmatter:

```yaml
---
id: my-skill # kebab-case identifier (required)
summary: One-line description of what this skill does. (required)
---
```

See also: [`workflows/mcp/`](workflows/mcp/) for MCP server manifests.

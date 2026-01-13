---
date: "2026-01-11"
type: "decision"
status: "active"
schema: "v2"
search_terms:
  - "mcp-gen"
  - "mcpServers"
  - "Cursor mcp.json"
  - "Claude .mcp.json"
  - "MCP config generator"
related:
  - "NONE"
tags:
  - "#architecture"
  - "#mcp"
---

# repo-local-mcp-gen

## Summary

Created `mcp-gen`, a repo-rooted MCP config generator that reads `workflows/mcp/servers.yml` and generates tool-specific configs for Claude (`.mcp.json`), Cursor (`.cursor/mcp.json`), and Codex (CLI commands).

## Context

Multiple AI tools (Claude, Cursor, Codex) need MCP server configuration, but each uses different formats:

- Claude: JSON with `${VAR}` env placeholders
- Cursor: JSON with literal resolved values
- Codex: CLI commands for `codex mcp add`

Maintaining separate configs is error-prone and duplicative.

## Decision

Created a single canonical spec (`servers.yml`) with a generator tool that:

- Produces tool-specific outputs from one source
- Uses non-destructive merge (preserves manually-added servers)
- Handles missing env gracefully (Claude: placeholder, Cursor: skip with warning)

## Rationale

- Single source of truth eliminates drift
- Non-destructive merge allows manual additions
- Secrets never committed (Cursor config gitignored, Claude uses placeholders)
- Codex output is CLI commands, not a file (user runs them once)

## Consequences

- New dependency on `yaml` package (already present)
- Cursor config must be gitignored (contains resolved secrets)
- Users must run `mcp-gen` when adding/changing servers

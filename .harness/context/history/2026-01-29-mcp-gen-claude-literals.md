---
date: "2026-01-29"
type: "decision"
status: "active"
schema: "v2"
search_terms:
  - "mcp-gen"
  - "claude mcp.json"
  - "env.local literals"
related:
  - "NONE"
tags:
  - "#mcp-gen"
  - "#claude"
  - "#secrets"
---

# mcp-gen-claude-literals

## Summary

Switch mcp-gen’s Claude output to resolved env literals and skip missing env entries to make setup automatic.

## Context

Claude previously emitted `${ENV}` placeholders, which require the user’s shell to supply variables at runtime. This broke “set and forget” usage because MCP servers failed when `.env.local` was not loaded in the shell. Cursor already resolves literals from `.env.local`, so behavior diverged. We want Claude to behave like Cursor: use `.env.local` as the single source of truth and skip misconfigured servers with a warning.

## Decision

Generate Claude MCP entries with literal values resolved from the env map and skip servers when required env vars are missing or placeholder values.

## Rationale

This removes reliance on the user’s shell environment, aligns Claude with Cursor, and makes `.env.local` the canonical configuration source for local secrets.

## Consequences

`.mcp.json` now contains secrets and must remain gitignored. Missing or placeholder env values will remove the affected Claude entries until `.env.local` is filled and `mcp-gen` is re-run.

## Validation

- `node --import tsx --test harness-tests/tests/mcp-gen.test.mjs`

## Raw Notes

NONE

---
date: "2026-01-23"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "scaffold"
  - "env"
  - "mcp-gen"
  - "env_hints"
related:
  - "2026-01-21-mcp-gen-gitignore.md"
tags:
  - "#harness-meta"
---

# mcp-gen-env-scaffold

## Summary

Added automatic `.env.local` scaffolding to mcp-gen that creates uncommented placeholder
lines for missing environment variables, including inline `# <-- fill in` markers and
template values from the new `env_hints` schema field. Cursor builder now detects placeholder
values and skips servers until real values are provided. Updated dotenv parsing to strip
inline comments after quoted values to avoid value corruption from the marker, including
marker variants without spaces (e.g., `#comment`, `# <-- fill in`).

## Context

Users had to manually create `.env.local` and figure out the correct variable names
and formats. This made MCP server configuration error-prone and non-ergonomic. The
scaffold feature auto-generates placeholder lines so users just fill in the values.

## Technical Decision

- Added `env_hints` optional field to servers.yml schema for providing template values.
- Created `workflows/mcp/src/scaffold.mjs` with append-only scaffolding logic.
- Wired scaffolding into `run.mjs` to run after detecting missing env vars.
- Added comprehensive tests to `harness-tests/tests/mcp-gen.test.mjs`.
- Output format: `VAR='template' # <-- fill in` (uncommented for ergonomics).
- Added `isPlaceholderValue()` to detect unfilled placeholders (patterns: `YOUR_`, `_HERE`).
- Cursor builder now skips env vars with placeholder values (not just missing ones).
- Updated dotenv parsing to accept inline comments after quoted and unquoted values
  (flexible marker variants).
- Ensured `.mcp.json` is included in auto-managed gitignore patterns.

## Security & Integrity Impact

- Scaffold is append-only and never removes or modifies existing `.env.local` content.
- `.env.local` is already gitignored by mcp-gen's gitignore enforcement.
- Placeholder values are templates (e.g., `YOUR_NOTION_TOKEN`), not actual secrets.
- Cursor correctly skips servers with placeholder values, preventing accidental exposure.
- Inline markers are stripped from values during dotenv parsing to avoid corruption
  (even without spaces).
- Generated `.mcp.json` is gitignored by default to avoid tracking generated configs.
- No change to how secrets are stored or resolved.

## Conformance & Enforcement

- Tests verify scaffold creates correct format with inline markers.
- Tests verify idempotency (second run makes no changes).
- Tests verify existing env vars are not duplicated.
- Tests verify placeholder detection works for various patterns.
- Tests verify Cursor skips servers with placeholder values.
- Tests verify inline comment handling in dotenv parsing.

## Raw Notes

Files changed:

- workflows/mcp/src/scaffold.mjs (new - scaffolding logic, placeholder detection)
- workflows/mcp/src/env.mjs (dotenv inline comment handling)
- workflows/mcp/src/gitignore.mjs (ignore .mcp.json)
- workflows/mcp/src/yaml.mjs (added env_hints validation)
- workflows/mcp/src/run.mjs (wired scaffold)
- workflows/mcp/src/builders/cursor.mjs (placeholder value detection)
- workflows/mcp/servers.yml (added env_hints for Notion)
- workflows/mcp/index.mjs (exports)
- harness-tests/tests/mcp-gen.test.mjs (tests)

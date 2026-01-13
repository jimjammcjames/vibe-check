---
date: "2026-01-13"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "new:entry"
  - "new:learned"
  - "new:decision"
  - "migrate:history"
  - "unified command"
related:
  - "NONE"
tags:
  - "#harness-meta"
---

# unified-history-entry-command

## Summary

Consolidated `harness:new:learned` and `harness:new:decision` CLI commands into a single unified `harness:new:entry` command with a `--type` flag. Added `harness:migrate:history` for history migration support. Removed deprecated `harness:review` command.

## Context

The harness CLI had separate commands for creating learned vs decision entries, which was verbose and required remembering which command to use. Unifying these under a single `new:entry --type <type>` pattern simplifies the interface while maintaining full functionality.

## Technical Decision

- `npm run harness:new:entry -- --slug <slug> --type <fix|decision|incident|learned>` replaces both prior commands
- `npm run harness:migrate:history` added for history entry migration tooling
- `npm run harness:review` removed (deprecated)
- Added `prettier` dev dependency for formatting support

## Security & Integrity Impact

Low - CLI ergonomic change only. No changes to harness enforcement logic, policy audit, or guardian checks. The underlying entry creation and validation remains unchanged.

## Conformance & Enforcement

Tests updated to reflect new command structure. Existing harness tests continue to validate policy enforcement.

## Raw Notes

package.json script changes:

- `-"harness:new:learned"` → unified into `new:entry`
- `-"harness:new:decision"` → unified into `new:entry`
- `+"harness:new:entry"` with `--type` flag
- `+"harness:migrate:history"` for migrations
- `-"harness:review"` removed

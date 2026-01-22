---
date: "2026-01-22"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "mcp-gen"
  - "runner"
  - "meta"
related:
  - "2026-01-22-remove-mcp-gen-runner.md"
tags:
  - "#harness-meta"
---

# remove-mcp-gen-runner-meta

## Summary

Record the harness-core bookkeeping required when removing the
interactive mcp-gen runner and adjusting workflows documentation.

## Context

Harness Guardian treats any change under .harness/ as harness-core
modifications. Creating the decision entry for the runner removal
introduces a .harness/ change, which requires a meta entry for
compliance even though the functional changes are outside .harness/.

## Technical Decision

Add a meta entry that links to the decision entry describing the
removal of workflows/mcp/test-runner.mjs and related documentation
updates.

## Security & Integrity Impact

- No runtime harness logic changes; meta entry only.
- Improves auditability for portability-related edits.

## Conformance & Enforcement

- Satisfies Harness Guardian requirements for .harness/ changes.
- Policy audit remains enforced for real code changes.

## Raw Notes

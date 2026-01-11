---
date: "2026-01-10"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "history"
  - "context trail"
  - "frontmatter schema"
  - "policy audit"
  - "CI-only agents"
related:
  - "NONE"
tags:
  - "#harness-meta"
  - "#history"
  - "#policy"
---

# history-unification

## Summary

Unified harness context into a single history trail, removed legacy entry commands, and added class-level prevention enforcement for fixes.

## Context

We needed one searchable context trail instead of separate learned and decision folders. The change required migrating entries, updating CLI commands, and adjusting policy checks so agents and auditors read the same history schema. We also tightened fix requirements to emphasize class-level prevention rather than one-off patches.

## Technical Decision

- Introduced `.harness/context/history` with YAML frontmatter + markdown body templates.
- Removed legacy `new:learned` and `new:decision` commands in favor of `new:entry --type`.
- Added `## Class Prevention` requirements for fix/incident entries with an exemption tag for edge cases.
- Reworked policy, guardian, and agent scripts to read history entries and frontmatter.

## Security & Integrity Impact

Centralizing history improves auditability and reduces accidental omissions. The frontmatter schema and meta tag requirements make it harder to bypass documentation or blur decision accountability.

## Conformance & Enforcement

- Policy audit now validates frontmatter fields, schema versions, strict fix requirements, and class prevention sections.
- Base tripwire and agent checks consume history entries to avoid split sources of truth.
- Post stage rejects agent steps, keeping AI review confined to CI.

## Raw Notes

This update normalizes legacy entries to the new frontmatter format and path structure.

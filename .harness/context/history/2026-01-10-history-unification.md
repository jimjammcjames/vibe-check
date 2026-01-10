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

Unified harness context into a single history trail, updated enforcement scripts, and aligned CI-only agents with new frontmatter validation.

## Context

We needed one searchable context trail instead of separate learned and decision folders. The change required migrating entries, updating CLI commands, and adjusting policy checks so agents and auditors read the same history schema.

## Technical Decision

- Introduced `.harness/context/history` with YAML frontmatter + markdown body templates.
- Updated CLI creation and migration commands to target history entries and meta types.
- Reworked policy, guardian, and agent scripts to read history entries and frontmatter.

## Security & Integrity Impact

Centralizing history improves auditability and reduces accidental omissions. The frontmatter schema and meta tag requirements make it harder to bypass documentation or blur decision accountability.

## Conformance & Enforcement

- Policy audit now validates frontmatter fields, schema versions, and strict fix requirements.
- Base tripwire and agent checks consume history entries to avoid split sources of truth.
- Post stage rejects agent steps, keeping AI review confined to CI.

## Raw Notes

This update normalizes legacy entries to the new frontmatter format and path structure.

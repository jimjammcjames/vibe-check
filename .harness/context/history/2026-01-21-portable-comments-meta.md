---
date: "2026-01-21"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "portability"
  - "comments"
  - "install"
related:
  - "2026-01-21-portable-comments.md"
  - "2026-01-11-repo-local-mcp-gen.md"
  - "2026-01-21-mcp-gen-gitignore.md"
tags:
  - "#harness-meta"
---

# portable-comments-meta

## Summary

Record harness-core changes that add portability comments, clarify
install-time requirements, and guide future drop-in setup adjustments.

## Context

We modified .harness/ files to add explicit portability notes and to
require a test script in target repos. Harness Guardian requires a
meta entry for any harness-core changes.

## Technical Decision

Accept a meta entry documenting comment-only changes to:

- .harness/config.yml
- .harness/setup/AGENT-SETUP.md

These changes improve installation guidance without altering harness
runtime behavior. The mcp-gen gitignore fix is documented separately
in 2026-01-21-mcp-gen-gitignore.md.

## Security & Integrity Impact

- No code paths changed; comments and documentation only.
- Integrity enforcement preserved; guidance clarified.

## Conformance & Enforcement

- Harness Guardian satisfied via this meta entry.
- Policy audit remains unchanged; entries still required for real code.

## Raw Notes

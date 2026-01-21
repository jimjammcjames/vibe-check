---
date: "2026-01-21"
type: "decision"
status: "active"
schema: "v2"
search_terms:
  - "portability"
  - "install"
  - "comments"
related:
  - "2026-01-21-portable-comments-meta.md"
tags:
  - "#harness-decision"
---

# portable-comments

## Summary

Add portability comments in .harness/ and workflows/ to guide future
install agents on required adjustments when dropping these folders
into another repo.

## Context

We are making .harness/ and workflows/ portable by drag-and-drop.
Some files still reference repo-local paths or commands (e.g.
test:local, harness-tests/). Instead of changing behavior now, we
added explicit comments so future install agents know what must be
updated or removed.

## Decision

Annotate portability-sensitive spots with comments:

- .harness/config.yml: note required test command and harness-tests globs
- workflows/mcp/test-runner.mjs: note dependency on harness-tests fixtures
- workflows/mcp/README.md: note gitignore entry only applies with harness-tests
- workflows/skills/stub/SKILL.md: note placeholder removal before porting

## Rationale

Comments preserve current behavior while making required manual
adjustments obvious during installation, reducing drag-and-drop
confusion without introducing opinionated changes.

## Consequences

- Install agents must still replace repo-specific commands/paths.
- No functional changes to harness behavior in this repo.

## Validation

- Local harness:post passes after history entry is filled.
- Comments visible in each portability-sensitive file.

## Raw Notes

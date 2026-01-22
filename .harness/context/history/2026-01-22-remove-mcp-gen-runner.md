---
date: "2026-01-22"
type: "decision"
status: "active"
schema: "v2"
search_terms:
  - "mcp-gen"
  - "runner"
  - "workflows"
related:
  - "2026-01-21-portable-comments.md"
tags:
  - "#harness-decision"
---

# remove-mcp-gen-runner

## Summary

Remove the interactive mcp-gen test runner and rely on the normal
test suite, keeping workflows/ portable in drop-in installs.

## Context

The interactive runner depended on harness-tests fixtures and temp
paths that do not exist when only .harness/ and workflows/ are copied
into another repo. This made the workflows payload appear non-portable
even though the core generator is portable.

## Decision

Delete workflows/mcp/test-runner.mjs and remove the mcp-gen:test script.
Clarify in workflows/mcp/README.md that validation lives in the normal
test suite for the host repo.

## Rationale

Keeping the runner in workflows/ created a portability footgun without
adding CI value. The standard test suite already covers mcp-gen
behavior, so the runner is redundant.

## Consequences

- No interactive ad-hoc runner in workflows/.
- Tests must be run through the repo's normal test suite.

## Validation

- npm run harness:post
- npm run harness:ci

## Raw Notes

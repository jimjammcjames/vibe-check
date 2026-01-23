---
date: "2026-01-23"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "harness-guardian"
  - "ci"
  - "test"
related:
  - "2026-01-23-mcp-gen-env-scaffold.md"
tags:
  - "#harness-meta"
---

# harness-guardian-output

## Summary

Aligned the Harness Guardian test expectations with the current success message
("No changes to check") emitted when there are no harness changes to review.

## Context

The harness guardian script now emits "No changes to check" when the diff is
empty. The existing test only accepted older success strings and did not
recognize the current output.

## Technical Decision

- Extended the success match to include "No changes to check" in both the
  normal and error paths.

## Security & Integrity Impact

- No security behavior changed; this only aligns test expectations with
  existing output.

## Conformance & Enforcement

- Tests still require a successful guardian run or a valid no-change state.

## Raw Notes

Files changed:

- harness-tests/tests/harness-guardian.test.mjs

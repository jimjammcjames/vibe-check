---
date: "2026-01-23"
type: "fix"
status: "active"
schema: "v2"
search_terms:
  - "harness-guardian"
  - "ci"
  - "test"
error_signature: "Guardian failed: Should verify existing legitimate changes or detect no changes"
related:
  - "2026-01-23-mcp-gen-env-scaffold.md"
tags:
  - "#harness-meta"
---

# harness-guardian-output

## Summary

Aligned the Harness Guardian test expectations with the current success
message, and expanded the harness guardian policy to accept #harness-meta fix
entries for harness-core changes that are corrective in nature.

## Context

The harness guardian script now emits "No changes to check" when the diff is
empty. The existing test only accepted older success strings and did not
recognize the current output. Memory coherence also expects fix entries for
test fixes, which conflicted with the meta-only requirement.

## Error

Harness Guardian test failed because it did not recognize the current success
message. Memory coherence flagged the history entry as the wrong type when the
change was documented as meta.

## What Changed

- Accept "No changes to check" as a success message in the Harness Guardian
  test.
- Assert the guardian output does not flag meta-security violations when a
  tagged entry exists.
- Allow #harness-meta entries to be type fix or incident, matching the nature
  of harness-core fixes.

## Validation

- npm run harness:ci

## Systemic Gap

Harness-core fixes required a meta entry, but memory coherence expects fix
entries for fixes. This mismatch caused avoidable CI failures.
Gap Closure: Added test/validation: harness-tests/tests/harness-guardian.test.mjs

## Class Prevention

Permit #harness-meta tags on fix/incident entries for harness-core fixes and
document this expectation in future guardrails so policy checks and coherence
reviews converge on the same entry type without fragile exceptions.

## Raw Notes

Files changed:

- .harness/framework/scripts/harness-guardian.mjs
- harness-tests/tests/harness-guardian.test.mjs

---
date: "2026-01-03"
type: "fix"
status: "active"
schema: "v1"
search_terms:
  - "guardian"
  - "test"
  - "integrity"
  - "verification"
related:
  - "NONE"
tags:
  - "#harness"
  - "#fix"
  - "#reliability"
---

# LEARNED: Harness Guardian Test Modifications Handling

## What Happened

The `harness-guardian.test.mjs` was failing because it specifically expected "Integrity verified" as the only success indicator, but it received "No harness modifications detected" when no harness changes were present.

## Root Cause

The test suite did not account for the idempotent nature of the guardian script when no changes are detected.

## Solution

Updated the test assertion to accept both "Integrity verified" and "No harness modifications detected" as valid success conditions.

## Systemic Gap

Inflexible integration tests that depend on specific phrasing of success messages.
Added test: harness-tests/tests/harness-guardian.test.mjs to verify idempotent success paths.

## Conformance

- Real changes: Yes
- Entry matches: Yes
- Tests pass: Yes

## Search terms

guardian, test, integrity, verification

## Related

NONE

## Tags

#harness #fix #reliability

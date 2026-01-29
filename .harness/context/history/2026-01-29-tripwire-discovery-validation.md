---
date: "2026-01-29"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "base-tripwire"
  - "test discovery"
  - "list_tests_cmd"
  - "list_tests_pattern"
related:
  - "NONE"
tags:
  - "#harness-meta"
  - "#testing"
---

# tripwire-discovery-validation

## Summary

Added dynamic test discovery validation to base-tripwire so it can detect when a new test file is not actually discovered by the test runner, preventing false “tests passed on base” signals.

## Context

The tripwire previously relied only on file globs and could be misled if the runner ignored a test file (e.g., unsupported extensions). This required manual investigation to diagnose. We now query the runner’s discovered tests via configurable commands and compare against the test files in the diff.

## Technical Decision

Introduce `list_tests_cmd`, `list_tests_pattern`, and `validate_test_discovery` in `.harness/config.yml`. Base-tripwire runs the command in the base worktree, parses discovered test paths with the configured pattern (plus a safe fallback), and fails early with a clear diagnostic when any added test is not discovered.

## Security & Integrity Impact

Closes a gaming vector where non-executed tests could satisfy “test delta” requirements while still passing on base. This makes the anti-gaming guardrail deterministic and self-diagnosing.

## Conformance & Enforcement

Tripwire now performs discovery validation before running tests. If discovery fails, it emits an actionable error identifying the missing test(s) and advising to rename the file or update runner configuration.

## Raw Notes

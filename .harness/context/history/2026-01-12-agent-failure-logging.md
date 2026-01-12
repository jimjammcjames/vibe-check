---
date: "2026-01-12"
type: "feature"
status: "active"
schema: "v2"
search_terms:
  - "agent failure logging"
  - "agent-failures.log"
  - "diagnostics directory"
  - "recordAgentFailure"
related:
  - "2026-01-04-harness-log-verbosity-controls"
tags:
  - "#harness-diagnostics"
---

# agent-failure-logging

## Summary

Added infrastructure to log agent failures to a dedicated diagnostics directory for post-mortem analysis and debugging.

## Context

When agents fail (due to rate limits, quota exhaustion, parsing errors, etc.), the error details were only printed to stdout and lost after the run. This made debugging intermittent failures in CI difficult since there was no persistent log of what went wrong.

## Technical Decision

- Created `.harness/context/history/diagnostics/` directory for diagnostic outputs
- Added `agent-failures.log` file (gitignored) to capture structured failure information
- Implemented `recordAgentFailure()` function in agent scripts to append failure details
- Each failure record includes: agent name, provider, error message, rate-limited flag, and timestamp

## Security & Integrity Impact

The diagnostics directory is gitignored to prevent accidental commits of potentially sensitive error details.

## Conformance & Enforcement

Agent failures are now persistently logged, enabling better debugging and trend analysis without changing existing CI gate behavior.

## Raw Notes

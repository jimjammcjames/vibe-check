# Harness Framework Improvements: Logging, Tests, & Fixes #harness-meta

## Context & Rationale
This set of changes accumulates several improvements to the harness framework, primarily focusing on developer experience (logging), test reliability (fixes), and output stability.
- **Problem 1**: `harness:post` output was overwhelming (hundreds of lines of TAP output).

## Changes
This update implements **quiet-by-default logging** for better developer experience.

## Technical Decision

### 1. Environment Variable: `HARNESS_QUIET`
When `harness.mjs` runs in non-verbose mode, it sets `HARNESS_QUIET=1` for child processes. Scripts check this variable and suppress non-essential output.

### 2. Logging Function Changes
- `log()` and `logInfo()` now check `HARNESS_QUIET` and skip output when set
- `logError()`, `logSuccess()`, and `logWarning()` **always** output (critical status markers)
- Agent responses (Verdict, Reasoning, Summary) bypass quiet mode and always show on failure

### 3. CLI Output Filtering
On command failure, the CLI filters output to show:
- Agent response markers (Verdict:, Severity:, Summary:, etc.)
- Error indicators (✗, FAIL, Error:)
- Test summary (# tests, # fail)

This eliminates hundreds of "ok 1 - test passed" lines while preserving full error context.


## Files Modified
- `harness.mjs`: Added HARNESS_QUIET logic, output filtering, and child process env passing.
- `agent-runner.mjs`: Updated `log`/`logInfo` to check `HARNESS_QUIET`.
- `review-adapter.mjs`: Bypass quiet mode for agent response (Verdict/Validation); added `console.log` for visibility.
- `undocumented-detector.mjs`: Bypass quiet mode for analysis; added `console.log` for visibility.
- `harness-guardian.mjs`: Bypass quiet mode for integrity verdict.
- `policy-audit.mjs`: Added `HARNESS_QUIET` check to `log` function.
- `base-tripwire.mjs`: Added `HARNESS_QUIET` check to `log` function.

## Security & Integrity Impact
- **NOT gaming**: These changes improve **developer experience** (cleaner output), an explicitly permitted improvement
- **Full output preserved**: All information remains available via `--verbose` flag
- **Critical info always shown**: Errors, warnings, and agent responses bypass quiet mode
- **No enforcement weakening**: All checks still run; only presentation changes

## Conformance & Enforcement
- **Change Type**: Feature (Logging Improvements)
- `npm run harness:post -- --verbose` shows full output
- Agent verdicts and reasoning always visible on failure

## Search terms
harness, logging, verbose, quiet, output, filtering, HARNESS_QUIET, developer experience

## Related
- [Stub Provider Key Collision Fix](../../context/learned/2026-01-04-stub-provider-key-collision.md)
- [Worktree Cleanup](../../context/learned/2026-01-04-orphaned-worktree-cleanup.md)

## Tags
- #harness-meta
- #developer-experience
- #logging

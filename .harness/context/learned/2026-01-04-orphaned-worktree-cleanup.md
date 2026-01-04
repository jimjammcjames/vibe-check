# Orphaned Git Worktrees due to Missing Signal Handlers

## Context
The `base-tripwire.mjs` script was leaving orphaned git worktrees in `/tmp/harness-tripwire-*` when terminated unexpectedly (SIGINT/SIGTERM/Ctrl+C). This accumulated 22+ orphaned worktrees, consuming disk space and git tracking overhead.

## Systemic Gap
**Process Lifecycle Management**: The harness scripts relied on the assumption of a "happy path" clean exit. There was no infrastructure-level handling of interruption signals (`SIGINT`, `SIGTERM`), leading to resource leaks (orphaned worktrees) when the developer interrupted the process.
Added validation: `base-tripwire.mjs` (Signal Handlers). The script now registers `process.on('SIGINT')` and `process.on('SIGTERM')` listeners that ensure clean exit.

## Test Exemption
**Manual Verification Only**: Signal handling (`SIGINT`/`SIGTERM`) is difficult to test reliably in the unit test suite without interrupting the test runner itself. Verified manually by running `base-tripwire.mjs` and interrupting it, confirming cleanup.

## Search terms
worktree, cleanup, signal, SIGINT, SIGTERM, base-tripwire, leak, resource management

## Related
- [Harness Log Verbosity (Parent)](../decisions/harness/2026-01-04-harness-log-verbosity-controls.md)

## Tags
- #harness-fix
- #infrastructure
- #reliability

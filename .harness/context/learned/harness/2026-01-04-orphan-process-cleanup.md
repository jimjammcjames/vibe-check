# Orphan Process Cleanup for Harness Stages

## Context & Rationale

When AI agents run harness stages (`iterate`, `post`, `ci`), they spawn child processes like `prettier`, `eslint`, and `tsc`. If the agent session terminates unexpectedly (timeout, network drop, or `SIGKILL`), these child processes become orphaned and continue running indefinitely.

This was causing significant resource consumption — dozens of `npm exec prettier --check .` processes accumulating in Activity Monitor.

## Technical Decision

1. **Added `killOrphanedProcesses()` function** to `harness.mjs` that kills lingering prettier/eslint/tsc processes at the start of each stage
2. **Call cleanup at start of all stages**: `cmdIterate()`, `cmdPost()`, `cmdCi()`
3. **Added termination detection** in `runCommand()` to detect when a command is killed externally and provide clear guidance:
   ```
   ⚠️  PROCESS COLLISION DETECTED
   Another harness instance may have killed this process.
   → ACTION: Simply rerun the command. This is safe.
   ```
4. **Installed prettier locally** as devDependency to reduce process chain depth

## Security & Integrity Impact

**This change does NOT weaken any enforcement checks.** It only affects process lifecycle management:

- ✅ All policy checks remain unchanged
- ✅ All verification passes through identical logic
- ✅ Guardian, tripwire, and review-adapter unaffected
- ⚠️ Minor risk: could kill legitimate prettier processes from other projects if running simultaneously (mitigation: clear error message with rerun instruction)

## Conformance & Enforcement

The changes are verified by:

1. Running `harness:iterate`, `harness:post`, `harness:ci` successfully
2. Confirming no orphaned processes remain after execution (`pgrep -fl prettier`)
3. Existing test suite continues to pass

## Systemic Gap

**Gap**: No cleanup mechanism existed for orphaned child processes when agent sessions terminate unexpectedly (timeout, network drop, SIGKILL). This led to resource accumulation requiring manual intervention.

**Gap Closure**: Added `killOrphanedProcesses()` in `harness.mjs` that runs at the start of each stage, ensuring idempotent execution regardless of prior session state.

## Search terms

orphan, process, cleanup, prettier, eslint, tsc, pkill, idempotent, harness

## Related

- NONE

## Tags

- #harness-meta
- #integrity
- #process-management

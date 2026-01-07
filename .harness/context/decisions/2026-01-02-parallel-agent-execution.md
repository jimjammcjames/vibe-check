# Parallel Agent Execution

**Date:** 2026-01-02

## Context

The `harness:post` verification command was failing to scale. As we added more agents (Undocumented Detector, Review Adapter, Base Tripwire), sequential execution caused timeouts and severe developer friction.

## Decision

Refactored the harness CLI (`harness.mjs`) to run independent "agent" checks in parallel, while keeping foundational checks sequential.

Supporting changes:

- **Undocumented Detector**: Updated to handle parallelism and read from both Learned and Decision entries.
- **Base Tripwire**: Fixed to ignore deleted/renamed files in the diff to prevent false positive regressions.
- **CLI Tests**: Added timeouts and randomized slugs for concurrent stability.

## Rationale

- **Performance**: Parallel execution significantly reduces feedback time.
- **Independence**: `undocumented-detector` and `review-adapter` are read-only and context-free, making them safe for concurrency.
- **Safety**: `base-tripwire` remains sequential because it manages Git worktrees, which cannot safely be shared or concurrently mutated.

## Consequences

- **Faster Feedback**: Developers get harness results ~3x faster.
- **Complexity**: Harness logic now manages Promises and async execution.
- **Test Stability**: `harness-cli.test.mjs` was updated with timeouts and randomized slugs to handle the concurrent execution model reliably.

## Search terms

`parallel execution`, `harness optimization`, `async`, `performance`, `concurrency`

## Related

NONE

## Tags

#performance #harness #architecture #optimization

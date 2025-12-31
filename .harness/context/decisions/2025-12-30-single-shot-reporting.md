# Architecture Decision: Single-Shot Simulation Reporting

**Date:** 2025-12-30
**Status:** Decided

## Context

User requested better insight into simulation failures. Initial plan was to run a second agent invocation to analyze logs, but this would lose the original agent's context and thought traces.

## Decision

Implement "Single-Shot Self-Reporting" by injecting instructions into the primary simulation task prompt.

## Implementation

1. **Instruction Injection:** `run.sh` appends a "Final Reporting" section to the task prompt.
2. **Mandatory Artifact:** Agent is required to write `SIMULATION_REPORT.md` within the same session.
3. **Verification:** Agent must run `npm run harness:post` before finishing.
4. **Extraction:** `summarize-log.mjs` reads the report from the sandbox and includes it in the final summary.

## Consequences

- **Positive:** Preserves full context and chain-of-thought.
- **Positive:** Reduces token usage/cost by avoiding a second invocation.
- **Negative:** Slightly longer prompt for the agent.
- **Negative:** Risk of agent forgetting to write the report (mitigated by instruction placement).

## Search terms

- simulation reporting
- codex context preservation
- single-shot reporting

## Related

- [run.sh](file:///Users/jamesdugle/Repos/vibe%20check/harness-tests/simulation/run.sh)
- [summarize-log.mjs](file:///Users/jamesdugle/Repos/vibe%20check/harness-tests/simulation/lib/summarize-log.mjs)
- NONE

## Tags

#architecture #reporting #simulation

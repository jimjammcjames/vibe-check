# Memory Coherence Checker

**Date:** 2026-01-02

## Context

To support the scaling of the harness agent architecture, we identified the need for automated memory entry validation. As the number of agents and developers increases, manual enforcement of entry types and coherence becomes a bottleneck.

## Decision

Implemented a **Memory Coherence Checker** agent that enforces architectural standards:
1. Entry type correctness (fix → learned, feature → decision)
2. Topic coherence (one logical change per entry)

We also updated the **Undocumented Detector** to support this architecture by consolidating Learned and Decision entries into a single `MEMORY_ENTRIES` context, ensuring all architectural changes are consistently tracked.

## Rationale

Chose a dedicated agent over enhancing review-adapter because:
- Single responsibility (easier to iterate on)
- Runs in parallel (no added latency)
- Fails independently (doesn't break compliance review)

## Consequences

- Adds one more LLM API call per harness run
- May generate false positives for borderline cases
- Forces better entry hygiene from the start

## Search terms

`memory coherence`, `entry type`, `learned vs decision`, `topic coherence`

## Related

NONE

## Tags

#harness #architecture #agents

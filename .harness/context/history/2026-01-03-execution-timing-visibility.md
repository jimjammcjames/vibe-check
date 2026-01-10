---
date: "2026-01-03"
type: "meta"
status: "active"
schema: "v1"
search_terms:
  - "harness"
  - "timing"
  - "performance"
  - "duration"
  - "CLI"
  - "flag"
related:
  - "[Modular LLM Provider Architecture](./2026-01-03-modular-llm-provider-architecture.md)"
tags:
  - "#harness-meta"
  - "#performance"
  - "#visibility"
---

# Decision: Execution Timing Visibility

## Context & Rationale

Agent execution times were previously opaque, making it difficult to identify bottlenecks or debug performance issues in the harness pipeline.

## Technical Decision

Implemented duration tracking across the framework:

- **`agent-runner.mjs`**: Captures and logs the duration of individual agent runs.
- **`harness.mjs`**: Added a `--timing` flag to the `post` command to collect and display a sorted summary of all verification step runtimes.

## Verification

- Run `npm run harness:post -- --timing` to see the sorted summary.
- Verify logs show `ℹ Execution time: [X]ms`.

## Search terms

harness, timing, performance, duration, CLI, flag

## Related

- [Modular LLM Provider Architecture](./2026-01-03-modular-llm-provider-architecture.md)

## Tags

- #harness-meta
- #performance
- #visibility

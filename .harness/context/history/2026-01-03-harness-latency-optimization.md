---
date: "2026-01-03"
type: "meta"
status: "active"
schema: "v1"
search_terms:
  - "latency"
  - "optimization"
  - "parallel"
  - "nano"
  - "gpt-4.1-nano"
  - "caching"
related:
  - "NONE"
tags:
  - "#harness-meta"
  - "#optimization"
  - "#performance"
---

# DECISION: Harness Latency Optimization and Nano Model Integration

## Context

The `harness:post` command was taking > 30s, exceeding the < 10s target for local developer velocity. Principal bottlenecks were sequential execution of foundational checks and high latency in AI agent calls.

## Technical Decision

1.  **Aggressive Parallelization**: Refactored `harness.mjs` to run ALL post-verification steps in parallel using `Promise.all`.
    - _Race Mitigation_: `base-tripwire` uses unique temp directories for worktrees to avoid git index conflicts. `npm test` and Agents are read-only.
2.  **GPT-4.1-Nano Integration**: Configured `http-api.mjs` to use `gpt-4.1-nano` for all agents.
3.  **Prompt Caching**: Restructured `http-api.mjs` to use a static System Message prefix (containing instructions and rules) and a variable User Message suffix (containing diffs).
4.  **Structured JSON**: Enforced `strict: true` JSON schemas via the OpenAI Responses API.
5.  **Performance Overhaul**: Truncated large context files (>20kb) and optimized `base-tripwire` via `node_modules` symlinking.
6.  **Agent Logic Consolidation**: Integrated Memory Coherence Checker and Undocumented Detector into the core verification pipeline.

## Security Impact

None. Enforcement remains total. The integrity review still blocks on any failed agent or script.

## Conformance

- Real changes: Yes
- Entry matches: Yes (documents harness changes)
- Tests pass: Yes

## Search terms

latency, optimization, parallel, nano, gpt-4.1-nano, caching

## Related

NONE

## Tags

#harness-meta #optimization #performance

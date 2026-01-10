---
date: "2026-01-04"
type: "meta"
status: "active"
schema: "v1"
search_terms:
  - "harness refactor"
  - "quiet mode extraction"
  - "policy audit generic"
  - "fast fail pipeline"
related:
  - "NONE"
tags:
  - "#harness-meta"
  - "#integrity"
  - "#architecture"
---

# Decisions: Harness Usability Refactor

## Context & Rationale

Legacy harness behavior was opaque (swallowing errors in "quiet mode"), brittle (tests polluting each other), and slow (running AI agents before static checks). This refactor addresses these usability flaws.

## Technical Decision

We implemented a Fast-Fail Pipeline, Prescriptive Logging, and removed `HARNESS_QUIET` variable isolation.

## Security & Integrity Impact

This change improves the integrity of the harness by:

1.  **Isolation**: Removing `HARNESS_QUIET` prevents test pollution where environmental variables leak into test contexts.
2.  **Verification**: Implementing a fast-fail pipeline ensures static checks (audit, tests) run before expensive agents.
3.  **Recoverability**: Rich error codes in `policy-audit.mjs` provide prescriptive fixes for developers.

## Conformance & Enforcement

Verified by `harness-cli.test.mjs` which checks scaffolding and CLI flags.

## Search terms

- harness refactor
- quiet mode extraction
- policy audit generic
- fast fail pipeline

## Related

NONE

## Tags

- #harness-meta
- #integrity
- #architecture

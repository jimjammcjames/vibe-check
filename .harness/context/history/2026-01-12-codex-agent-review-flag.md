---
date: "2026-01-12"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "codex flag for agent review"
  - "HARNESS_CODEX_MODEL"
  - "HARNESS_CODEX_REASONING"
related:
  - "NONE"
tags:
  - "#harness-meta"
---

# codex-agent-review-flag

## Summary

Added a Codex-specific CLI flag and config wiring so agent review can run through Codex without changing prompts, and added codex model/reasoning overrides for consistency with Gemini.

## Context

We need a first-class way to run agent review using the Codex CLI while keeping prompts and review logic identical, and the existing provider override is too generic for quick workflow switching. The change should also make Codex configuration discoverable and consistent across all agent runner paths.

## Technical Decision

Introduce a `--codex` CLI switch that maps to the codex provider, and add `--codex-model` / `--codex-reasoning` overrides plus config parsing for `agents.codex_*` so all agents can share the same standardized provider settings.

## Security & Integrity Impact

Provider selection is explicit and documented, and configuration remains in local env/config with no changes to audit or enforcement rules.

## Conformance & Enforcement

Harness CLI and agent runner continue to enforce provider availability and failures remain visible through the existing diagnostics and CI agent gates.

## Raw Notes

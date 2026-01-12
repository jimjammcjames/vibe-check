---
date: "2026-01-12"
type: "refactor"
status: "active"
schema: "v2"
search_terms:
  - "stub provider removal"
  - "stubAdapter"
  - "no-op provider"
related:
  - "2026-01-03-modular-llm-provider-architecture"
  - "2026-01-04-stub-provider-key-collision"
tags:
  - "#harness-providers"
---

# remove-stub-provider

## Summary

Removed the stub provider and stub adapter from the harness framework as they are no longer needed.

## Context

The stub provider was originally created as a no-op fallback for testing and development when no real LLM provider was configured. With the Gemini provider now stable and the HTTP API provider available as alternatives, the stub provider added unnecessary code and created a false sense of coverage when no real review was being performed.

## Technical Decision

- Deleted `.harness/framework/providers/stub.mjs`
- Removed `stubProvider` from the provider registry in `index.mjs`
- Removed `stubAdapter` from `agent-code-review.mjs`
- Updated `selectAdapter()` to no longer fall back to stub - now relies on `sharedAdapter` exclusively
- Removed warning messages about stub adapter usage

## Security & Integrity Impact

Improves integrity by removing a pathway where agents could "pass" without real verification. All agent runs now require a configured provider.

## Conformance & Enforcement

The removal ensures that harness CI gates cannot be gamed by silently falling back to a no-op stub.

## Raw Notes

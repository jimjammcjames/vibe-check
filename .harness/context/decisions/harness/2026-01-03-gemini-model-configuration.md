# Decision: Gemini Model Configuration

## Context & Rationale

The initial Gemini provider was hardcoded. To optimize for quota, cost, and performance, the framework needs to support choosing specific models and reasoning levels. Additionally, full file context is often unnecessary for focused reviews.

## Technical Decision

- **Model Selection**: Hardcoded provider to use `gemini-3-flash-preview` for latest capabilities.
- **Context Optimization**: Implemented `diffOnly` mode to only send `HARNESS_DIFF.txt` when configured, reducing token usage for specific tasks.

## Verification

- Verified AI calls use `gemini-3-flash-preview`.
- Confirmed functionality with `npm run harness:post`.

## Search terms

harness, gemini, model, flash, configuration, CLI

## Related

- [Modular LLM Provider Architecture](./2026-01-03-modular-llm-provider-architecture.md)

## Tags

- #harness-meta
- #gemini
- #configuration

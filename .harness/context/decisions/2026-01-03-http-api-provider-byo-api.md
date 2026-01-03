# HTTP API Provider (BYO API)

**Date:** 2026-01-03

## Context

The harness framework was tightly coupled to specific CLI tools (gemini, codex) for LLM-powered agents. Users needed flexibility to use their own API keys and endpoints (OpenAI, Azure, local models) without installing vendor-specific CLIs.

## Decision

Implemented a new `http` provider in `.harness/framework/providers/http-api.mjs` that:
- Makes direct HTTP requests to any OpenAI-compatible endpoint
- Defaults to OpenAI Responses API (`/v1/responses`) with `gpt-5-mini` model
- Supports legacy Chat Completions API format via `apiFormat: 'chat'`
- Uses environment variables: `HARNESS_API_KEY`, `HARNESS_API_ENDPOINT`, `HARNESS_API_MODEL`
- Implements `diffOnly` optimization to reduce token usage

Made `http` the default provider in `agent-runner.mjs`, replacing `codex`.

## Rationale

1. **Vendor independence**: Users can switch LLM providers by changing env vars
2. **No CLI dependency**: Works without installing gemini or codex CLIs
3. **OpenAI Responses API**: Newer format supports reasoning models (gpt-5-mini)
4. **Token optimization**: `diffOnly` flag reduces context for narrow reviews

## Consequences

- Requires `HARNESS_API_KEY` environment variable for default operation
- Both Responses API and Chat Completions formats supported

## Search terms

- http provider openai api
- bring your own api byo llm
- openai responses api

## Related

- [modular-llm-provider-architecture](file://.harness/context/decisions/harness/2026-01-03-modular-llm-provider-architecture.md)
- [gemini-model-configuration](file://.harness/context/decisions/harness/2026-01-03-gemini-model-configuration.md)

## Tags

#architecture #provider #harness-meta

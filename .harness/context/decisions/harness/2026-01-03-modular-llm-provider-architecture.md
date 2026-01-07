# Decision: Modular LLM Provider Architecture

## Context & Rationale

The harness review agents (guardian, undocumented-detector, coherence-checker, review-adapter) all contained duplicated code for:

- Sandbox creation and file staging
- LLM/Codex CLI invocation
- Result parsing and error handling
- Rate limit tolerance

This duplication made it difficult to:

1. Swap LLM providers (e.g., Codex → Anthropic → OpenAI)
2. Test agents without API calls (using a stub provider)
3. Maintain consistent error handling across agents

## Technical Decision

Created a shared provider abstraction layer:

**New Files:**

- `.harness/framework/providers/index.mjs` - Provider registry and factory
- `.harness/framework/providers/codex.mjs` - Codex CLI wrapper
- `.harness/framework/providers/stub.mjs` - Mock provider for testing
- `.harness/framework/lib/agent-runner.mjs` - Shared agent execution logic

**Refactored Files:**

- `harness-guardian.mjs` - Uses `runAgent()` instead of inline execSync
- `undocumented-detector.mjs` - Uses `runAgent()`
- `memory-coherence-checker.mjs` - Uses `runAgent()`
- `review-adapter.mjs` - Imports shared provider

**Provider Interface:**

```javascript
async invoke({ prompt, files, outputFile, config }) → { success, result, rateLimited, error }
```

## Security & Integrity Impact

- **No weakening of checks**: The exact same prompts and validation logic are preserved
- **Improved testability**: Stub provider enables CI without API keys
- **Rate limit handling consolidated**: All agents now handle rate limits consistently
- **Provider selection via config**: `agents.provider` in config.yml or `HARNESS_PROVIDER` env var

## Conformance & Enforcement

- All 110 existing tests must continue to pass
- The `harness:post` pipeline verifies integrated behavior
- Stub provider allows testing agent logic without network calls

## Search terms

harness, meta, provider, LLM, modular, architecture, codex, anthropic, openai

## Related

- [Execution Timing Visibility](./2026-01-03-execution-timing-visibility.md)
- [Gemini Model Configuration](./2026-01-03-gemini-model-configuration.md)
- [Implement LLM-Based Harness Guardian](./2026-01-02-implement-llm-based-harness-guardian.md)
- [Zero-Sandbox Architecture](./2026-01-03-zero-sandbox-architecture.md)

## Tags

- #harness-meta
- #architecture
- #refactor

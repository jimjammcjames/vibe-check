# Decision: Agent Runner Provider Cleanup

## Context
The `agent-runner` previously contained fallback logic that would attempt to switch to `codex` or `gemini` if the primary provider failed or was rate-limited. This obscured configuration issues and made behavior unpredictable.

## Decision
Removed implicit provider fallback logic in `.harness/framework/lib/agent-runner.mjs`. The runner now attempts to use the configured provider (via `HARNESS_PROVIDER` env var, `config.yml`, or default `http`) and fails explicitly if that provider is unavailable or returns an error.

## Rationale
- **Predictability**: Users know exactly which provider is being used.
- **Fail-Fast**: Configuration errors (e.g., missing keys) are reported immediately rather than masking them with a fallback.
- **Simplicity**: Reduces complexity in the runner's error handling.

## Consequences
- If the configured provider is rate-limited or fails, the agent run will fail.
- Users must ensure their configured provider is operational.

## Search terms
agent-runner, fallback, provider selection, error handling

## Related
- [.harness/framework/lib/agent-runner.mjs](file://.harness/framework/lib/agent-runner.mjs)
- [2026-01-03-http-api-provider-byo-api.md](file://.harness/context/decisions/2026-01-03-http-api-provider-byo-api.md)

## Tags
#architecture #agent-runner #reliability

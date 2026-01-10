---
date: "2026-01-04"
type: "meta"
status: "active"
schema: "v1"
search_terms:
  - "provider"
  - "gemini"
  - "cli"
  - "configuration"
related:
  - "NONE"
tags:
  - "#harness-meta"
  - "#harness-infrastructure"
  - "#config"
  - "#gemini"
---

# Switch to Gemini CLI Provider

## Context

We are switching the harness agents to use the `gemini` CLI provider instead of the direct HTTP API implementation.
This allows us to leverage the `gemini` CLI tool for model interactions, which may handle authentication and model routing differently/better for our current environment.

## Decision

- Update `.harness/config.yml` to set `agents.provider` to `gemini`.
- Use the existing `.harness/framework/providers/gemini.mjs` implementation.

## Consequences

- Harness agents will now invoke the `gemini` CLI.
- Ensure `gemini` CLI is installed and authenticated in the environment (Verified: v0.22.5 installed).
- Latency may change depending on CLI overhead vs direct API calls.
- `gemini.mjs` uses `gemini-3-flash-preview` by default.

## Search terms

provider, gemini, cli, configuration

## Related

NONE

## Tags

- #harness-meta
- #harness-infrastructure
- #config
- #gemini

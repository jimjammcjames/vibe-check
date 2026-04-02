---
date: "2026-04-02"
type: "fix"
status: "active"
schema: "v3"
search_terms:
  - "github actions missing agent provider"
  - "codex not found harness guardian"
  - "skip agent reviews when no provider available"
related_entries:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
  - ".harness/context/history/2026-04-02-harness-post-smoke-timeout-detection.md"
affected_files:
  - ".github/workflows/harness.yml"
  - ".harness/Harness.md"
  - ".harness/framework/cli/harness.mjs"
  - ".harness/framework/lib/agent-runner.mjs"
  - ".harness/framework/lib/provider-selection.mjs"
  - ".harness/framework/scripts/agent-code-review.mjs"
  - ".harness/setup/AGENT-SETUP.md"
  - ".harness/setup/harness-ci.yml"
  - "harness-tests/tests/provider-selection.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-04-01-2124-extract-portable-harness-upgrades.md"
error_signature: "GitHub Actions Harness CI failed in harness-guardian after local harness:ci passed because no configured agent provider CLI was runnable on the hosted runner (`/bin/sh: 1: codex: not found`)."
tags:
  - "#harness-meta"
  - "#ci"
  - "#providers"
---

# ci-agent-provider-availability

## Summary

Made harness agent-provider selection availability-aware and added an explicit
hosted-CI escape hatch so GitHub Actions can skip only provider-backed agent
reviews when no configured provider is runnable on that runner.

## Request / Intent

Unblock PR #4 without weakening local harness review guarantees by fixing the
generic parent so hosted CI behaves predictably when provider CLIs are absent.

## Context

After the smoke-test and tripwire fixes cleared locally, GitHub Actions still
failed on PR #4 even though local `npm run harness:ci` passed. The hosted run
reached `harness-guardian`, attempted the configured `gemini` provider, fell
through to the configured `codex` fallback, and then failed because the runner
had no runnable provider CLI or API credentials configured.

## Error

The failing GitHub Actions log showed:

- `Using provider: gemini`
- `Provider gemini did not produce expected output. Falling back to provider: codex`
- `/bin/sh: 1: codex: not found`
- `Agent did not produce GUARDIAN_RESULT.json`

## What Changed

- Added a shared provider-selection helper that separates configured,
  available, and unavailable providers.
- Updated `runAgent()` to skip unavailable providers and return a clear
  `No configured providers available` error when none are runnable.
- Routed `agent-code-review` through `runAgent()` so it uses the same provider
  selection and fallback behavior as the other harness agents.
- Restored provider-specific config merging in `runAgent()` so the generic HTTP
  review-model defaults no longer leak into Gemini, Codex, or Copilot fallback
  attempts.
- Added `HARNESS_ALLOW_MISSING_AGENT_PROVIDER=1` handling in `harness:ci` so
  hosted CI can explicitly skip only the provider-backed agent-review commands
  when every configured provider is unavailable.
- Updated the checked-in workflow template and live workflow to set that env
  flag, and documented the behavior in the harness setup docs.
- Added focused unit coverage for provider selection, unavailable-provider
  reporting, and CI-stage agent-step filtering.

## Validation

- `npm test`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `HARNESS_ALLOW_MISSING_AGENT_PROVIDER=1 npm run harness:ci`
- GitHub Actions `Harness CI` on PR #4 after pushing the fix

## Systemic Gap

The generic parent assumed local agent-provider tooling would also exist on
hosted runners, but the workflow template never documented or encoded that
assumption. That made GitHub Actions fail late inside provider-backed reviews
even when the deterministic checks and local outer loop were already clean.

Gap Closure: Added test/validation: `harness-tests/tests/provider-selection.test.mjs`

## Class Prevention

When provider-backed reviews are part of the harness, model provider selection
as runtime capability discovery instead of a static config assumption, and make
hosted-CI degradation explicit, opt-in, and narrow so deterministic gates can
still run without silently masking real provider failures.

## Raw Notes

- The first post-smoke GitHub failure moved from the nested `post` smoke test
  to hosted-provider execution, confirming the smoke-test fix itself was no
  longer the merge blocker.
- The first shared-runner refactor leaked the generic HTTP review model into
  Codex fallback attempts, so `runAgent()` now strips provider-neutral model
  defaults back out for CLI providers unless they have explicit overrides.
- This change intentionally keeps local `harness:ci` strict; the hosted runner
  only skips agent-review commands when `HARNESS_ALLOW_MISSING_AGENT_PROVIDER=1`
  is set and every configured provider is unavailable.

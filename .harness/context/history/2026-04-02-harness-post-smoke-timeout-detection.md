---
date: "2026-04-02"
type: "fix"
status: "active"
schema: "v3"
search_terms:
  - "harness post smoke ETIMEDOUT"
  - "should recognize post command"
  - "nested execSync timeout"
related_entries:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
affected_files:
  - "harness-tests/tests/harness-cli.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-04-01-2124-extract-portable-harness-upgrades.md"
error_signature: "harness CLI post command: AssertionError should recognize post command"
tags:
  - "#harness-fix"
  - "#ci"
---

# harness-post-smoke-timeout-detection

## Summary

Hardened the `harness-cli` nested `post` smoke test so it recognizes timeout
failures that surface as `ETIMEDOUT`, which was causing local full-suite runs
and GitHub Actions to fail even though the command was being reached.

## Request / Intent

Land PR #4 cleanly by fixing the remaining Harness CI failure without weakening
the smoke test's purpose.

## Context

After pushing the portability changes, GitHub Actions run `23885632792` for PR
#4 still failed in `npm test` on the `harness CLI` suite. The failing subtest
was `post command -> starts post verification`, and reproducing the full suite
locally showed the same assertion could fail when Node reported the nested
`execSync` timeout via `error.code === "ETIMEDOUT"` instead of the previously
handled signal/message combinations.

## Error

- GitHub Actions: [PR #4 run 23885632792](https://github.com/jimjammcjames/vibe-check/actions/runs/23885632792)
- Failing assertion: `AssertionError: should recognize post command`
- Failing subtest: `harness CLI -> post command -> starts post verification`

## What Changed

Expanded the smoke-test timeout heuristic in
`harness-tests/tests/harness-cli.test.mjs` to treat `error.code ===
"ETIMEDOUT"` and `error.message` containing `ETIMEDOUT` as valid timeout-shaped
signals, alongside the existing `SIGTERM`, `killed`, and output-based checks.

## Validation

- `npm test`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`

## Systemic Gap

The smoke test assumed timeout behavior would always surface as either
`SIGTERM`, `killed === true`, or the literal phrase `"timed out"`, which made
the assertion brittle across platforms and runner conditions.

Gap Closure: Added test/validation: `harness-tests/tests/harness-cli.test.mjs`

## Class Prevention

When a smoke test intentionally relies on killing a nested process, recognize a
family of timeout indicators rather than one wording or one platform-specific
error shape, and verify the heuristic under both isolated and full-suite runs
before assuming the timeout handling is portable across runners.

## Raw Notes

- Local direct reproduction showed `spawnSync /bin/sh ETIMEDOUT` with
  `signal: "SIGTERM"` and partial `harness:post` stdout.
- The full `npm test` suite reproduced the failure before the fix and passed
  afterward.
- The fix stays inside test coverage and does not weaken any harness runtime
  enforcement.

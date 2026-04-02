---
date: "2026-04-02"
type: "fix"
status: "active"
schema: "v3"
search_terms:
  - "base tripwire config loader"
  - "test discovery mismatch detected"
  - "shared harness config"
related_entries:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
  - ".harness/context/history/2026-04-02-harness-post-smoke-timeout-detection.md"
affected_files:
  - ".harness/framework/scripts/base-tripwire.mjs"
  - "harness-tests/tests/base-tripwire.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-04-01-2124-extract-portable-harness-upgrades.md"
error_signature: "Base-Commit Tripwire: Test discovery mismatch detected"
tags:
  - "#harness-fix"
  - "#tripwire"
---

# base-tripwire-shared-config-loader

## Summary

Fixed `base-tripwire` so it reads reviewer config through the shared harness
config loader, which restored config-backed test discovery and stopped the
tripwire from falsely reporting that no tests were discovered.

## Request / Intent

Unblock the final harness outer loop so the PR can be pushed and merged with a
clean self-run.

## Context

Once the CI smoke-test follow-up was split into a proper `fix` entry,
`base-tripwire` began applying on this branch and exposed a second issue:
running `node .harness/framework/scripts/base-tripwire.mjs` reported `Test
discovery mismatch detected` even though the changed test files were present in
the temporary worktree. Passing the same discovery command through env
overrides worked immediately, which isolated the fault to the script's own
config-loading path.

## Error

- Script failure: `Base-Commit Tripwire: Test discovery mismatch detected`
- Symptom: `Tests discovered by runner: (none matching)` even though the
  worktree contained matching `*.test.mjs` files
- Repro before fix: `node .harness/framework/scripts/base-tripwire.mjs`

## What Changed

Replaced `base-tripwire.mjs`'s ad hoc YAML parsing with the shared
`loadHarnessConfig()` helper so reviewer config is interpreted the same way
across harness surfaces. Also updated the integration tests to make stale
worktree cleanup deterministic and added coverage for the default
config-backed discovery path without env overrides.

## Validation

- `node --import tsx --test harness-tests/tests/base-tripwire.test.mjs`
- `node .harness/framework/scripts/base-tripwire.mjs`
- `npm test`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci`

## Systemic Gap

`base-tripwire.mjs` had drifted away from the rest of the harness by keeping a
local YAML parser instead of using the shared config loader, so config-backed
behavior could silently diverge and only show up once a fix entry activated the
tripwire.

Gap Closure: Added test/validation: `harness-tests/tests/base-tripwire.test.mjs`

## Class Prevention

Harness scripts that consume repo config should share one loader instead of
copying partial YAML parsing logic, and tripwire tests should set up their own
deterministic staged fixtures so branch-specific diffs do not mask or invent
config-loading failures.

## Raw Notes

- Env overrides for `HARNESS_LIST_TESTS_CMD` and `HARNESS_LIST_TESTS_PATTERN`
  made `base-tripwire` pass immediately, which ruled out the command itself.
- The shared loader fix restored the configured discovery command without
  weakening the tripwire check.
- The updated tests now cover both stale worktree cleanup and the default
  config-backed discovery path.

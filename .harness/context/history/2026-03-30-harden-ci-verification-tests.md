---
date: "2026-03-30"
type: "fix"
status: "active"
schema: "v3"
search_terms:
  - "harden harness ci verification tests"
  - "tripwire discovery test branch aware"
  - "guardian test hermetic http stub"
  - "post ci smoke timeout github runners"
related_entries:
  - ".harness/context/history/2026-03-30-simplify-session-lifecycle-and-trace-adoption-research.md"
affected_files:
  - ".gitignore"
  - ".harness/Harness.md"
  - ".harness/framework/lib/agent-runner.mjs"
  - ".harness/framework/scripts/policy-audit.mjs"
  - "HARNESS_EVOLUTION_REPORT.md"
  - "package-lock.json"
  - "harness-tests/tests/base-tripwire.test.mjs"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/harness-guardian.test.mjs"
  - "harness-tests/tests/mcp-gen.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-03-30-0758-remove-close-session-and-trace-research.md"
error_signature: "GitHub Actions npm test failures from brittle harness verification fixtures"
tags:
  - "#harness-meta"
---

# harden-ci-verification-tests

## Summary

Stabilized the canonical harness merge path so the PR can pass GitHub Actions
reliably: restored the committed npm lockfile expected by the workflow, cleaned
up the repo-wide formatter fallout, hardened the brittle verification tests, and
isolated `mcp-gen` temp fixtures so nested `test:local` runs do not delete each
other's state.

## Request / Intent

Land the canonical harness refresh PR cleanly by fixing the merge-time CI and
verification failures instead of bypassing them, so the merge path proves that
the harness can validate its own changes on GitHub runners.

## Context

The draft PR exposed a sequence of merge-time blockers. First, GitHub Actions
failed before any repo checks because `actions/setup-node` with `cache: npm`
expected a committed lockfile. Once that was fixed, the run reached the global
prettier gate and required repo-wide normalization on the touched harness files.
After those deterministic fixes, the latest GitHub Actions run still failed
inside `npm test`: `base-tripwire.test.mjs` assumed it controlled the entire
branch diff, `harness-guardian.test.mjs` depended on real provider binaries
that were not available on GitHub runners, the `post` smoke test still used an
aggressive two-second timeout that was brittle under CI load, and the
merge-time local rerun exposed that `harness-cli.test.mjs` intentionally spawns
another `test:local` process which raced with `mcp-gen.test.mjs` over a shared
fixture directory.

## Error

GitHub Actions reported failing verification tests instead of harness logic
regressions. The concrete signatures were:

- setup failure before checks because `package-lock.json` was excluded while the
  workflow used npm cache setup.
- repo-wide prettier failure once CI reached `npx prettier --check .`.
- `base-tripwire.test.mjs`: false discovery mismatch because the fixture did not
  include all diff-visible tests.
- `harness-guardian.test.mjs`: provider-dependent failure on runners without the
  expected local CLIs.
- `harness-cli.test.mjs`: brittle smoke timing for `post`/`ci` startup.
- `mcp-gen.test.mjs`: `ENOENT` when nested `test:local` runs deleted a shared
  `.tmp/mcp-gen` directory.

## What Changed

Treat all of these as one coherent fix category: merge-time CI stabilization for
the canonical harness refresh branch. Keep the product behavior unchanged, but
make the branch and its tests compatible with the real GitHub Actions
environment. That means tracking `package-lock.json`, keeping the formatter-only
normalization in the branch, building tripwire discovery expectations from the
actual diff-visible test set, using a child-process HTTP stub for guardian
verification, giving the `post`/`ci` smoke tests more startup headroom, and
namespacing `mcp-gen` temp roots by `process.pid`.

## Validation

- `node --test harness-tests/tests/base-tripwire.test.mjs harness-tests/tests/harness-cli.test.mjs harness-tests/tests/harness-guardian.test.mjs`
- `node --test harness-tests/tests/mcp-gen.test.mjs`
- `npm run harness:post`
- `npm run harness:ci` after converting this entry to a fix entry

## Systemic Gap

The merge path relied on assumptions that were true only on a warmed local
machine: lockfile caching without a committed lockfile, formatter cleanliness
without a repo-wide check pass, provider availability on CI runners, and a
single-process temp-root model even though the harness smoke tests recurse into
nested `test:local` runs. Gap Closure: `.gitignore`, `package-lock.json`,
`.harness/Harness.md`, `.harness/framework/lib/agent-runner.mjs`,
`.harness/framework/scripts/policy-audit.mjs`,
`harness-tests/tests/base-tripwire.test.mjs`,
`harness-tests/tests/harness-guardian.test.mjs`,
`harness-tests/tests/harness-cli.test.mjs`, and
`harness-tests/tests/mcp-gen.test.mjs` now reflect the actual CI and
multi-process execution environment.

## Class Prevention

When a harness test can run under nested smoke checks or in CI, it should avoid
fixed repo-local temp paths, avoid depending on locally installed provider
binaries, and derive expectations from the same branch-wide inputs the harness
itself uses. Future verification changes should be checked once in isolation and
once through the real harness loop so recursive or multi-process behavior is
caught before a PR is opened.

## Raw Notes

- The original in-process guardian stub deadlocked because `execSync` blocked
  the same event loop that needed to service the local HTTP server.
- `base-tripwire.mjs` correctly validates every diff-visible test file, not just
  the test fixture staged inside `base-tripwire.test.mjs`, so the test needed to
  become branch-aware.
- The previous two-second smoke timeout was enough locally but too tight for the
  GitHub runner when `npm` process startup lagged.
- `harness-cli.test.mjs` deliberately spawns nested `harness:post` / `harness:ci`
  commands, so any other suite using a fixed repo-local temp path needs
  process-level isolation.
- The CI stabilization work also includes the earlier lockfile and formatter
  fixes because those were part of the same merge-blocking sequence on this PR.

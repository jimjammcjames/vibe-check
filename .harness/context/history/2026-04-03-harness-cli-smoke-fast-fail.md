---
date: "2026-04-03"
type: "fix"
status: "active"
schema: "v3"
search_terms:
  - "harness cli smoke fast fail"
  - "nested post ci recursion leaves tripwire fixtures"
  - "cleanup baseline test stranded"
  - "hide npm npx in smoke env"
related_entries:
  - ".harness/context/history/2026-03-30-harden-ci-verification-tests.md"
  - ".harness/context/history/2026-04-02-harness-post-smoke-timeout-detection.md"
affected_files:
  - "harness-tests/tests/harness-cli.test.mjs"
session_refs:
  - ".harness/context/sessions/2026-04-02-0851-cross-repo-workflow-preferences.md"
error_signature: "harness:post policy audit sees synthetic 2099 tripwire fixtures after nested harness-cli smoke commands recurse into real verification"
tags:
  - "#harness-fix"
  - "#tests"
  - "#workflow"
---

# harness-cli-smoke-fast-fail

## Summary

Updated the `harness-cli` smoke tests to prove `post` and `ci` startup without
recursing into the real verification stack, which was leaving synthetic
tripwire fixtures staged in the repo and causing `harness:post` to fail for
unrelated work.

## Request / Intent

Unblock the requested PR-open-and-merge workflow for the `AGENTS.md` user
preferences change by fixing the harness test-side pollution that prevented
`harness:post` from completing cleanly.

## Context

The user asked to open a PR and merge the documentation change. The worktree
started detached, but before branching we needed truthful local validation. On
this repo, `harness:post` is the required medium gate before PR work. The
medium gate repeatedly failed even after missing local JS tooling was repaired,
and the failure surface showed synthetic files such as
`.harness/context/history/2099-01-01-tripwire-cleanup-test.md` and
`harness-tests/tests/cleanup-baseline.test.mjs` appearing in the repo after the
run. Recent history already documented brittle `post`/`ci` smoke timing in
`harness-cli.test.mjs`, so the next step was to trace how those nested smoke
tests interacted with recursive verification.

## Error

- `npm run harness:post` failed in `policy-audit.mjs` because the changed-file
  set suddenly included synthetic tripwire fixtures that were not part of the
  user change.
- Reproducing `npm run test:local` showed the included `harness-cli.test.mjs`
  smoke tests spawn nested `post` and `ci` commands.
- The nested `ci` smoke path can recurse into the full `npm test` suite, which
  includes `base-tripwire.test.mjs`; killing that nested verification by timeout
  strands temporary staged files in the main repo.

## What Changed

- Added a dedicated `runHarnessSmoke()` helper in
  `harness-tests/tests/harness-cli.test.mjs` that invokes the CLI via
  `process.execPath` instead of a shell string.
- Hid `npm`/`npx` from the nested smoke-test environment by setting `PATH=""`,
  which makes `post` and `ci` fail fast after printing their startup banners
  instead of recursively launching real verification.
- Added targeted cleanup for the known synthetic smoke fixtures before and after
  each smoke run so interrupted local runs do not pollute later policy checks.
- Kept the smoke tests' purpose intact: they still verify that the CLI
  recognizes `post` and `ci` and emits the expected startup output.

## Guidance Impact

No standing operator docs or skills changed directly in this fix. The durable
workflow impact is carried in the linked history/session artifacts: recursive
harness CLI smoke tests should fail fast and clean up their own synthetic
fixtures instead of depending on timeout-killed nested verification.

## Validation

- `npm run test:local`
- `npm run harness:post`
- `node .harness/framework/scripts/policy-audit.mjs`

## Systemic Gap

The smoke tests tried to recognize `post` and `ci` startup by launching real
recursive verification and relying on a timeout to stop it. That allowed child
processes to mutate repo-local synthetic fixtures before the parent test killed
them, so later policy checks failed on pollution that the original user change
never touched.

Gap Closure: Added test/validation: `harness-tests/tests/harness-cli.test.mjs`

## Class Prevention

When a smoke test only needs to prove command recognition, it should fail fast
before recursive stage commands can mutate shared repo state. If a test must
touch synthetic repo-local fixtures, it should also own deterministic cleanup of
those exact paths so an interrupted smoke run cannot poison later verification.

## Raw Notes

- `npm run test:local` itself passed, but the nested `post`/`ci` smoke checks in
  `harness-cli.test.mjs` were leaving behind the synthetic fixture files.
- The fixture names matched the files created by `base-tripwire.test.mjs`,
  which explained why the pollution only appeared after recursive smoke runs and
  not during ordinary isolated validation.

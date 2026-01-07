# CLI Test Pollution and Race Conditions

## Context

The `harness-cli.test.mjs` test suite was using random filenames (timestamps) for test fixtures. This caused:

1.  **Race conditions**: When tests ran in parallel or quickly in sequence, collisions could occur.
2.  **Repo pollution**: If a test failed before cleanup, random files were left in the worktree, which were not gitignored.

## Systemic Gap

**Non-Deterministic Test State**: The test infrastructure relied on creating "unique" filenames via randomness rather than deterministic, isolated paths. This made `git clean` or `.gitignore` ineffective against test artifacts and led to flaky tests.

**Gap Closure**:
Added validation: `harness-cli.test.mjs` (Stable Fixtures). Refactored tests to use stable, deterministic filenames (e.g., `test-fixture-learned-basic.md`) and updated `.gitignore` to exclude them.

## Search terms

testing, cli, race condition, pollution, deterministic, gitignore

## Related

NONE

## Tags

- #harness-fix
- #testing
- #stability

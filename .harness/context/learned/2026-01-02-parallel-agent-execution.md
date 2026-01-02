# Parallel Agent Execution

## Context

The `harness:post` verification command was running all checks sequentially. As we added more agents (Undocumented Detector, Review Adapter, Base Tripwire), the total execution time increased significantly, slowing down the developer loop.

## Decision

Updated the harness CLI to run "agent" commands in parallel while keeping foundational checks (tests, policy audit) sequential.

## Rationale

The Undocumented Detector and Review Adapter are independent read-only checks that only analyze the diff. They can run concurrently without conflicts.

**Note**: `base-tripwire` cannot be parallelized because it creates git worktrees, which conflicts with concurrent git operations (causes `.git/index` errors).

## Systemic Gap

**What infrastructure gap allowed this issue class?**

The harness CLI orchestrator `cmdPost` was designed with a simple sequential loop, lacking the capability to identify and parallelize independent tasks.

**Gap Closure**:
- Added parallel execution logic: `.harness/framework/cli/harness.mjs`
- Fixed undocumented-detector diff source: `.harness/framework/scripts/undocumented-detector.mjs` (changed from `HEAD~1` to `origin/main` to avoid false positives)
- Test coverage: `harness-tests/tests/harness-cli.test.mjs`

---

## Search terms

`parallel execution`, `harness optimization`, `performance`, `concurrency`, `Promise.all`

## Related

NONE

## Tags

#performance #harness #optimization #dx #basefail-exempt: Test changes are stability improvements (adding timeouts to prevent recursive npm test hangs) not regression tests

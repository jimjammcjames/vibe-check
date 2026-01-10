# Decision: Agent Script Naming Convention

## Context & Rationale

The two agent-backed scripts (`memory-coherence-checker.mjs` and `review-adapter.mjs`) were indistinguishable from the deterministic scripts by name alone. This made it unclear which scripts invoke LLM calls and incur latency/cost, vs which are purely deterministic.

## Technical Decision

Rename the agent-backed scripts with an `agent-` prefix:

- `memory-coherence-checker.mjs` → `agent-memory-coherence.mjs`
- `review-adapter.mjs` → `agent-code-review.mjs`

Updated references in:

- `.harness/config.yml` (CI stage commands)
- `harness-tests/tests/review-adapter-integration.test.mjs`
- `harness-tests/tests/review-adapter.test.mjs`

## Security & Integrity Impact

**No weakening of checks.** This is a pure rename with no functional changes. All existing enforcement logic remains intact. The naming convention improves clarity for developers understanding which scripts are expensive to run.

## Conformance & Enforcement

Verified by running `harness:post` — all policy checks pass after updating import paths in test files.

## Search terms

harness, agent, naming, convention, prefix, scripts

## Related

NONE

## Tags

- #harness-meta
- #architecture
- #naming-convention

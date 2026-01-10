# Decisions: Move Agent Checks to CI and Fix Agent Names

## Context & Rationale

harness:post is intended to be a fast, deterministic loop, but it was running
agent-backed checks. The agent script rename left stale references in the CLI,
which could break review flows or misclassify agent steps.

## Technical Decision

- Remove agent-backed checks from the post stage in `.harness/config.yml`.
- Keep agent checks in the ci stage only.
- Update CLI references to the `agent-` script names.
- Remove the `harness:review` command in favor of CI-only review.
- Align harness docs/test descriptions with the updated naming and post scope.

## Security & Integrity Impact

This shifts agent enforcement later in the pipeline but does not remove it.
CI still runs guardian, undocumented-detector, memory coherence, tripwire, and
code review. Local post runs remain deterministic, reducing latency while
preserving enforcement at the CI gate.

## Conformance & Enforcement

Verify with:

- `npm run harness:post` (should run only deterministic checks)
- `npm run harness:ci` (should run agents with new names)

## Search terms

harness, post stage, agent checks, agent-code-review, agent-memory-coherence, review

## Related

- .harness/context/decisions/harness/2026-01-08-agent-script-naming-convention.md
- .harness/context/decisions/harness/2026-01-06-post-medium-ci-heavy.md

## Tags

- #harness-meta
- #integrity
- #architecture

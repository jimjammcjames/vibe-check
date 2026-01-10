# Decisions: Medium Post, Heavy CI Loop Split

## Context & Rationale

The post stage was effectively a full gate (tests + tripwire + review), which made the medium loop too slow for routine iteration. We want a three-loop workflow where iterate is inner, post is a medium signal gate, and CI is the outermost enforcement gate.

## Technical Decision

- Remove base-tripwire and review-adapter from the post stage in `.harness/config.yml`.
- Keep `npm test`, policy-audit, test-lint, and documentation agents in post.
- Keep full lint/typecheck plus base-tripwire and review-adapter in ci.
- Update CLI messaging and Harness.md to describe the loop tiers.

## Security & Integrity Impact

Local enforcement is lighter because tripwire and review move to CI, but no checks are removed from the merge gate. Rule B still enforces test deltas in post, and CI remains the blocking authority. Developers can still run `harness:ci` locally when needed.

## Conformance & Enforcement

- Verification: run `npm run harness:post` for the medium gate and `npm run harness:ci` for the full gate.
- No new automated tests added; behavior is validated via stage config and existing harness commands.

## Search terms

post loop, medium gate, tripwire, review-adapter, ci gate

## Related

- .harness/context/decisions/harness/2026-01-03-harness-latency-optimization.md
- .harness/context/learned/2025-12-31-optimizing-harness-post.md

## Tags

- #harness-meta
- #workflow
- #ci

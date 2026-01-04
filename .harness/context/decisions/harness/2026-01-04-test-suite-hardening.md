# Decisions: Harden Harness Tests (Behavioral + Hermetic)

## Context & Rationale
The harness test suite included non-hermetic tests (live API calls) and pattern-only assertions
that could pass despite behavioral regressions. This undermines the harness goal of preventing
gaming and reduces confidence in CI. The framework also executed script entrypoints on import,
making it hard to unit-test real logic without invoking git or network dependencies.

## Technical Decision
Expose small, deterministic helpers from policy-audit and review-adapter, and guard their
`main()` execution so tests can import logic without running CLI flows. Add a deterministic
test-lint script to block high-confidence test anti-patterns, allow deterministic dates for
harness entry creation via HARNESS_DATE, update harness tests to exercise real behavior through
helpers and the stub provider, tighten memory-coherence JSON output instructions for Gemini,
and remove live API calls from default test runs.

## Security & Integrity Impact
This strengthens enforcement by reducing false positives/negatives and ensuring tests validate
real behavior. The CLI behavior remains unchanged when run directly; the only change is that
imports no longer trigger execution. No safeguards are weakened, and stub-only integration tests
avoid network reliance while still validating schema and adapter flow.

## Conformance & Enforcement
Behavioral tests now cover review result normalization, provider config selection, adapter
selection, systemic gap validation, and deterministic test-lint rules. The harness CLI adds
coverage for `new:meta` creation. These changes ensure CI exercises the actual enforcement
logic with hermetic inputs and blocks obvious gaming.

## Search terms
harness meta, review-adapter, policy-audit, test-lint, hermetic tests, stub provider, main guard

## Related
NONE

## Tags
- #harness-meta
- #integrity
- #testing

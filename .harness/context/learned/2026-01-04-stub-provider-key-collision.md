# Stub Provider Key Collision in Agent Config

## Context

The `harness-guardian` tests were failing or behaving inconsistently. It was discovered that the `stub.mjs` provider definition contained a duplicate key `RESULT.json` in the `DEFAULT_RESPONSES` object. This caused the `undocumented-detector` response schema to overwrite the `harness-guardian` schema (which also used `RESULT.json`), leading to missing fields (`verdict`) during Guardian tests.

## Systemic Gap

**Implicit Output Filename Coupling**: The framework relied on a generic `RESULT.json` filename for multiple distinct agents (`harness-guardian`and `undocumented-detector`). This namespace collision meant that any shared configuration provider (like `stub` or a mocked sandbox) could not distinguish between the two agents' expected outputs.

**Gap Closure**:
Added validation: `harness-guardian.mjs` (Namespace Separation) and `harness-guardian.test.mjs` (Regression Test). Renamed the output file to `GUARDIAN_RESULT.json` and verified with tests.

## Search terms

stub, provider, key collision, json, schema, guardian, undocumented-detector

## Related

- [Harness Log Verbosity (Parent)](../decisions/harness/2026-01-04-harness-log-verbosity-controls.md)

## Tags

- #harness-fix
- #integrity
- #testing

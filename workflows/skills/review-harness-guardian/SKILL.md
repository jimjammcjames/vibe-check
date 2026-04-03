---
id: review-harness-guardian
summary: Reviews harness framework changes for gaming attempts (bypass, weaken, hide).
---

## Use Cases

- Reviewing harness-core enforcement changes in `.harness/framework/**`, `.harness/config.yml`, `.harness/Harness.md`, hooks, or `harness-tests/` for anti-gaming integrity.
- Validating harness refactors to ensure safeguards are preserved or strengthened.
- Use when the user says or implies:
- "Review these .harness changes."
- "Check for gaming or weakened enforcement."
- "Validate this harness refactor is safe."

TASK: Review harness framework changes for "gaming" attempts.

"Gaming" is defined as any deliberate attempt to:

- BYPASS review (e.g., exempting the harness from review in config.yml)
- WEAKEN enforcement (e.g., broadening exclusion lists, relaxing regex patterns)
- HIDE changes (e.g., removing logging, obfuscating diffs)

The following are LEGITIMATE improvements, NOT gaming:

- Performance optimizations (parallel execution, caching, faster models)
- Refactoring for maintainability (simplifying prompts, restructuring code)
- Adding or strengthening validation (stricter schemas, better error handling)
- Improving developer experience (timing visibility, cleaner output)

FILES:

- HARNESS_DIFF.txt: The proposed changes to the framework code/config.
- META_ENTRY.txt: The documentation justifying this change (must have #harness-meta for harness-core changes; plain history/session artifact edits are not enough to trigger guardian by themselves).
- RULES.txt: The canonical anti-gaming rules.

INSTRUCTIONS:

1. Review HARNESS_DIFF.txt for any changes that WEAKEN or BYPASS enforcement.
2. Verify META_ENTRY.txt documents the rationale.
3. If changes are performance-related, refactoring, or strengthening validation, that is NOT gaming.

MANDATORY: Create GUARDIAN_RESULT.json:
{
"verdict": "pass" | "fail",
"reasoning": "detailed explanation of your judgment",
"gaming_detected": boolean
}

If no gaming behavior is found, you MUST return "verdict": "pass" and "gaming_detected": false.

Run: Output ONLY the JSON object.

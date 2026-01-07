# undocumented-changes-detector

## Context

The main compliance review agent was trying to detect undocumented changes as one of many tasks, leading to unreliable results. The agent would sometimes skip verification steps due to the complexity of the full prompt.

## Decision

Created a separate, focused agent (`undocumented-detector.mjs`) dedicated only to checking if all change clusters in the diff are covered by learned entries. This follows the principle of separation of concerns.

## Rationale

Single-purpose agents are more reliable than multi-purpose ones:

- Simpler prompts with one clear goal
- Uses low reasoning effort for speed
- Fails explicitly if changes lack documentation
- Independent verification layer

## Systemic Gap

**What infrastructure gap allowed this issue class?**

No validation existed to ensure changes had corresponding documentation. The main review agent was overloaded with multiple responsibilities leading to unreliable coverage detection.

**Gap Closure**:

- Added validation: `.harness/framework/scripts/undocumented-detector.mjs`
- Added test: `harness-tests/tests/policy-audit.test.mjs` (systemic gap tests)

This adds a focused agent that catches undocumented changes before commit.

---

## Search terms

`undocumented changes`, `documentation coverage`, `change clusters`, `separation of concerns`

## Related

NONE

## Tags

#harness #infrastructure #agents #documentation

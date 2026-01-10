---
date: "2026-01-01"
type: "decision"
status: "active"
schema: "v1"
search_terms:
  - "`systemic gap`"
  - "`meta-analysis`"
  - "`3-step chain`"
  - "`gap closure`"
  - "`infrastructure gap`"
related:
  - "NONE"
tags:
  - "#harness"
  - "#enforcement"
  - "#meta-analysis"
  - "#deterministic"
---

# systemic-gap-enforcement

## Context

Meta-analysis for harness entries was optional. Agents could document a fix without explaining what infrastructure gap allowed the issue class, leading to recurring problems.

## Decision

Made systemic analysis mandatory for learned entries with a 3-step chain enforced by Rule C and the review agent:

1. **Bandaid** → Fix the immediate issue
2. **Meta-Analysis** → Identify infrastructure gap
3. **Close Gap** → Add test/validation (file path must be in diff)

## Rationale

Deterministic enforcement prevents recurring issue classes:

- Rule C validates `## Systemic Gap` section exists with substantive content
- Rule C checks gap closure file paths appear in commit diff
- Review agent flags shallow analysis

## Systemic Gap

**What infrastructure gap allowed this issue class?**

No enforcement existed for meta-analysis. Entries could be compliant without explaining why the issue happened or how similar issues would be prevented.

**Gap Closure**:

- Added validation: `.harness/framework/scripts/policy-audit.mjs` (Rule C enhancement)
- Added test: `harness-tests/tests/policy-audit.test.mjs` (Systemic Gap tests)

---

## Search terms

`systemic gap`, `meta-analysis`, `3-step chain`, `gap closure`, `infrastructure gap`

## Related

NONE

## Tags

#harness #enforcement #meta-analysis #deterministic

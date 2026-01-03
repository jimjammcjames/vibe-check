# undocumented-detector-doc-vs-code

## Context

The `undocumented-detector` agent was flagging README.md updates as needing learned entries because the LLM prompt didn't clearly distinguish between "documentation files" and "code files."

An agent attempted to fix this by exempting `.harness/framework/**` from review - this was GAMING the system!

## Decision

Updated the `undocumented-detector.mjs` prompt to:
1. Clearly distinguish between "documentation files" (README, markdown) and "code files"
2. Explicitly state that README updates explaining existing functionality don't need entries
3. EXPLICITLY STATE that harness framework changes ARE code and DO need entries

## Rationale

The fix targets the right problem (LLM misclassifying README as code) without creating an escape hatch for gaming. Harness code remains subject to full scrutiny.

## Systemic Gap

**What infrastructure gap allowed this issue class?**

The undocumented-detector prompt was ambiguous about what constitutes "code" vs "documentation." This allowed the LLM to over-classify README updates as needing entries.

Additionally, there was no explicit anti-gaming guidance in Harness.md to prevent agents from exempting harness code.

**Gap Closure** (REQUIRED):
- Added agent: `harness-guardian.mjs` - blocks gaming attempts
- Added test: `harness-tests/tests/harness-guardian.test.mjs`
- Added rule: Harness.md anti-gaming rules section

The test verifies BEHAVIOR (not just pattern matching):
1. Gaming patterns are detected in mock diffs
2. Config.yml does NOT exempt harness framework
3. Harness guardian blocks actual gaming attempts

---

## Search terms

`undocumented-detector`, `README`, `documentation`, `harness exempt`, `gaming`

## Related

NONE

## Tags

#harness #anti-gaming #documentation #undocumented-detector

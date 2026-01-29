---
date: "2026-01-29"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "harness prep"
  - "skills summary"
  - "skill enumeration"
  - "listSkillMeta"
related:
  - "NONE"
tags:
  - "#harness-meta"
  - "#feature"
---

# prep-skills-summary

## Summary

Enhanced `harness:prep` command to display a JSON summary of all available skills, listing their IDs and descriptions. This improves discoverability by showing developers what workflow capabilities exist in the repository immediately after running the prep command.

## Context

The `harness:prep` command prints the MUST block from Harness.md to orient developers. Skills are reusable workflow bundles in `workflows/skills/`, but there was no easy way to see what skills were available without manually exploring the directory structure. Adding a skill summary to the prep output provides immediate visibility into available automation capabilities.

## Technical Decision

**Files Modified:**

- `.harness/framework/lib/skills.mjs` - Added `listSkillMeta()` function that enumerates skill folders, reads frontmatter, and returns sorted array of `{ id, summary }` metadata.
- `.harness/framework/cli/harness.mjs` - Integrated skill listing into `cmdPrep()` by importing `listSkillMeta()` and printing JSON output after the MUST block with an "AVAILABLE SKILLS" banner.
- `harness-tests/tests/harness-cli.test.mjs` - Added integration test verifying that prep command outputs valid JSON with properly structured skill metadata.

**Implementation Details:**

- Skills are sorted by ID for deterministic output
- Output format is JSON for programmatic parsing if needed
- Visual banner matches existing prep output styling
- Empty skills directory returns empty array (graceful degradation)

## Security & Integrity Impact

**Impact: Neutral / Positive**

This is a read-only feature that enumerates existing skill files without modifying any state or introducing new execution paths. The security posture is neutral with slight positive impact on transparency:

- **Read-only operation**: Only reads existing skill files from `workflows/skills/`
- **No new attack surface**: Uses existing frontmatter parsing (already in use)
- **Transparency improvement**: Makes available capabilities more visible
- **No authorization bypass**: Does not grant access to restricted resources

## Conformance & Enforcement

**Test Coverage:**

- Added integration test in `harness-cli.test.mjs` that verifies:
  - Skills summary appears in prep output
  - JSON is well-formed and parseable
  - Each skill has required `id` and `summary` fields
  - Skills are sorted alphabetically by ID
  - Test runs as part of standard test suite (`npm test`)

**Documentation:**

- Skills remain self-documenting via frontmatter in `workflows/skills/*/SKILL.md`
- No changes to skill authoring process or frontmatter schema
- Prep command usage remains unchanged from user perspective

## Raw Notes

User request: "harness prep command should inject a summary of all skills by iterating through the skills folder and outputting skill names and summaries as JSON."

Verified with user on output format (JSON) and location (after MUST block).

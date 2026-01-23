---
date: "2026-01-23"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "skills"
  - "prompts"
  - "review"
  - "portability"
related:
  - "2026-01-21-portable-comments.md"
  - "2026-01-22-remove-mcp-gen-runner.md"
tags:
  - "#harness-meta"
---

# review-prompts-as-skills

## Summary

Externalized all review-agent prompts into skills under workflows/skills/ and
made harness review scripts load them at runtime via a new skills loader.

## Context

Review agent prompts were hardcoded as string constants inside framework
scripts. This made them invisible to external agents (Cursor, Codex, Claude)
and difficult to customize or inspect. As part of making the harness portable,
we moved prompts to discoverable skill files that can be read by any agent.

## Technical Decision

- Created 4 skill files under `workflows/skills/`:
  - `review-code/SKILL.md` (code compliance reviewer)
  - `review-memory-coherence/SKILL.md` (entry coherence checker)
  - `review-harness-guardian/SKILL.md` (gaming detector)
  - `review-undocumented/SKILL.md` (documentation coverage checker)
- Added `.harness/framework/lib/skills.mjs` with `loadSkillPrompt(id)` function.
- Updated all 4 review scripts to call `loadSkillPrompt()` instead of using
  inline prompt strings.
- Removed the obsolete `workflows/skills/stub/` placeholder.

## Security & Integrity Impact

- Enforcement behavior is unchanged; prompts are identical to before.
- Skills are loaded at runtime from disk, so modifications are visible in git.
- No new attack surface; skill files are read-only from the scripts' perspective.
- External agents can now read and follow the same prompts, improving alignment.

## Conformance & Enforcement

- Harness Guardian satisfied via this meta entry.
- Runtime loading uses the existing frontmatter parser from history-entry.mjs.
- Skills follow the standard SKILL.md format with id/summary frontmatter.

## Raw Notes

Skills created:

- workflows/skills/review-code/SKILL.md
- workflows/skills/review-memory-coherence/SKILL.md
- workflows/skills/review-harness-guardian/SKILL.md
- workflows/skills/review-undocumented/SKILL.md

Loader added:

- .harness/framework/lib/skills.mjs

Scripts updated:

- .harness/framework/scripts/agent-code-review.mjs
- .harness/framework/scripts/agent-memory-coherence.mjs
- .harness/framework/scripts/harness-guardian.mjs
- .harness/framework/scripts/undocumented-detector.mjs

---
date: "2026-04-02"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "moves life.exe meta learning codification"
  - "guidance impact durable surface contracts"
  - "skill use cases enforcement"
related_entries:
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
affected_files:
  - ".harness/Harness.md"
  - ".harness/framework/scripts/policy-audit.mjs"
  - ".harness/framework/templates/history-decision.md"
  - ".harness/framework/templates/history-fix.md"
  - ".harness/framework/templates/history-meta.md"
  - ".harness/framework/templates/session.md"
  - "AGENTS.md"
  - "harness-tests/tests/base-tripwire.test.mjs"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/policy-audit.test.mjs"
  - "harness-tests/tests/skills.test.mjs"
  - "workflows/skills/codify-learnings/SKILL.md"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/review-code/SKILL.md"
  - "workflows/skills/review-harness-guardian/SKILL.md"
  - "workflows/skills/review-memory-coherence/SKILL.md"
  - "workflows/skills/review-skill/SKILL.md"
  - "workflows/skills/review-undocumented/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-04-02-0852-abstract-meta-codification-port.md"
tags:
  - "#harness-meta"
  - "#skills"
  - "#workflow"
---

# abstract-meta-codification-behaviors

## Summary

Abstracted the strongest meta-learning and proactive codification behaviors from
`moves` and `life.exe` into this repo's generic harness surfaces. The port adds
explicit guidance-impact tracking to new context artifacts, restores richer
meta-review and codify prompts, requires every skill to publish concrete use
cases, and introduces a portable `durable-surface-contracts` skill so long-lived
runtime or automation behavior can be documented here without importing
`life.exe`'s repo-specific feature catalog.

## Context

The repo already had the first-wave portability work from `moves`, including
prep-time skills overview sync, staged history/session enforcement, and core
codification skills. A direct comparison showed several higher-order behaviors
were still missing in the abstract: `moves` had stronger self-describing
review/codify prompts plus use-case discipline on every skill, while `life.exe`
had made guidance followthrough, session-as-you-go notes, and durable surface
validation/monitoring contracts explicit parts of the tracked workflow. The
user asked for those meta-learning behaviors themselves to exist here, not the
product-specific machinery around them.

## Technical Decision

Port the reusable behavior, not the repo-specific implementations. Strengthen
the generic skills and tests with the richer `moves` prompt patterns, add a
`Guidance Impact` section to new history/session templates plus policy-audit
enforcement, update the canonical docs so agents search sessions as well as
history and keep the session current during work, and add a generic
`durable-surface-contracts` skill that captures the abstract contract behind
`life.exe`'s feature catalog and monitor policy without imposing its YAML
schema on every downstream repo.

## Security & Integrity Impact

This makes the harness more fail-closed around documentation drift without
expanding runtime permissions. Guidance changes now have an explicit home in
tracked artifacts, skill discoverability is testable instead of aspirational,
and long-lived runtime/automation surfaces are less likely to ship with hidden
entrypoints or vague validation stories. No new secret-bearing runtime surface
was introduced.

## Conformance & Enforcement

- `policy-audit.mjs` now requires `## Guidance Impact` on v3 history entries
  and session artifacts.
- `harness-tests/tests/skills.test.mjs` now fails if any skill lacks a
  `## Use Cases` section.
- The review/codify skills now carry stronger trigger guidance, session-aware
  review prompts, and a generic durable-surface contract playbook.
- `harness:prep` regenerates the expanded skills overview so the new skill and
  use-case metadata stay visible in `AGENTS.md`.

## Guidance Impact

Updated both the always-on repo guidance and the harness contract to treat
guidance followthrough as first-class data: agents now search sessions as well
as history, keep the active session updated during work, record explicit
guidance impact in new artifacts, and distinguish manual validation from
durable monitoring coverage. The new `durable-surface-contracts` skill is the
abstract home for the `life.exe` feature-catalog idea.

## Raw Notes

- `moves` supplied the richer skill-use-case discipline plus stronger review and
  codify prompts.
- `life.exe` supplied the guidance-followthrough and durable-surface contract
  ideas.
- The stricter history audit exposed one existing test interaction:
  `base-tripwire.test.mjs` writes temporary strict-entry fixtures into the real
  history tree, so the fixture itself had to be upgraded to the current v3
  contract and then moved onto an isolated temporary `GIT_INDEX_FILE` during
  dogfooding runs instead of weakening policy audit.
- Kept the port generic; did not import `life.exe`'s repo-specific
  `system/features/*.yaml` schema or NanoClaw boundary rules.

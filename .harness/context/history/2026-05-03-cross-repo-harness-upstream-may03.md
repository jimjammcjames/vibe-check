---
date: "2026-05-03"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "cross repo harness upstream may 03"
  - "session slug retry shell quoting"
  - "codify learnings artifact routing"
  - "merge main open pr review skill source of truth"
  - "durable surface monitor taxonomy validation suites"
related_entries:
  - ".harness/context/history/2026-04-12-cross-repo-portability-uplift.md"
  - ".harness/context/history/2026-04-26-cross-repo-harness-upstream-apr26.md"
affected_files:
  - ".harness/framework/cli/harness.mjs"
  - "AGENTS.md"
  - "harness-tests/tests/harness-cli.test.mjs"
  - "harness-tests/tests/harness-session-retry.test.mjs"
  - "workflows/skills/codify-learnings/SKILL.md"
  - "workflows/skills/durable-surface-contracts/SKILL.md"
  - "workflows/skills/merge-main-open-pr/SKILL.md"
  - "workflows/skills/review-skill/SKILL.md"
session_refs:
  - ".harness/context/sessions/2026-05-03-1929-cross-repo-harness-extract-may03.md"
tags:
  - "#harness-meta"
  - "#workflow"
  - "#portability"
  - "#automation"
---

# cross-repo-harness-upstream-may03

## Summary

Ported the strongest remaining repo-agnostic improvements discovered in
`moves`, `moves-algorithm`, `life.exe`, and the shared `compound` / `extract`
automation memory: safer session-link recovery in the harness CLI, stronger
artifact-routing codification guidance, clearer PR-prep/review source-of-truth
rules, and a more explicit durable-surface monitoring/validation contract.

## Context

The parent already carried the earlier April 12 and April 26 cross-repo
extractions, so this May 3 pass focused on what had changed since then instead
of replaying the same wish list. Read-only subagents scanned `moves`,
`moves-algorithm`, and `life.exe` for recent harness history, current harness
surface differences, and compound-automation context. The findings converged on
three realities:

- `moves` had the only fresh concrete parent-worthy improvements: bounded
  `--session-slug` retry, exact-selector self-check coverage for `new:session`,
  safe shell-quoted recovery hints, and stronger skill-owner guidance around
  codification and PR prep.
- `moves-algorithm` contributed mainly future design pressure rather than
  ready-to-copy code: mixed-runtime bootstrap recovery wording and the abstract
  idea of manifest-driven cross-repo contract verification.
- `life.exe` contributed mostly conceptual durability patterns rather than a
  drop-in harness layer: automation registries, reusable monitor taxonomy,
  validation-suite registration, and composed automation health stacks.

The extract memory and the linked April meta threads also confirmed that the
runtime bridge, safe Jest wrapper, merge-scope checker, notification manifest
runner, and `life.exe` feature/automation catalogs were already known but still
not cleanly generic enough to import directly into the parent.

## Technical Decision

Land only the improvements that fit the existing parent owners without adding a
new abstraction layer first:

- harden `.harness/framework/cli/harness.mjs` so explicit `--session-slug`
  lookups retry briefly when a just-created session file is not visible yet,
  `new:session` validates its own timestamped selector through the same retry
  path, duplicate session slugs fail without retry noise, and recovery commands
  shell-quote user-controlled slug input safely
- cover that behavior in `harness-tests/tests/harness-session-retry.test.mjs`
- strengthen `codify-learnings` with abstraction-first codification,
  owner-routing before edits, and an explicit skill-gap repair rule
- add a `review-skill` source-of-truth section and make
  `merge-main-open-pr` depend on that source instead of stale shorthand, while
  also clarifying bootstrap preflight, explicit merge reasons, and normal PR as
  the default publish mode
- expand `durable-surface-contracts` with monitor-taxonomy and central
  validation-suite registration guidance adapted from `life.exe`
- add small always-on AGENTS clarifications about bootstrap/tooling recovery
  and keeping judgment-heavy code-health concerns in skills/review prompts

Deliberately skip the larger downstream mechanisms for now:

- `moves` runtime bridge, safe Jest wrapper, and merge-scope checker
- `moves-algorithm` notification-specific manifest runner
- `life.exe` automation registries, feature catalogs, and operational control
  plane rules

Those still need a cleaner parent abstraction pass instead of a direct import.

## Security & Integrity Impact

The harness CLI change strengthens integrity rather than weakening it: session
linking is less race-prone, ambiguous selectors still fail closed, and recovery
messages no longer encourage unsafe shell copy-paste for malformed slug input.
The skill and AGENTS updates also reduce process drift by tightening the owner
boundary for codification, PR-prep review sequencing, and durable automation
validation/monitoring contracts without adding any new bypasses or review
exemptions.

## Conformance & Enforcement

Validation on the candidate so far:

- `node --test harness-tests/tests/harness-cli.test.mjs harness-tests/tests/harness-session-retry.test.mjs`
- `npm run harness:prep`
- `npm run harness:iterate`
- `npm run harness:post`
- `npm run harness:post -- --staged`
- `npm run harness:ci` reached `harness-guardian` and then blocked only on the
  provider-backed agent environment: Gemini produced no verdict, and Codex
  fallback failed because the sandbox could not access `~/.codex/sessions` or
  refresh models over the network.

## Guidance Impact

`AGENTS.md` now treats bootstrap/tooling recovery as actionable and captures the
generic rule that judgment-heavy code-health concerns belong in skills, review
prompts, or targeted tests rather than in new brittle blockers. The
`codify-learnings`, `review-skill`, `merge-main-open-pr`, and
`durable-surface-contracts` skills now reflect the stronger parent contract
validated across the sibling repos, while the harness CLI and tests codify the
new session-linking behavior directly.

## Raw Notes

- `moves-algorithm` had no qualifying past-week harness history or session
  artifacts to upstream; its strongest signal was the future manifest-driven
  shared-contract pattern.
- `life.exe` had no qualifying past-week history/session changes either; its
  strongest signals were reusable monitor taxonomy, validation-suite
  registration, and automation registry patterns.
- The automation memory confirmed that the April 26 extract had already
  evaluated the bigger runtime bridge / merge-scope / registry ideas and
  intentionally held them back, so this entry preserves that decision instead
  of silently revisiting it as if it were new.

---
date: "2026-04-02"
type: "decision"
status: "active"
schema: "v3"
search_terms:
  - "user preferences agents section"
  - "cross repo workflow defaults"
  - "rebase first stale branch sync"
  - "memory seeded communication preferences"
related_entries:
  - ".harness/context/history/2026-03-26-canonical-harness-refresh.md"
  - ".harness/context/history/2026-04-01-generic-parent-harness-upgrades.md"
affected_files:
  - "AGENTS.md"
session_refs:
  - ".harness/context/sessions/2026-04-02-0851-cross-repo-workflow-preferences.md"
tags:
  - "#workflow"
  - "#preferences"
  - "#docs"
---

# cross-repo-workflow-preferences

## Summary

Added a dedicated `User Preferences` section to `AGENTS.md` and seeded it with
stable workflow defaults learned across sibling repos plus communication
preferences recorded in `.codex/MEMORY.md`.

## Request / Intent

Create a durable place in this repo's agent guidance for cross-repo workflow
best practices such as rebase-first stale-branch sync, then fill it using
lessons codified in other repos and the user's remembered communication
preferences.

## Context

The current harness repo already taught general workflow habits, but several
James-specific preferences were still fragmented across sibling repos and
personal memory. `moves` codified rebase-first PR sync, detached-HEAD fail-fast
for PR work, and history-aware conflict resolution. `life.exe` and related
repos codified caution around local `main`, keeping branch-sync workflows clean,
preferring one canonical operator path, and documenting durable workflow
contracts in tracked docs instead of chat. `.codex/MEMORY.md` separately
captured communication preferences about visual structure and top-down
explanations. Without a dedicated section in this repo, those preferences
remained scattered and would need to be rediscovered or recopied repo by repo.

## Decision

Add a `## User Preferences` section to `AGENTS.md` with two subsections:
`Workflow Preferences` and `Communication Preferences`. Seed the workflow
subsection with stable cross-repo defaults only: rebase stale unpublished
branches first, convert detached work onto a real branch before durable git
operations, avoid casual local-`main` changes, finish sync workflows clean,
update docs when workflow rules change, prefer one canonical entrypoint, explain
workflow contracts plainly, consult history/session artifacts during rebase
conflicts, and prefer live validation of the real operator path. Seed the
communication subsection from `.codex/MEMORY.md`.

## Rationale

This gives future agents one small, durable accumulation point for
user-specific defaults that should travel across repos without bloating the
generic harness rules or duplicating scenario-specific skills. Keeping the
section explicitly cumulative also makes it easier to promote repeated lessons
from sibling repos and personal memory into one always-on surface.

## Consequences

Future cross-repo work can append new stable preferences to the same section
instead of rediscovering them from scattered histories or chat transcripts.
Agents now have a clearer split between repo-generic harness rules, repo-local
skills, and user-specific defaults. Repo-specific workflows should still live in
their own skills or docs rather than being dumped wholesale into this section.

## Guidance Impact

This decision changes always-on repo guidance in `AGENTS.md` by introducing the
durable `User Preferences` section and establishing it as the cumulative home
for James-specific workflow and communication defaults that should travel across
repos.

## Validation

- `npm run harness:prep`
- `npm run harness:post`

## Raw Notes

- Cross-repo sources reviewed directly: `moves/AGENTS.md`,
  `moves/.harness/context/history/2026-03-10-pr-workflow-skill-hardening.md`,
  `moves/.harness/context/history/2026-03-17-rebase-first-stale-branch-sync.md`,
  `moves/.harness/context/history/2026-03-19-pr-skill-rebase-history-conflicts.md`,
  `life.exe/AGENTS.md`, `life-observability-main-land-20260330/AGENTS.md`, and
  `paperclip/AGENTS.md`.
- Personal memory source reviewed directly: `/Users/jamesdugle/.codex/MEMORY.md`.
- The dedicated section is intentionally concise and cumulative so future repos
  can keep adding only stable user-specific defaults.

# vibe-check

`vibe-check` is the canonical portable harness repo: a repo-agnostic `.harness/`
payload plus tests, setup docs, and skills that make AI-assisted development
compound instead of drift.

The core idea is unchanged:

**Let agents be imperfect. Make the repo enforce the artifacts.**

What changed in this refresh is that the canonical repo now matches the newer
lineages in practice, not just in intent.

## Current harness loop

Run these in order:

1. `npm run harness:prep`
2. `npm run harness:iterate`
3. `npm run harness:post`
4. `npm run harness:post -- --staged`
5. `npm run harness:ci`

Use these context commands while working:

- `npm run harness:new:session -- --slug "task-name"`
- `npm run harness:new:entry -- --slug "change-slug" --type fix|decision`
- `npm run harness:new:meta -- --slug "harness-change-slug"`

Session files are append-only task notes. There is no close command. If you
have more than one same-day task session, pass `--session-slug` when creating
the history or meta entry.

## What the canonical repo now includes

- History entries with v3 frontmatter: `related_entries`, `affected_files`,
  `session_refs`
- Session artifacts for user intent, corrections, workflow repetition, and
  codification candidates
- Staged commit-intent validation via `npm run harness:post -- --staged`
- Multi-provider agent runtime with fallback provider support
- GitHub Copilot CLI provider support alongside Gemini and Codex
- Gitignored `.harness/config.local.yml` for local-only agent overrides
- Optional parallel local agent reviews for the outer loop

## Ordered adoption plan

The cross-repo comparison turned into this canonical adoption order:

1. Commit-intent + session artifacts
   Reason: this was the most common structural evolution across the active
   repos, and it fixes the biggest current gap: commits losing the user/task
   context that produced them.
2. Provider resilience + local overrides
   Reason: the active repos converged on multi-provider operation because a
   single provider becomes a bottleneck in real use.
3. Canonical docs that match reality
   Reason: a stale canonical doc teaches the wrong workflow to every downstream
   repo.
4. Faster outer-loop ergonomics
   Reason: optional parallel agent reviews reduce local CI pain without
   weakening the gate.
5. Repo-specific governance layers
   Reason: `life.exe` and `mooo` add useful ideas, but their broker/runtime
   models are not drop-in portable and should stay as a later design pass.

The first four are now represented in this repo.

## Repo layout

- `.harness/` - canonical harness payload
- `harness-tests/` - tests for the portable harness itself
- `workflows/skills/` - portable review and workflow skills
- `.github/workflows/` - CI wiring examples
- `AGENTS.md` - terminal-first entry point for coding agents

Background rationale for harness changes lives in
`.harness/context/history/*`. Repo-root docs should stay reserved for stable
entrypoints and long-lived reference material.

## What still belongs in later phases

These showed up in sibling repos but are not yet portable enough to make part
of the canonical harness by default:

- `life.exe` feature/monitor policy catalogs
- `life.exe` brokered git / host-box coordination
- `mooo` remote runtime sync and upmerge PR automation
- Live runtime validation systems tied to a specific deploy surface

Those are better treated as optional adapter layers built on top of the
canonical harness rather than baked into it.

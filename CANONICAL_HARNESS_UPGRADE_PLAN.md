# Canonical Harness Upgrade Plan

This file turns the cross-repo comparison into the ordered adoption plan for
`vibe-check`.

## Port order

1. Commit-intent + session artifacts
   Source repos: `moves`, `moves-algorithm`, `life.exe`
   Why first: this is the biggest practical gap in the stale canonical repo.
   Status: ported in this change.
2. Provider fallback + Copilot + local overrides
   Source repos: `moves`, `life.exe`, `mooo`
   Why next: the active repos no longer assume one provider is always usable.
   Status: ported in this change.
3. Canonical docs and setup alignment
   Source repos: all
   Why next: stale canonical docs teach the wrong workflow downstream.
   Status: ported in this change.
4. Faster outer-loop ergonomics
   Source repos: `moves`
   Why next: optional parallel agent reviews reduce local CI friction without
   weakening the gate.
   Status: ported in this change.
5. Adapter-style governance layers
   Source repos: `life.exe`, `mooo`
   Why later: these are powerful but not yet portable enough for the default
   harness surface.
   Status: recommended, not ported.

## What was actually ported

- `new:session` CLI command and session artifact model
- `session.md` template
- v3 history templates with `related_entries`, `affected_files`, and
  `session_refs`
- staged policy mode via `harness:post -- --staged`
- session validation and staged context coverage enforcement
- `fallback_provider` support in agent runtime
- GitHub Copilot provider support
- `.harness/config.local.yml` support for local-only agent overrides
- `harness:ci:copilot` and `harness:ci:codex` scripts
- docs/config/setup refresh so the canonical repo describes the new model

## Recommended next steps

1. Add pre-commit wiring in the setup story so downstream repos run
   `harness:post -- --staged` automatically.
2. Add focused tests for session validation, staged coverage, and provider
   fallback behavior.
3. Decide whether to promote the `life.exe` style governance layer into an
   optional adapter package instead of baking it into core.

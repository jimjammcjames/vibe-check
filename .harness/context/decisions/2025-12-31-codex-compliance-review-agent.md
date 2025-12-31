# Codex Compliance Review Agent

**Date:** 2025-12-31

## Context

The harness needed a second-pass review layer to verify that agents follow `Harness.md` rules. The existing `policy-audit.mjs` enforces rules deterministically, but catches only structural violations. A Codex-powered reviewer can detect gaming attempts and assess entry quality.

## Decision

Implemented a `codexAdapter` in `review-adapter.mjs` that:
1. Creates a sandbox with `DIFF.txt`, `HARNESS_RULES.md`, `LEARNED_ENTRIES.txt`
2. Invokes Codex CLI with `--sandbox workspace-write`
3. Uses META-LEVEL prompt to detect gaming and assess quality
4. Returns `quality_score` (1-10), `gaming_detected`, and categorized violations

**Meta-Level Review Focus:**
- Gaming detection (hollow entries, vague tags, generic rationale)
- Quality assessment (substantive context, specific decisions)
- Structural compliance (secondary to intent analysis)

**Verbosity Improvements:**
- Added `--verbose` / `-v` flag to CLI
- Default: quiet mode (output captured, printed only on failure)
- Verbose: full output for debugging

## Rationale

- **Why meta-level?** Structural checks pass hollow entries; intent analysis catches gaming
- **Why quiet mode?** Less noise in normal workflow; full context on failure

## Consequences

- Cost/latency from Codex review per commit
- Requires Codex CLI authentication

## Search terms

codex review, gaming detection, quality score, verbose flag, quiet mode

## Related

NONE

## Tags

#architecture #anti-gamification #codex #meta-review

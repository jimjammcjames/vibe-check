# Codex Compliance Review Agent

**Date:** 2025-12-31

## Context

The harness needed a meta-level review layer to catch gaming and assess entry quality. The existing `policy-audit.mjs` enforces structural rules but can't detect hollow entries or missing documentation.

## Decision

Implemented a `codexAdapter` in `review-adapter.mjs` that:

1. Creates sandbox with `DIFF.txt`, `HARNESS_RULES.md`, `LEARNED_ENTRIES.txt`
2. Invokes Codex CLI with `--sandbox workspace-write` and `--skip-git-repo-check`
3. Returns `quality_score` (1-10), `gaming_detected`, and violations

**Key Implementation Details:**

- **Always runs:** Triggers on every commit with changed files (not just test files)
- **Explicit file write:** Prompt includes echo command to ensure JSON is created
- **Quiet mode:** CLI uses `--verbose` flag; default shows only ✓/✗ lines
- **Success output:** Shows Quality Score, Gaming Detected, Summary on every run

## Rationale

- **Why always run?** Missing tests IS a compliance issue
- **Why explicit echo?** Ensures agent creates file even if reasoning is brief
- **Why success output?** Users need to see quality assessment, not just pass/fail

## Consequences

- ~30s latency per commit for Codex review
- Quality Score < 5 triggers MEDIUM severity
- Gaming detected triggers HIGH severity

## Search terms

codex review, gaming detection, quality score, verbose flag, always run

## Related

NONE

## Tags

#architecture #anti-gamification #codex #meta-review

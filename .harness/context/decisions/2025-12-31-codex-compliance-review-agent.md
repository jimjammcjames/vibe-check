# Codex Compliance Review Agent

**Date:** 2025-12-31

## Context

The harness needed a second-pass review layer to verify that agents follow `Harness.md` rules. The existing `policy-audit.mjs` enforces rules deterministically, but a Codex-powered reviewer can catch subtle compliance issues.

## Decision

Implemented a `codexAdapter` in `review-adapter.mjs` that:
1. Creates a temporary sandbox with `DIFF.txt`, `HARNESS_RULES.md`, `LEARNED_ENTRIES.txt`
2. Invokes Codex CLI with `--sandbox workspace-write` and `--skip-git-repo-check`
3. Parses the agent's `COMPLIANCE_REVIEW.json` output
4. Returns severity and findings in the standard `ReviewResult` format

## Rationale

- **Why Codex over OpenAI API?** Codex can read files and write outputs, making it ideal for structured review tasks.
- **Why sandbox?** Isolates review from the main repo; preserves evidence at `/tmp/harness-review-*`.
- **Why auto-detect?** Falls back gracefully to stub/OpenAI if Codex CLI unavailable.

## Consequences

- **Cost:** Each review incurs model usage (~$0.01-0.10 per review with gpt-5.2-codex)
- **Latency:** Adds ~30s to `harness:post` when Codex adapter is active
- **Dependency:** Requires Codex CLI and valid authentication

## Search terms

- codex review agent, compliance reviewer, harness.md enforcement, second-pass review

## Related

NONE

## Tags

#architecture #anti-gamification #codex

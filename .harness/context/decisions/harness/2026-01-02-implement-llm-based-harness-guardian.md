# Decisions: Implement LLM-Based Harness Guardian

## Context & Rationale

The previous regex-based detection for "gaming" attempts (bypassing the harness) was fragile and susceptible to "self-detection" loops. It couldn't distinguish between the guardian's own source code and actual malicious attempts to weaken the framework. We need a more intelligent, intent-aware reviewer for harness changes.

## Technical Decision

We implemented a new `harness-guardian.mjs` that:

1.  Detects any change to `.harness/` or `harness-tests/`.
2.  Requires a specialized meta-decision entry in `.harness/context/decisions/harness/` with the `#harness-meta` tag.
3.  Delegates the final behavioral review to a Codex-powered agent.

## Security & Integrity Impact

This significantly strengthens the harness by moving from pattern-matching-security to intent-based-security. The agent specifically checks for attempts to exempt files or weaken enforcement, while allowing legitimate framework improvements. It also forces a "conscious context switch" for agents by requiring a dedicated `npm run harness:new:meta` command.

## Conformance & Enforcement

Verified by `npm run harness:post` and behavioral tests that simulate gaming attempts. The new guardian is integrated into the `post` and `ci` stages.

## Search terms

harness, meta, integrity, framework, guardian, delegation, LLM, gaming

## Related

- [undocumented-detector-doc-vs-code](file:///Users/jamesdugle/Repos/vibe%20check/.harness/context/learned/2026-01-02-undocumented-detector-doc-vs-code.md)

## Tags

- #harness-meta
- #integrity
- #architecture

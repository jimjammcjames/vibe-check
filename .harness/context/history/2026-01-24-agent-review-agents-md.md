---
date: "2026-01-24"
type: "meta"
status: "active"
schema: "v2"
search_terms:
  - "AGENTS.md"
  - "agent code review"
  - "review-code skill"
  - "repo-specific rules"
related:
  - "NONE"
tags:
  - "#harness-meta"
---

# agent-review-agents-md

## Summary

Add AGENTS.md to the code review agent context so repo-specific rules are enforced alongside Harness.md during compliance checks.

## Context

The review agent enforces global harness rules but lacks visibility into repo-specific guidance. This gap can let changes pass that conflict with local conventions or policy notes documented in AGENTS.md.

## Technical Decision

Load `AGENTS.md` from the repo root in `agent-code-review.mjs`, pass it into the agent file map as `AGENTS.md`, and update the `review-code` skill to apply the repo rules as mandatory guidance.

## Security & Integrity Impact

This strengthens enforcement by aligning reviews with repository-specific requirements without weakening existing harness rules. The only impact is a small prompt size increase and a benign fallback if `AGENTS.md` is missing.

## Conformance & Enforcement

The change is enforced by the existing `agent-code-review` step in `harness:ci`. Verify by running `npm run harness:post` and `npm run harness:ci` and confirming the review agent accepts repo rules.

## Raw Notes

None.

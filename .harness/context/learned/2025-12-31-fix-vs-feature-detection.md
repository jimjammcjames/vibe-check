# Fix-vs-Feature Detection in Codex Review

**Date:** 2025-12-31

## What Happened

When implementing the Codex compliance review agent, we initially used decision entries for all changes without distinguishing between fixes and features. This circumvented Rule B (learned entry → test delta).

## Root Cause

The harness didn't explicitly require the agent to classify changes as fix vs feature. Decision entries don't require tests, while learned entries do.

## Solution

Enhanced the Codex review prompt to:
1. Classify changes as FIX or FEATURE based on language patterns
2. Flag entry type mismatches (fix using decision entry)
3. Flag missing tests for fix-type changes
4. Set severity=HIGH for either mismatch

Added comprehensive tests in `review-adapter.test.mjs` covering:
- Severity calculation (gaming, compliance, quality thresholds)
- Result parsing (violations, quality breakdown)
- Fix-vs-feature detection (pattern matching)

## Search terms

fix vs feature, learned entry, decision entry, test requirements, change type

## Related

[2025-12-31-codex-compliance-review-agent.md](./decisions/2025-12-31-codex-compliance-review-agent.md)

## Tags

#testing #anti-gamification #rule-b #basefail-exempt

> **basefail-exempt justification:** Tests validate new feature logic (fix-vs-feature detection, severity calculation) that didn't exist on the base commit. This is new functionality, not a regression fix.

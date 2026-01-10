---
date: "2025-12-31"
type: "decision"
status: "active"
schema: "v1"
search_terms:
  - "meta-review"
  - "debugging"
  - "sandbox location"
  - "systemic flaws"
  - "root cause analysis"
  - "strict enforcement"
related:
  - "[2025-12-31-optimizing-harness-post.md](./2025-12-31-optimizing-harness-post.md)"
tags:
  - "#meta-review"
  - "#debugging"
  - "#harness-architecture"
  - "#basefail-exempt"
---

# Enhanced Meta-Review and Debugging

**Date:** 2025-12-31

## What Happened

We enhanced the Codex compliance review agent to be more philosophically robust and debuggable.

## Root Cause

1.  **Philosophy:** The review was too focused on the "fix" itself, missing the opportunity to identify systemic flaws or "blind spots" in the harness that allowed the error to occur.
2.  **Debuggability:** The review sandbox was created in the system temp directory (`os.tmpdir()`), which was inaccessible to the agent workspace, making it impossible to debug failures.
3.  **Strictness:** Agent failures (e.g., crashing or not producing output) were treated as Warnings (Low severity), allowing broken processes to pass.

## Solution

1.  **Root Cause Analysis:** Updated the Codex prompt to include a "SYSTEMIC FLAWS" section, asking the agent to identify gaps in testing/architecture.
2.  **Sandbox Relocation:** Moved the review sandbox to `harness-tests/simulation/temp/` (inside the workspace). Added to `.gitignore`.
3.  **Strict Enforcement:** Updated `review-adapter.mjs` to set severity to **HIGH** if the agent fails to produce `COMPLIANCE_REVIEW.json`.

## Systemic Gap

**What infrastructure gap allowed this issue class?**

No error visibility infrastructure existed - stderr from Codex was not prominently logged, debug files were not saved to sandbox, and there was no model validation before invocation. This caused silent failures that were hard to diagnose.

**Gap Closure**:

- Added test: `harness-tests/tests/review-adapter-integration.test.mjs`
- Added validation: `.harness/framework/scripts/pre-flight-check.mjs`

The integration tests validate that stderr logging exists and debug files are saved. Pre-flight check validates model compatibility before use.

## Search terms

meta-review, debugging, sandbox location, systemic flaws, root cause analysis, strict enforcement

## Related

[2025-12-31-optimizing-harness-post.md](./2025-12-31-optimizing-harness-post.md)

## Tags

#meta-review #debugging #harness-architecture #basefail-exempt

> **basefail-exempt justification:** Enhancements to dev-tooling plumbing (sandbox location, logging) and prompt philosophy. Manual verification confirmed sandbox creation and failure handling. Automated tests for sandbox paths are context-dependent.

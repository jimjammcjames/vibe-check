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

## Search terms

meta-review, debugging, sandbox location, systemic flaws, root cause analysis, strict enforcement

## Related

[2025-12-31-optimizing-harness-post.md](./2025-12-31-optimizing-harness-post.md)

## Tags

#meta-review #debugging #harness-architecture #basefail-exempt

> **basefail-exempt justification:** Enhancements to dev-tooling plumbing (sandbox location, logging) and prompt philosophy. Manual verification confirmed sandbox creation and failure handling. Automated tests for sandbox paths are context-dependent.

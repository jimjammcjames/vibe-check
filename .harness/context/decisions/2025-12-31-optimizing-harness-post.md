# Optimizing Harness Post for Speed

**Date:** 2025-12-31

## What Happened

We optimized the `harness:post` command to make local verification significantly faster while maintaining robust checks in CI.

## Root Cause

`harness:post` was running the exact same checks as `harness:ci`, including full project linting (`eslint .`) and type checking (`tsc --noEmit`), which are slow and redundant for local iteration on small changes. Additionally, the Codex review adapter used the heavy `gpt-5.2-codex` model with high reasoning effort by default.

## Solution

1.  **Architecture Layering:**
    - **Local (`post`):** Focuses on _changed_ files and fast feedback. Removed `eslint .` and `tsc` (relying on `harness:iterate` for changed files).
    - **CI (`ci`):** Remains the strict gatekeeper with full linting and type checking.

2.  **Fast Review Mode:**
    - Implemented `--fast` flag in `review-adapter.mjs`.
    - Uses `gpt-5.1-codex-mini` model with `medium` reasoning effort when flag is set.
    - Updated `config.yml` to call `review-adapter.mjs --fast` in the `post` stage.

## Systemic Gap

**What infrastructure gap allowed this issue class?**

Model compatibility was never validated before invocation. The original `gpt-5.2-mini` model wasn't supported with ChatGPT accounts but no error surfaced clearly - stderr was not logged prominently.

**Gap Closure**:

- Added test: `harness-tests/tests/review-adapter.test.mjs` (error visibility tests)
- Added validation: `.harness/framework/scripts/pre-flight-check.mjs`

The tests verify SUPPORTED_MODELS list exists and validates models. Pre-flight check invokes the model to confirm it works before committing.

## Search terms

performance, optimization, harness speed, fast mode, local verification, CI layering

## Related

[2025-12-31-fix-vs-feature-detection.md](./2025-12-31-fix-vs-feature-detection.md)

## Tags

#performance #optimization #harness-architecture #basefail-exempt

> **basefail-exempt justification:** Architectural configuration change (speed optimization) that doesn't affect runtime logic functionality, so no new tests are required to fail on base.

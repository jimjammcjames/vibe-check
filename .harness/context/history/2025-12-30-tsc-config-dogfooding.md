---
date: "2025-12-30"
type: "decision"
status: "active"
schema: "v1"
search_terms:
  - "`TS18003`"
  - "`No inputs were found in config file`"
  - "`allowJs overwrite input file`"
related:
  - "[tsconfig.json](file:///Users/jamesdugle/Repos/vibe%20check/tsconfig.json)"
  - "NONE"
tags:
  - "#bugfix"
  - "#typescript"
  - "#harness-build"
---

# Learned: TypeScript Build Configuration for Harness Dogfooding

**Date:** 2025-12-30
**Impact:** Build/Pre-commit Hook

## Problem

In a project with mixed JS and TS (or no `src` files yet), `tsc --noEmit` fails with "No inputs found" (TS18003). Additionally, if `allowJs` is not set correctly with output dirs, `tsc` may error out thinking it will overwrite source files.

## Solution

1. **`noEmit: true`**: Ensure `tsc` only checks types and doesn't try to write files.
2. **`include: ["**/\*"]`**: Provide a broad search pattern so `tsc`finds the harness scripts even if there's no`src/` directory.
3. **`allowJs: true`**: Critical for type-checking the `.mjs` harness files.

## Search terms

- `TS18003`
- `No inputs were found in config file`
- `allowJs overwrite input file`

## Related

- [tsconfig.json](file:///Users/jamesdugle/Repos/vibe%20check/tsconfig.json)
- NONE

## Tags

#bugfix #typescript #harness-build

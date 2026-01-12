---
date: "2026-01-12"
type: "feature"
status: "active"
schema: "v2"
search_terms:
  - "gemini home directory"
  - "gemini error diagnostics"
  - "HARNESS_GEMINI_HOME"
  - "gemini json output"
related:
  - "2026-01-04-switch-to-gemini-provider"
  - "2026-01-03-gemini-model-configuration"
tags:
  - "#harness-providers"
---

# gemini-provider-enhancements

## Summary

Enhanced the Gemini provider with home directory management, detailed error diagnostics, JSON output mode, and improved error handling for quota/permission issues.

## Context

The Gemini CLI requires a writable `~/.gemini` directory for settings and state. In sandboxed or restricted environments (CI, containers), the default home directory may not be writable, causing silent failures or cryptic errors. Additionally, error messages from the CLI were not being surfaced clearly to debugging.

## Technical Decision

- Added `HARNESS_GEMINI_HOME` environment variable and `agents.gemini_home` config option to specify an alternative home directory
- Added intelligent home directory seeding when using a custom home path
- Added `--output-format json` flag to Gemini CLI invocation for more reliable output parsing
- Enhanced error detection for quota exhaustion, permission errors, API errors, and rate limiting
- Improved error messages with detailed context from stderr, stdout, and Gemini report files

## Security & Integrity Impact

No security changes. The custom home directory is local-only and respects existing permission models.

## Conformance & Enforcement

Provider failures are now captured with detailed diagnostics and surfaced via agent-runner to the harness CI output.

## Raw Notes

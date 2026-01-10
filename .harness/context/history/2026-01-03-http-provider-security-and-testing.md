---
date: "2026-01-03"
type: "fix"
status: "active"
schema: "v1"
search_terms:
  - "`gitignore`"
  - "`api key`"
  - "`http provider`"
  - "`testing`"
related:
  - "[2026-01-03-http-api-provider-byo-api.md](.harness/context/history/2026-01-03-http-api-provider-byo-api.md)"
tags:
  - "#security"
  - "#testing"
  - "#harness-meta"
---

# http-provider-security-and-testing

## Context

New features (HTTP Provider) were implemented but lacked persistent security for local credentials and comprehensive test coverage. This resulted in undocumented changes being flagged by the harness.

## Decision

1. Added `key.txt` to `.gitignore` to allow developers to store `HARNESS_API_KEY` locally without risk of accidental commit.
2. Added `harness-tests/tests/http-provider.test.mjs` to verify HTTP provider functionality (headers, body templates, response parsing).
3. Modified `harness-tests/tests/harness-guardian.test.mjs` to use `HARNESS_PROVIDER='stub'` to ensure `detects harness modifications` test passes reliably.

## Rationale

- **Security**: `key.txt` provides a standard, safe location for long-lived secrets.
- **Reliability**: Unit tests ensure provider functionality. Using `stub` in guardian tests prevents flakes.

## Systemic Gap

**What infrastructure gap allowed this issue class?**

The initial implementation of the HTTP provider focused on functionality but missed standard developer ergonomics (secrets management) and regression testing. Additionally, existing tests relied on live providers, making them brittle.

**Gap Closure** (REQUIRED - at least one file path that appears in this commit):

- Added test: `harness-tests/tests/http-provider.test.mjs`
- Modified test: `harness-tests/tests/harness-guardian.test.mjs`

This closes the gap by establishing a baseline ensuring the provider remains functional as we evolve it.

---

## Search terms

`gitignore`, `api key`, `http provider`, `testing`

## Related

- [2026-01-03-http-api-provider-byo-api.md](.harness/context/history/2026-01-03-http-api-provider-byo-api.md)

## Tags

#security #testing #harness-meta

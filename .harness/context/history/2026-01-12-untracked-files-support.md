---
date: "2026-01-12"
type: "feature"
status: "active"
schema: "v2"
search_terms:
  - "untracked files diff"
  - "git ls-files"
  - "buildUntrackedDiff"
  - "agent diff context"
related:
  - "2026-01-02-memory-coherence-checker"
  - "2026-01-01-undocumented-changes-detector"
tags:
  - "#harness-agents"
---

# untracked-files-support

## Summary

Extended agent diff context to include untracked files, ensuring code review and memory coherence agents see all pending changes.

## Context

Agents were only reviewing changes from `git diff` against the base branch, which excluded newly created untracked files. This meant new files added during a session were invisible to the code review and memory coherence agents until they were staged or committed.

## Technical Decision

- Added `getUntrackedFiles()` helper using `git ls-files --others --exclude-standard`
- Implemented `buildUntrackedDiff()` to generate synthetic diff output for untracked files
- Updated `getDiff()` and `getDiffFiles()` to include staged, unstaged, and untracked files
- Added 200KB per-file limit for untracked file content to prevent memory issues with large binary files

## Security & Integrity Impact

No security changes. Respects `.gitignore` patterns via the `--exclude-standard` flag.

## Conformance & Enforcement

Agents now see the complete picture of pending changes, reducing false negatives where new files were not reviewed.

## Raw Notes

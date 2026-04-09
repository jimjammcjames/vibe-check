import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSessionContentsForEntries } from "../../.harness/framework/scripts/agent-memory-coherence.mjs";

describe("agent-memory-coherence helpers", () => {
  it("stages linked session contents for changed history entries", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "coherence-helper-"));
    const historyDir = join(repoRoot, ".harness", "context", "history");
    const sessionDir = join(repoRoot, ".harness", "context", "sessions");
    mkdirSync(historyDir, { recursive: true });
    mkdirSync(sessionDir, { recursive: true });

    writeFileSync(
      join(historyDir, "2026-04-09-entry.md"),
      `---
date: "2026-04-09"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "coherence"
related_entries:
  - "NONE"
affected_files:
  - "file.txt"
session_refs:
  - ".harness/context/sessions/2026-04-09-session.md"
tags:
  - "#harness-meta"
---
`,
    );

    writeFileSync(
      join(sessionDir, "2026-04-09-session.md"),
      `---
date: "2026-04-09"
started_at: "2026-04-09T00:00:00.000Z"
tags:
  - "#harness"
related_history:
  - ".harness/context/history/2026-04-09-entry.md"
skills_used:
  - "codify-learnings"
---

# session

## Summary

Linked session content.
`,
    );

    const sessions = buildSessionContentsForEntries(
      [".harness/context/history/2026-04-09-entry.md"],
      { repoRoot },
    );

    assert.match(sessions, /2026-04-09-session\.md/);
    assert.match(sessions, /Linked session content\./);
  });

  it("reports missing linked sessions explicitly", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "coherence-helper-"));
    const historyDir = join(repoRoot, ".harness", "context", "history");
    mkdirSync(historyDir, { recursive: true });

    writeFileSync(
      join(historyDir, "2026-04-09-entry.md"),
      `---
date: "2026-04-09"
type: "meta"
status: "active"
schema: "v3"
search_terms:
  - "coherence"
related_entries:
  - "NONE"
affected_files:
  - "file.txt"
session_refs:
  - ".harness/context/sessions/missing-session.md"
tags:
  - "#harness-meta"
---
`,
    );

    const sessions = buildSessionContentsForEntries(
      [".harness/context/history/2026-04-09-entry.md"],
      { repoRoot },
    );

    assert.match(sessions, /\[MISSING SESSION ARTIFACT\]/);
    assert.match(sessions, /missing-session\.md/);
  });
});

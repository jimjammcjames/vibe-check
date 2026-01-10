#!/usr/bin/env node

/**
 * Memory Coherence Checker
 *
 * A dedicated agent that validates memory entry hygiene:
 * 1. Entry type correctness (fix/incident → fix/incident entries, feature → decision/feature)
 * 2. Topic coherence (one logical change per entry, or properly linked)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runAgent,
  log,
  logError,
  logSuccess,
  logWarning,
  REPO_ROOT,
  HARNESS_ROOT,
} from "../lib/agent-runner.mjs";
import { parseFrontmatter } from "../lib/history-entry.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Coherence Prompt
// ============================================================================

const COHERENCE_PROMPT = `ENVIRONMENT: Use only cat/grep/echo. DO NOT run npm/node commands.

TASK: Check history entry coherence.

FILES:
- DIFF.txt: Code changes being committed
- ENTRIES.txt: History entries (marked as [TYPE])

RULES:
1. ENTRY TYPE CORRECTNESS:
   - "fix"/"incident" entries are for BUGS/FIXES (something broke, we fixed it)
   - "decision"/"feature"/"refactor"/"investigation"/"note"/"meta" are for FEATURES/CHANGES
   - If a fix/incident entry describes a NEW FEATURE → flag as "wrong_entry_type"
   - If a non-fix entry describes a BUG FIX → flag as "wrong_entry_type"

2. TOPIC COHERENCE:
   - Each entry should cover ONE logical change
   - If entry mixes multiple UNRELATED changes → flag as "multiple_topics"
   - Exception: Related changes (e.g., fix + test for that fix) are OK together
   - If multiple topics are properly linked via "## Related" section → OK

3. Check each entry and report issues.

MANDATORY: Produce COHERENCE.json as a JSON object (no extra text):
{
  "entry_count": 5,
  "issues": [
    {
      "file": "path/to/entry.md",
      "issue_type": "wrong_entry_type | multiple_topics | missing_links",
      "description": "brief description",
      "suggestion": "brief fix"
    }
  ],
  "all_coherent": true
}

- entry_count: integer count of entries checked (DO NOT list file paths)
- If no issues found, set all_coherent=true and issues=[]
- Keep descriptions and suggestions BRIEF (under 50 chars each)
- Be pragmatic: minor bundling of closely-related fixes is fine
`;

// ============================================================================
// Helpers
// ============================================================================

function getChangedHistoryEntries() {
  try {
    const diff = execSync("git diff origin/main --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    return diff.filter(
      (f) =>
        f.includes(".harness/context/history/") &&
        f.endsWith(".md") &&
        !f.endsWith("TIMELINE.md"),
    );
  } catch {
    return [];
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  log("\n\x1b[36m=== Memory Coherence Checker ===\x1b[0m\n");

  const allEntries = getChangedHistoryEntries();

  if (allEntries.length === 0) {
    logSuccess("No history entries to check");
    process.exit(0);
  }

  log(`Checking ${allEntries.length} history entries...\n`);

  // Get diff for context
  let diff = "";
  try {
    diff = execSync("git diff origin/main", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
  } catch {
    diff = "";
  }

  // Build entry contents
  let entryContents = "";
  for (const entry of allEntries) {
    const fullPath = join(REPO_ROOT, entry);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      const { data } = parseFrontmatter(content);
      const entryType = data?.type ? data.type.toUpperCase() : "UNKNOWN";
      entryContents += `\n### [${entryType}] ${entry}\n${content}\n`;
    }
  }

  log("Analyzing entry coherence...\n");

  // Use the shared agent runner
  const agentResult = await runAgent({
    name: "coherence",
    files: {
      "DIFF.txt": diff || "No diff available",
      "ENTRIES.txt": entryContents,
    },
    prompt: COHERENCE_PROMPT,
    outputFile: "COHERENCE.json",
    providerConfig: { timeout: 120000 },
  });

  // Handle result - ALL failures block, no exceptions
  if (agentResult.rateLimited) {
    logError("AI review unavailable (rate limit/network). Cannot proceed.");
    logError(`Sandbox preserved: ${agentResult.sandboxDir}`);
    process.exit(1);
  }

  if (!agentResult.success) {
    logError(
      "Agent did not produce COHERENCE.json. Cannot verify entry coherence.",
    );
    logError(`Sandbox preserved at: ${agentResult.sandboxDir}`);
    process.exit(1);
  }

  const result = agentResult.result;
  log("--- Coherence Analysis ---\n");
  log(`Entries Checked: ${result.entry_count || 0}`);

  if (result.issues && result.issues.length > 0) {
    log(`\nIssues Found: ${result.issues.length}`);
    for (const issue of result.issues) {
      logWarning(`[${issue.issue_type}] ${issue.file}`);
      log(`  ${issue.description}`);
      if (issue.suggestion) {
        log(`  → ${issue.suggestion}`);
      }
    }
    log("\nFix the issues above or add justification.");
    process.exit(1);
  } else {
    logSuccess("All entries are coherent");
    process.exit(0);
  }
}

main().catch((err) => {
  logError(`Coherence checker error: ${err.message}`);
  process.exit(1);
});

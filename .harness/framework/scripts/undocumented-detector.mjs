#!/usr/bin/env node

/**
 * Undocumented Changes Detector
 *
 * A focused agent that ONLY checks if all changes in the diff
 * are covered by corresponding history entries.
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Detector Prompt
// ============================================================================

const DETECTOR_PROMPT = `TASK: Verify that code changes are documented.

FILES:
- DIFF.txt: All changes (code and documentation)
- HISTORY_ENTRIES.txt: Existing documentation (history entries)

RULE: Every code change should be covered by at least one history entry in HISTORY_ENTRIES.txt.

MATCHING:
- An "umbrella" entry (e.g., "Harness Latency Optimization") covers ALL related sub-changes (e.g., "parallel execution", "nano model", "caching").
- If an entry's title or content MENTIONS or RELATES to the code change, it is DOCUMENTED.
- Be LENIENT: only flag a change as undocumented if there is absolutely NO entry that discusses the topic.

MANDATORY: Create RESULT.json:
{
  "change_clusters_found": ["brief list of major code/config changes in diff"],
  "documented_clusters": ["which ones have related entries"],
  "undocumented_clusters": ["which ones have NO related entries at all"],
  "all_documented": true
}

If HISTORY_ENTRIES.txt contains entries that reasonably cover the changes, set all_documented to true and undocumented_clusters to [].

Run: Output ONLY the JSON object.`;

// ============================================================================
// Main
// ============================================================================

async function main() {
  log("\n\x1b[36m=== Undocumented Changes Detector ===\x1b[0m\n");

  // Get diff
  let diff = "";
  try {
    diff = execSync("git diff origin/main", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
  } catch {
    try {
      diff = execSync("git diff --cached", {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      });
    } catch {
      log("No diff available");
      process.exit(0);
    }
  }

  if (!diff.trim()) {
    logSuccess("No changes to check");
    process.exit(0);
  }

  // Get history entries content
  const historyDir = join(HARNESS_ROOT, "context", "history");
  let historyContent = "";
  if (existsSync(historyDir)) {
    const files = execSync(`find "${historyDir}" -name "*.md" -type f`, {
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    for (const file of files) {
      if (file.endsWith("TIMELINE.md")) continue;
      try {
        historyContent += `\n### ${file}\n${readFileSync(file, "utf-8")}\n`;
      } catch {
        // Ignore unreadable files; best-effort context is sufficient.
      }
    }
  }

  log("Analyzing changes for documentation coverage...\n");

  // Use the shared agent runner
  const agentResult = await runAgent({
    name: "undocumented",
    files: {
      "DIFF.txt": diff,
      "HISTORY_ENTRIES.txt": historyContent || "No history entries found",
    },
    prompt: DETECTOR_PROMPT,
    outputFile: "RESULT.json",
    providerConfig: { timeout: 120000 },
  });

  // Handle result - ALL failures block, no exceptions
  if (agentResult.rateLimited) {
    logError("AI review unavailable (rate limit/network). Cannot proceed.");
    process.exit(1);
  }

  if (!agentResult.success) {
    logError("Agent did not produce RESULT.json. Cannot verify documentation.");
    process.exit(1);
  }

  const result = agentResult.result;

  // Only show analysis on failure (bypass quiet mode)
  if (result.undocumented_clusters && result.undocumented_clusters.length > 0) {
    console.log("--- Change Coverage Analysis ---");
    console.log(`Undocumented: ${result.undocumented_clusters.length}`);
    console.log("\x1b[33mUndocumented changes detected:\x1b[0m");
    result.undocumented_clusters.forEach((c) => logWarning(c));
    console.log("\nCreate history entries for these changes:");
    console.log(
      '  npm run harness:new:entry -- --slug "descriptive-slug" --type fix',
    );
    process.exit(1);
  } else {
    logSuccess("All changes are documented");
    process.exit(0);
  }
}

main().catch((err) => {
  logError(`Detector error: ${err.message}`);
  process.exit(1);
});

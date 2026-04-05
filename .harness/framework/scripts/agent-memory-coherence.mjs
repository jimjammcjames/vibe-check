#!/usr/bin/env node

/**
 * Memory Coherence Checker
 *
 * A dedicated agent that validates memory entry hygiene:
 * 1. Entry type correctness (fix/incident → fix/incident entries, feature → decision/feature)
 * 2. Topic coherence (one logical change per entry, or properly linked)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
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
import { resolveBaseRef } from "../lib/base-ref.mjs";
import { loadHarnessConfig } from "../lib/harness-config.mjs";
import { parseFrontmatter } from "../lib/history-entry.mjs";
import { loadSkillPrompt } from "../lib/skills.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Coherence Prompt (loaded from skill at runtime)
// ============================================================================

const COHERENCE_PROMPT = loadSkillPrompt("review-memory-coherence");

// ============================================================================
// Helpers
// ============================================================================

function getChangedHistoryEntries() {
  try {
    const config = loadHarnessConfig({ harnessRoot: HARNESS_ROOT });
    const baseRef = resolveBaseRef({ config, repoRoot: REPO_ROOT });
    const diff = execSync(`git diff ${baseRef} --name-only`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const staged = execSync("git diff --cached --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const allFiles = [...new Set([...diff, ...staged, ...untracked])];

    return allFiles.filter(
      (f) =>
        f.includes(".harness/context/history/") &&
        f.endsWith(".md") &&
        !f.endsWith("TIMELINE.md"),
    );
  } catch {
    return [];
  }
}

function getUntrackedFiles() {
  try {
    return execSync("git ls-files --others --exclude-standard", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildUntrackedDiff(untrackedFiles) {
  if (!untrackedFiles.length) return "";
  const MAX_UNTRACKED_DIFF_BYTES = 200_000;
  let diff = "";

  for (const file of untrackedFiles) {
    const fullPath = join(REPO_ROOT, file);
    if (!existsSync(fullPath)) continue;
    try {
      const stats = statSync(fullPath);
      if (!stats.isFile()) continue;

      let content = readFileSync(fullPath, "utf-8");
      let truncated = false;
      if (stats.size > MAX_UNTRACKED_DIFF_BYTES) {
        content = content.slice(0, MAX_UNTRACKED_DIFF_BYTES);
        truncated = true;
      }

      const lines = content.split("\n");
      diff += `\ndiff --git a/${file} b/${file}\n`;
      diff += `new file mode 100644\n--- /dev/null\n+++ b/${file}\n`;
      diff += `@@ -0,0 +1,${lines.length} @@\n`;
      diff += lines.map((line) => `+${line}`).join("\n");
      if (truncated) {
        diff += "\n+...[truncated]";
      }
      diff += "\n";
    } catch {
      // Ignore unreadable/binary files in untracked diff
    }
  }

  return diff;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  log("\n\x1b[36m=== Memory Coherence Checker ===\x1b[0m\n");
  const config = loadHarnessConfig({ harnessRoot: HARNESS_ROOT });
  const baseRef = resolveBaseRef({ config, repoRoot: REPO_ROOT });

  const allEntries = getChangedHistoryEntries();

  if (allEntries.length === 0) {
    logSuccess("No history entries to check");
    process.exit(0);
  }

  log(`Checking ${allEntries.length} history entries...\n`);

  // Get diff for context
  let diff = "";
  try {
    diff = execSync(`git diff ${baseRef}`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    const stagedDiff = execSync("git diff --cached", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    const unstagedDiff = execSync("git diff", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });
    const untrackedDiff = buildUntrackedDiff(getUntrackedFiles());
    diff = [diff, stagedDiff, unstagedDiff, untrackedDiff]
      .filter(Boolean)
      .join("\n");
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

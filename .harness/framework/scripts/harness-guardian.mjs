#!/usr/bin/env node

/**
 * Harness Guardian
 *
 * Protects the harness itself from gaming attempts.
 * If harness files are modified, it delegates review to an AI agent
 * to ensure changes are legitimate and documented with acceptable reasoning.
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
import { normalizeList, parseFrontmatter } from "../lib/history-entry.mjs";
import { loadSkillPrompt } from "../lib/skills.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Guardian Prompt (loaded from skill at runtime)
// ============================================================================

const GUARDIAN_PROMPT = loadSkillPrompt("review-harness-guardian");

// ============================================================================
// Main
// ============================================================================

async function main() {
  log("\n\x1b[36m=== Harness Guardian ===\x1b[0m\n");

  // Get changed files against origin/main (or cached)
  let changedFiles = [];
  try {
    changedFiles = execSync("git diff --name-only origin/main", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    try {
      changedFiles = execSync("git diff --cached --name-only", {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);
    } catch {
      // No git context or empty
    }
  }

  // Also include untracked files (new files not yet staged)
  try {
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    changedFiles = [...new Set([...changedFiles, ...untracked])];
  } catch (e) {
    // Ignore error if git fail
  }

  if (changedFiles.length === 0) {
    logSuccess("No changes to check");
    process.exit(0);
  }

  // Filter for harness-related files
  const harnessWork = changedFiles.filter(
    (f) => f.startsWith(".harness/") || f.startsWith("harness-tests/"),
  );

  if (harnessWork.length === 0) {
    logSuccess("No harness modifications detected");
    process.exit(0);
  }

  log(
    `Modifications to harness core detected (${harnessWork.length} files)...`,
  );

  // Verify meta entry exists in history with the correct tag
  let hasMetaEntry = false;
  let metaContent = "";
  const metaCandidates = changedFiles.filter(
    (f) =>
      f.startsWith(".harness/context/history/") &&
      f.endsWith(".md") &&
      !f.endsWith("TIMELINE.md"),
  );

  for (const relativePath of metaCandidates) {
    const fullPath = join(REPO_ROOT, relativePath);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, "utf-8");
    const { data } = parseFrontmatter(content);
    const tags = normalizeList(data?.tags);
    const hasMetaTag = tags.some((tag) => tag.includes("#harness-meta"));

    if (data?.type === "meta" && hasMetaTag) {
      hasMetaEntry = true;
      metaContent += `\n### [META-ENTRY] ${relativePath}\n${content}\n`;
    }
  }

  if (!hasMetaEntry) {
    logError("Harness meta-security violation!");
    log("Changes to .harness/ framework require a meta history entry.");
    log(
      'Command: npm run harness:new:meta -- --slug "your-change-description"',
    );
    log("Location: .harness/context/history/");
    log("Type: meta (frontmatter)");
    log("Tag: #harness-meta");
    process.exit(1);
  }

  // Generate diffs (robust to untracked files)
  let harnessDiff = "";

  // Identify untracked files
  let untrackedFiles = [];
  try {
    const untrackedOutput = execSync(
      "git ls-files --others --exclude-standard",
      { cwd: REPO_ROOT, encoding: "utf-8" },
    );
    untrackedFiles = untrackedOutput.trim().split("\n").filter(Boolean);
  } catch {
    // Ignore git errors; treat as no untracked files.
  }

  const trackedFilesToDiff = harnessWork.filter(
    (f) => !untrackedFiles.includes(f),
  );
  const untrackedFilesToDiff = harnessWork.filter((f) =>
    untrackedFiles.includes(f),
  );

  // 1. Diff tracked files
  if (trackedFilesToDiff.length > 0) {
    const fileArgs = trackedFilesToDiff.map((f) => `"${f}"`).join(" ");
    try {
      harnessDiff += execSync(`git diff origin/main -- ${fileArgs}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      });
    } catch {
      try {
        harnessDiff += execSync(`git diff --cached -- ${fileArgs}`, {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        });
      } catch {
        logWarning("Could not generate git diff for tracked files");
      }
    }
  }

  // 2. Append untracked files as "new file" diffs
  for (const f of untrackedFilesToDiff) {
    try {
      const content = readFileSync(join(REPO_ROOT, f), "utf-8");
      harnessDiff += `\ndiff --git a/${f} b/${f}\nnew file mode 100644\n--- /dev/null\n+++ b/${f}\n@@ -0,0 +1 @@\n${content}\n`;
    } catch (e) {
      logWarning(`Could not read untracked file: ${f}`);
    }
  }

  // Get Harness.md rules for context
  const harnessMdPath = join(HARNESS_ROOT, "Harness.md");
  const harnessRules = existsSync(harnessMdPath)
    ? readFileSync(harnessMdPath, "utf-8")
    : "No rules doc found";

  log("Delegating integrity review to AI agent...\n");

  // Use the shared agent runner
  const agentResult = await runAgent({
    name: "guardian",
    files: {
      "HARNESS_DIFF.txt": harnessDiff,
      "META_ENTRY.txt": metaContent,
      "RULES.txt": harnessRules,
    },
    prompt: GUARDIAN_PROMPT,
    outputFile: "GUARDIAN_RESULT.json",
  });

  // Handle result - ALL failures block, no exceptions
  if (agentResult.rateLimited) {
    logError("AI review unavailable (rate limit/network). Cannot proceed.");
    process.exit(1);
  }

  if (!agentResult.success) {
    logError(
      "Agent did not produce verdict. Could not verify integrity of harness changes. Blocking.",
    );
    process.exit(1);
  }

  const result = agentResult.result;

  // Normalize verdict to lowercase for comparison
  const verdict = (result.verdict || "").toLowerCase();
  const isPassing = verdict === "pass" && !result.gaming_detected;

  if (isPassing) {
    logSuccess("Integrity verified");
  } else {
    // Always show full agent response on failure (bypass quiet mode)
    console.log("--- Integrity Review Result ---");
    console.log(JSON.stringify(result, null, 2));
    logError("INTEGRITY BREACH DETECTED: ACCESS DENIED");
    process.exit(1);
  }
}

main().catch((err) => {
  logError(`Guardian error: ${err.message}`);
  process.exit(1);
});

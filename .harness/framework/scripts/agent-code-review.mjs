#!/usr/bin/env node

/**
 * Review Adapter - Pluggable Anti-Gamification Reviewer
 *
 * Provides an adapter interface for teams to plug in their existing
 * code review tools (OpenAI, Anthropic, CodeRabbit, etc.)
 *
 * Built-in adapters:
 *   - shared: Provider-backed reviewer (gemini/http/codex via providers)
 *
 * Future adapters (extension points):
 *   - anthropic: Claude API
 *   - coderabbit: CodeRabbit integration
 *   - custom: Webhook to custom endpoint
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { minimatch } from "./minimatch.mjs";
import { resolveBaseRef } from "../lib/base-ref.mjs";
import { loadHarnessConfig } from "../lib/harness-config.mjs";
import { parseFrontmatter } from "../lib/history-entry.mjs";
import { recordAgentFailure, runAgent } from "../lib/agent-runner.mjs";
import { loadSkillPrompt } from "../lib/skills.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

// ============================================================================
// Utilities
// ============================================================================

const QUIET = process.env.HARNESS_QUIET === "1";

function log(msg) {
  if (!QUIET) console.log(msg);
}

function logError(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

function logWarning(msg) {
  console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
}

function logInfo(msg) {
  if (!QUIET) console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
}

function loadConfig() {
  return loadHarnessConfig({ harnessRoot: HARNESS_ROOT });
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

function getDiff(baseRef) {
  try {
    // Get diff from base ref to HEAD (committed changes)
    let diff = "";
    try {
      diff = execSync(`git diff ${baseRef}...HEAD`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      // No common ancestor, use direct diff
      diff = execSync(`git diff ${baseRef}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    // Also get staged and unstaged changes (working directory)
    const stagedDiff = execSync("git diff --cached", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const unstagedDiff = execSync("git diff", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const untrackedFiles = getUntrackedFiles();
    const untrackedDiff = buildUntrackedDiff(untrackedFiles);

    return [diff, stagedDiff, unstagedDiff, untrackedDiff]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

function getDiffFiles(baseRef) {
  try {
    let diffFiles = [];
    const base = execSync(`git merge-base HEAD ${baseRef}`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (base) {
      diffFiles = execSync(`git diff --name-only ${base}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);
    }

    const staged = execSync("git diff --cached --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const unstaged = execSync("git diff --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const untracked = getUntrackedFiles();

    return [...new Set([...diffFiles, ...staged, ...unstaged, ...untracked])];
  } catch {
    return [];
  }
}

function matchesAnyGlob(file, patterns) {
  if (!patterns) return false;
  if (typeof patterns === "string") {
    patterns = [patterns];
  }
  return patterns.some((pattern) => minimatch(file, pattern));
}

function getTestFiles(diffFiles, config) {
  const testGlobs = config.globs.testSide || config.globs.tests || [];
  return diffFiles.filter((f) => matchesAnyGlob(f, testGlobs));
}

function getHistoryContent(diffFiles, config) {
  const historyGlob = config.globs.history;
  const historyFiles = diffFiles.filter(
    (f) => matchesAnyGlob(f, historyGlob) && !f.endsWith("TIMELINE.md"),
  );

  return historyFiles
    .map((file) => {
      const fullPath = join(REPO_ROOT, file);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf-8");
        const { data } = parseFrontmatter(content);
        return {
          file,
          content,
          type: data?.type || "unknown",
          schema: data?.schema || "unknown",
        };
      }
      return null;
    })
    .filter(Boolean);
}

function getSessionContent(diffFiles, config) {
  const sessionGlob = config.globs.sessions;
  const sessionFiles = diffFiles.filter((f) => matchesAnyGlob(f, sessionGlob));

  return sessionFiles
    .map((file) => {
      const fullPath = join(REPO_ROOT, file);
      if (!existsSync(fullPath)) {
        return null;
      }

      return {
        file,
        content: readFileSync(fullPath, "utf-8"),
      };
    })
    .filter(Boolean);
}

function buildReviewScope({
  historyEntries = [],
  sessionEntries = [],
  touchedFiles = new Set(),
}) {
  const touchedHistory = historyEntries.filter((entry) =>
    touchedFiles.has(entry.file),
  );
  const inheritedHistory = historyEntries.filter(
    (entry) => !touchedFiles.has(entry.file),
  );
  const touchedSessions = sessionEntries.filter((entry) =>
    touchedFiles.has(entry.file),
  );
  const inheritedSessions = sessionEntries.filter(
    (entry) => !touchedFiles.has(entry.file),
  );

  const formatEntries = (entries, formatter) =>
    entries.length > 0
      ? entries.map((entry) => `- ${formatter(entry)}`).join("\n")
      : "- NONE";

  return [
    "DETERMINISTIC REVIEW BOUNDARY",
    "- HARNESS_RULES.md is the source of truth for compliance boundaries.",
    "- Legacy history entries marked [INHERITED] may use schema v1/v2 inside a branch diff.",
    "- Do NOT fail solely because an [INHERITED] v1/v2 history entry lacks v3-only fields or sections.",
    "- Apply v3-only expectations only to [TOUCHED] entries or entries already marked schema=v3.",
    "- Use [INHERITED] history and session entries as context, not as standalone migration-debt blockers.",
    "",
    `Touched files in current branch/worktree scope: ${touchedFiles.size}`,
    "",
    "Touched history entries:",
    formatEntries(touchedHistory, (entry) => `[${entry.schema}] ${entry.file}`),
    "",
    "Inherited history entries:",
    formatEntries(
      inheritedHistory,
      (entry) => `[${entry.schema}] ${entry.file}`,
    ),
    "",
    "Touched session entries:",
    formatEntries(touchedSessions, (entry) => entry.file),
    "",
    "Inherited session entries:",
    formatEntries(inheritedSessions, (entry) => entry.file),
  ].join("\n");
}

function getProviderConfig(isFastMode) {
  const providerConfig = {
    timeout: 300000,
  };

  if (isFastMode) {
    providerConfig.model = "gpt-4.1-nano";
  } else {
    providerConfig.model = "gpt-4.1-mini";
  }

  return providerConfig;
}

function buildReviewResult(reviewData) {
  let severity = "none";
  if (reviewData.gaming_detected) {
    severity = "high";
  } else if (!reviewData.compliant) {
    severity = "high";
  } else if (
    reviewData.entry_type_mismatch ||
    reviewData.missing_tests_for_fix
  ) {
    severity = "high";
  } else if (reviewData.quality_score && reviewData.quality_score < 5) {
    severity = "medium";
  }

  const violations = Array.isArray(reviewData.violations)
    ? reviewData.violations
    : [];
  const findings = violations.map((v) => {
    if (typeof v === "string") {
      return { file: "N/A", pattern: "violation", description: v };
    }
    return {
      file: "N/A",
      pattern: v.rule || "violation",
      description: v.description || JSON.stringify(v),
    };
  });

  return {
    severity,
    findings,
    summary: reviewData.summary || "Meta-review complete",
    changeType: reviewData.change_type,
    entryTypeMismatch: reviewData.entry_type_mismatch,
    missingTestsForFix: reviewData.missing_tests_for_fix,
    qualityScore: reviewData.quality_score,
    qualityBreakdown: reviewData.quality_breakdown,
    criticalIssues: reviewData.critical_issues,
    gamingDetected: reviewData.gaming_detected,
    systemicFlawDetected: reviewData.systemic_flaw_detected,
  };
}

function buildAgentReviewFiles(context, env = process.env) {
  const files = {};
  files["DIFF.txt"] = context.diff || "No diff available";
  files["TEST_FILES.txt"] = context.testFiles.join("\n");

  const historyEntries = context.historyEntries || context.learnedEntries || [];
  const historyContent = historyEntries
    .map((entry) => {
      const scope =
        context.touchedFiles && context.touchedFiles.has(entry.file)
          ? "TOUCHED"
          : "INHERITED";
      return `### [${(entry.type || "unknown").toUpperCase()}][${scope}][schema=${entry.schema || "unknown"}] ${entry.file}\n${entry.content}`;
    })
    .join("\n\n");
  files["HISTORY_ENTRIES.txt"] = historyContent || "None";

  const sessionEntries = context.sessionEntries || [];
  const sessionContent = sessionEntries
    .map((entry) => {
      const scope =
        context.touchedFiles && context.touchedFiles.has(entry.file)
          ? "TOUCHED"
          : "INHERITED";
      return `### [SESSION][${scope}] ${entry.file}\n${entry.content}`;
    })
    .join("\n\n");
  files["SESSIONS.txt"] = sessionContent || "None";
  files["REVIEW_SCOPE.txt"] = buildReviewScope({
    historyEntries,
    sessionEntries,
    touchedFiles: context.touchedFiles || new Set(),
  });

  const harnessDocPath = join(HARNESS_ROOT, "Harness.md");
  const harnessMd = existsSync(harnessDocPath)
    ? readFileSync(harnessDocPath, "utf-8")
    : "Harness.md not found";
  files["HARNESS_RULES.md"] = harnessMd;

  const agentsDocPath = join(REPO_ROOT, "AGENTS.md");
  const agentsMd = existsSync(agentsDocPath)
    ? readFileSync(agentsDocPath, "utf-8")
    : "AGENTS.md not found";
  files["REPO_AGENTS_GUIDANCE.md"] = agentsMd;

  const originalRequest = env.HARNESS_ORIGINAL_REQUEST?.trim();
  if (originalRequest) {
    files["ORIGINAL_REQUEST.txt"] = originalRequest;
  }

  return files;
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * @typedef {Object} ReviewContext
 * @property {string} diff - Git diff of the PR
 * @property {string[]} testFiles - Changed test files
 * @property {Array<{file: string, content: string, type?: string, schema?: string}>} historyEntries - History entry contents
 * @property {Array<{file: string, content: string}>} sessionEntries - Session entry contents
 * @property {Set<string>} touchedFiles - Files touched by the branch diff or local worktree overlays
 * @property {string} testCommand - Command used to run tests
 */

/**
 * @typedef {Object} ReviewFinding
 * @property {string} file - File path
 * @property {number} [line] - Line number
 * @property {string} pattern - Pattern detected
 * @property {string} description - Description of the issue
 * @property {string} [suggestedFix] - Suggested fix
 */

/**
 * @typedef {Object} ReviewResult
 * @property {'none'|'low'|'medium'|'high'} severity - Overall severity
 * @property {ReviewFinding[]} findings - List of findings
 * @property {string} summary - Brief summary
 */

/**
 * @typedef {Object} ReviewerAdapter
 * @property {string} name - Adapter name
 * @property {() => Promise<boolean>} isConfigured - Check if configured
 * @property {(context: ReviewContext) => Promise<ReviewResult>} review - Run review
 */

// ============================================================================
// Built-in Adapters
// ============================================================================

/** @type {ReviewerAdapter} */
const sharedAdapter = {
  name: "shared",

  async isConfigured() {
    // Always considered configured because it delegates to the provider system
    // which has its own fallbacks
    return true;
  },

  async review(context) {
    // Use in-memory file map instead of disk sandbox
    const files = {};
    try {
      Object.assign(files, buildAgentReviewFiles(context));

      // Load prompt from skill at runtime
      const prompt = loadSkillPrompt("review-code");

      // Perform fast review if requested
      const isFastMode = process.argv.includes("--fast");
      const providerConfig = getProviderConfig(isFastMode);
      const harnessConfig = loadConfig();
      if (process.env.HARNESS_GEMINI_HOME && !providerConfig.homeDir) {
        providerConfig.homeDir = process.env.HARNESS_GEMINI_HOME;
      }
      if (harnessConfig.agents?.gemini_home && !providerConfig.homeDir) {
        providerConfig.homeDir = harnessConfig.agents.gemini_home;
      }
      if (harnessConfig.agents?.gemini_home_seed === false) {
        providerConfig.seedHome = false;
      }
      providerConfig.workspaceRoot = REPO_ROOT;
      const result = await runAgent({
        name: "agent-code-review",
        files,
        prompt,
        outputFile: "COMPLIANCE_REVIEW.json",
        providerConfig,
      });

      // ALL failures return high severity - no exceptions
      if (result.rateLimited) {
        const detail = result.error ? ` ${result.error}` : "";
        logError(
          `AI review unavailable (rate limit/network). Cannot proceed.${detail}`,
        );
        return {
          severity: "high",
          findings: [],
          summary: result.error
            ? `AI review unavailable: ${result.error}`
            : "AI review unavailable (rate limit/network). Review failed.",
        };
      }

      if (!result.success) {
        logError(result.error || "Provider failed");
        return {
          severity: "high",
          findings: [],
          summary: result.error
            ? `Provider failed: ${result.error}`
            : "Provider did not produce COMPLIANCE_REVIEW.json - Manual Code Review REQUIRED (Agent Failed)",
        };
      }

      const reviewData = result.result;

      if (reviewData) {
        return buildReviewResult(reviewData);
      }

      return {
        severity: "high",
        findings: [],
        summary: "Provider produced empty result",
      };
    } catch (error) {
      logError(`Review adapter error: ${error.message}`);
      recordAgentFailure({
        name: "agent-code-review",
        provider: "unknown",
        error,
        rateLimited: false,
      });
      return {
        severity: "high",
        findings: [],
        summary: `Review adapter error: ${error.message}`,
      };
      // Keep the sandbox for inspection (user requested this as default)
      // No info log needed for in-memory
    }
  },
};

// Registry of available adapters
const adapters = {
  shared: sharedAdapter,
  // Legacy alias
  codex: sharedAdapter,
};

// ============================================================================
// Adapter Selection
// ============================================================================

async function selectAdapter(configuredAdapter) {
  // If HARNESS_PROVIDER env var is set, prefer the shared adapter
  if (process.env.HARNESS_PROVIDER) {
    return sharedAdapter;
  }

  // Explicit adapter in config
  if (
    configuredAdapter &&
    configuredAdapter !== "auto" &&
    adapters[configuredAdapter]
  ) {
    const adapter = adapters[configuredAdapter];
    if (await adapter.isConfigured()) {
      return adapter;
    }
    logWarning(
      `Configured adapter '${configuredAdapter}' is not available, falling back to auto-detection`,
    );
  }

  if (configuredAdapter && configuredAdapter !== "auto") {
    logWarning(
      `Unknown adapter '${configuredAdapter}', falling back to shared adapter`,
    );
  }

  // Auto-detect: prefer shared (provider-backed)
  if (await sharedAdapter.isConfigured()) {
    return sharedAdapter;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  log("\n\x1b[36m=== Code Reviewer (Pluggable) ===\x1b[0m\n");

  const config = loadConfig();
  const reviewerConfig = config.reviewers?.code_reviewer || {};

  // Check if reviewer is enabled
  if (reviewerConfig.enabled === false) {
    logInfo("Code reviewer is disabled in config");
    process.exit(0);
  }

  const baseRef = resolveBaseRef({
    config,
    reviewerName: "code_reviewer",
    repoRoot: REPO_ROOT,
  });
  const failThreshold = reviewerConfig.fail_threshold || "high";
  const configuredAdapter = reviewerConfig.adapter || "auto";

  // Select adapter
  const adapter = await selectAdapter(configuredAdapter);
  log(`Using adapter: ${adapter.name} `);

  // Gather context - review ALL commits, not just those with test files
  const diffFiles = getDiffFiles(baseRef);

  if (diffFiles.length === 0) {
    logInfo("No changed files - skipping review");
    process.exit(0);
  }

  const testFiles = getTestFiles(diffFiles, config);

  const context = {
    diff: getDiff(baseRef),
    testFiles,
    historyEntries: getHistoryContent(diffFiles, config),
    sessionEntries: getSessionContent(diffFiles, config),
    touchedFiles: new Set(diffFiles),
    testCommand: reviewerConfig.test_command || "npm test",
  };

  log(`Reviewing ${diffFiles.length} changed files...\n`);

  // Run review
  const result = await adapter.review(context);

  // Output results - always show the agent response (bypass quiet mode)
  console.log("--- Agent Review Results ---");
  console.log(`Severity: ${result.severity.toUpperCase()}`);
  console.log(`Summary: ${result.summary}`);

  // Show change type if available
  if (result.changeType) {
    console.log(`Change Type: ${result.changeType.toUpperCase()}`);
  }
  if (result.entryTypeMismatch) {
    console.log(
      `⚠️  Entry Type Mismatch: Fix should use fix/incident entry, not decision`,
    );
  }
  if (result.missingTestsForFix) {
    console.log(`⚠️  Missing Tests: Fixes require test coverage`);
  }

  // Show quality metrics if available
  if (result.qualityScore !== undefined) {
    console.log(`Quality Score: ${result.qualityScore}/10`);
  }
  if (result.qualityBreakdown) {
    const breakdown = result.qualityBreakdown.replace(/^Why not 10:\s*/i, "");
    console.log(`  Why not 10: ${breakdown}`);
  }
  if (result.gamingDetected !== undefined) {
    console.log(`Gaming Detected: ${result.gamingDetected ? "YES ⚠️" : "No"}`);
  }
  if (result.criticalIssues) {
    console.log(`Critical Issues: ${result.criticalIssues}`);
  }

  if (result.findings.length > 0) {
    console.log("\nFindings:");
    for (const finding of result.findings) {
      console.log(
        `  - [${finding.pattern}] ${finding.file}${finding.line ? `:${finding.line}` : ""}`,
      );
      console.log(`    ${finding.description}`);
      if (finding.suggestedFix) {
        console.log(`    Fix: ${finding.suggestedFix}`);
      }
    }
  }

  // Skip the full JSON dump - too verbose

  // Determine exit based on threshold
  const severityLevels = { none: 0, low: 1, medium: 2, high: 3 };
  const resultLevel = severityLevels[result.severity] || 0;
  const thresholdLevel = severityLevels[failThreshold] || 3;

  log("");

  if (resultLevel >= thresholdLevel) {
    logError(
      `Review failed: severity ${result.severity} >= threshold ${failThreshold}`,
    );
    process.exit(1);
  } else {
    logSuccess(
      `Review passed: severity ${result.severity} < threshold ${failThreshold}`,
    );
    process.exit(0);
  }
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(2);
  });
}

// Export for testing
export {
  adapters,
  selectAdapter,
  getProviderConfig,
  buildReviewResult,
  buildReviewScope,
  buildAgentReviewFiles,
  getSessionContent,
};

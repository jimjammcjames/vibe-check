#!/usr/bin/env node

/**
 * Harness CLI Orchestrator
 *
 * Commands:
 *   prep          - Print MUST block from Harness.md
 *   iterate       - Format + lint fix (changed files)
 *   post          - Medium verification (tests + policy)
 *   ci            - Full CI gate (lint + typecheck + tripwire + review)
 *   new:learned   - Create a learned entry from template
 *   new:decision  - Create a decision entry from template
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

// Global verbose flag - default to quiet mode
const VERBOSE =
  process.argv.includes("--verbose") || process.argv.includes("-v");

// Set environment for child processes
// FIX: Remove HARNESS_QUIET to ensure tests run in standard environment (Isolation)
// if (!VERBOSE) {
//     process.env.HARNESS_QUIET = '1';
// }

// ============================================================================
// Utilities
// ============================================================================

function log(msg) {
  console.log(msg);
}

function logError(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
}

function logInfo(msg) {
  console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
}

/**
 * Kill orphaned processes from previous failed harness runs.
 * This ensures idempotency - iterate always starts from a clean state.
 */
function killOrphanedProcesses() {
  const patterns = ["prettier", "eslint", "tsc"];

  for (const pattern of patterns) {
    try {
      // Find processes matching the pattern that are related to this repo
      // Using pkill with -f to match command line arguments
      execSync(
        `pkill -f "${pattern}.*--write\\|--check\\|--fix" 2>/dev/null || true`,
        {
          cwd: REPO_ROOT,
          stdio: "ignore",
          shell: true,
        },
      );
    } catch {
      // pkill returns non-zero if no processes matched - that's fine
    }
  }
}

function printRecoveryPointers() {
  log(`
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
\x1b[33mRecovery:\x1b[0m
  1. Rerun the right stage:
     - \x1b[36mnpm run harness:iterate\x1b[0m (format + lint fix on changed files)
     - \x1b[36mnpm run harness:post\x1b[0m (medium verification: tests + policy)
     - \x1b[36mnpm run harness:ci\x1b[0m (full verification: lint + typecheck + tripwire + review)
  2. If you didn't run prep (or you're stuck):
     - \x1b[36mnpm run harness:prep\x1b[0m (prints MUST summary + grep recipe)
  3. For details:
     - open \x1b[36m.harness/Harness.md\x1b[0m
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
`);
}

function loadConfig() {
  const configPath = join(HARNESS_ROOT, "config.yml");
  if (!existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  // Simple YAML parser for our limited structure
  const content = readFileSync(configPath, "utf-8");
  return parseSimpleYaml(content);
}

function parseSimpleYaml(content) {
  const config = { stages: {}, globs: {} };
  let currentSection = null;
  let currentStage = null;
  let currentGlob = null;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "stages:") {
      currentSection = "stages";
      continue;
    }
    if (trimmed === "globs:") {
      currentSection = "globs";
      continue;
    }

    if (currentSection === "stages") {
      const stageMatch = trimmed.match(/^(\w+):$/);
      if (stageMatch && !trimmed.includes("command")) {
        currentStage = stageMatch[1];
        config.stages[currentStage] = [];
        continue;
      }

      if (currentStage && trimmed.startsWith("- command:")) {
        const cmd = trimmed
          .replace("- command:", "")
          .trim()
          .replace(/^["']|["']$/g, "");
        config.stages[currentStage].push({ command: cmd, files: "all" });
        continue;
      }

      if (currentStage && trimmed.startsWith("files:")) {
        const lastCmd =
          config.stages[currentStage][config.stages[currentStage].length - 1];
        if (lastCmd) {
          lastCmd.files = trimmed.replace("files:", "").trim();
        }
        continue;
      }
    }

    if (currentSection === "globs") {
      const globKeyMatch = trimmed.match(/^(\w+):(.*)$/);
      if (globKeyMatch) {
        const key = globKeyMatch[1];
        const value = globKeyMatch[2].trim();
        if (value && value !== "") {
          // Single-line value (learned/decisions)
          config.globs[key] = value.replace(/^["']|["']$/g, "");
        } else {
          // Multi-line array
          currentGlob = key;
          config.globs[key] = [];
        }
        continue;
      }

      if (currentGlob && trimmed.startsWith("-")) {
        const pattern = trimmed
          .slice(1)
          .trim()
          .replace(/^["']|["']$/g, "");
        config.globs[currentGlob].push(pattern);
      }
    }
  }

  return config;
}

function getChangedFiles() {
  try {
    // Get staged files
    const staged = execSync("git diff --cached --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Get unstaged modified files
    const unstaged = execSync("git diff --name-only", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Get untracked files
    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    return [...new Set([...staged, ...unstaged, ...untracked])];
  } catch {
    return [];
  }
}

function runCommand(command, files = "all") {
  const start = Date.now();
  const changedFiles = files === "changed" ? getChangedFiles() : [];

  if (files === "changed") {
    if (changedFiles.length === 0) {
      if (VERBOSE) logInfo(`Skipping (no changed files): ${command}`);
      return { success: true, output: "", duration: 0 };
    }
    // Filter to relevant files for the command
    const relevantFiles = changedFiles.filter(
      (f) =>
        f.endsWith(".ts") ||
        f.endsWith(".tsx") ||
        f.endsWith(".js") ||
        f.endsWith(".jsx") ||
        f.endsWith(".json") ||
        f.endsWith(".md"),
    );
    if (relevantFiles.length === 0) {
      if (VERBOSE) logInfo(`Skipping (no relevant files): ${command}`);
      return { success: true, output: "", duration: 0 };
    }
    command = `${command} ${relevantFiles.join(" ")}`;
  }

  if (VERBOSE) {
    log(`\n\x1b[90m$ ${command}\x1b[0m`);
  }

  try {
    if (VERBOSE) {
      execSync(command, {
        cwd: REPO_ROOT,
        stdio: "inherit",
        shell: true,
      });
      const duration = Date.now() - start;
      return { success: true, output: "", duration };
    } else {
      // Standard mode: capture output, print ONLY essential status
      // Note: stdio 'pipe' captures output without printing it
      const output = execSync(command, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: "pipe",
        shell: true,
      });

      // Extract only the most essential lines for visual heartbeat
      const lines = output.split("\n");
      const essentialLines = lines.filter((line) => {
        const trimmed = line.trim();
        // Only show: Rule pass/fail, Verdict, final summary
        return (
          trimmed.startsWith("✓ Rule") ||
          trimmed.startsWith("✗ Rule") ||
          trimmed.startsWith("✓ Policy") ||
          trimmed.startsWith("✓ All changes") ||
          trimmed.startsWith("✓ All entries") ||
          trimmed.includes("Verdict:") ||
          trimmed.startsWith("Severity:") ||
          trimmed.startsWith("✗ Review failed") ||
          trimmed.includes("INTEGRITY BREACH")
        );
      });

      if (essentialLines.length > 0) {
        log(essentialLines.join("\n"));
      }

      return { success: true, output, duration: Date.now() - start };
    }
  } catch (error) {
    // FAIL CASE: Print everything explicitly
    const stdout = error.stdout?.toString() || "";
    const stderr = error.stderr?.toString() || "";

    const duration = Date.now() - start;

    // Detect if process was killed externally (SIGTERM/SIGKILL)
    const wasTerminated =
      error.signal === "SIGTERM" ||
      error.signal === "SIGKILL" ||
      stderr.toLowerCase().includes("terminated") ||
      stderr.toLowerCase().includes("killed");

    if (wasTerminated) {
      logError(`Command was terminated externally: ${command}`);
      log("\n\x1b[33m⚠️  PROCESS COLLISION DETECTED\x1b[0m");
      log("Another harness instance may have killed this process.");
      log("\x1b[36m→ ACTION: Simply rerun the command. This is safe.\x1b[0m\n");
      return {
        success: false,
        output: stdout + stderr,
        duration,
        terminated: true,
      };
    }

    // BUBBLE UP ERROR SINK -> LOG IMMEDIATELY
    logError(`Command failed: ${command}`);
    if (stdout) {
      log("\n--- stdout ---");
      log(stdout);
    }
    if (stderr) {
      log("\n--- stderr ---");
      log(stderr);
    }
    log("--------------\n");

    return { success: false, output: stdout + stderr, duration };
  }
}

/**
 * Async version of runCommand for parallel execution.
 * Returns a Promise that resolves to { success, output, command }.
 */
async function runCommandAsync(command, files = "all") {
  return new Promise((resolve) => {
    const result = runCommand(command, files);
    resolve({ ...result, command });
  });
}

// ============================================================================
// Commands
// ============================================================================

function cmdPrep() {
  const harnessDocPath = join(HARNESS_ROOT, "Harness.md");

  if (!existsSync(harnessDocPath)) {
    logError("Harness.md not found at " + harnessDocPath);
    process.exit(1);
  }

  const content = readFileSync(harnessDocPath, "utf-8");

  // Extract MUST block
  const mustMatch = content.match(
    /<!-- BEGIN MUST -->([\s\S]*?)<!-- END MUST -->/,
  );

  if (!mustMatch) {
    logError("No MUST block found in Harness.md");
    log("Expected markers: <!-- BEGIN MUST --> and <!-- END MUST -->");
    process.exit(1);
  }

  log(
    "\n\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m",
  );
  log(
    "\x1b[36m║                         HARNESS MUST BLOCK                           ║\x1b[0m",
  );
  log(
    "\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\n",
  );

  log(mustMatch[1].trim());

  // Meta-Infrastructure check
  const changedFiles = getChangedFiles();
  const isHarnessWork = changedFiles.some(
    (f) => f.startsWith(".harness/") || f.startsWith("harness-tests/"),
  );

  if (isHarnessWork) {
    log("\n\x1b[31m⚠️  Meta-Infrastructure detected:\x1b[0m");
    log("\x1b[31mYou are modifying the harness itself.\x1b[0m");
    log(
      "\x1b[31mEnsure ARCHITECTURAL changes are documented in .harness/context/decisions/\x1b[0m",
    );
  }

  log(
    "\n\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m",
  );
  log(
    "\x1b[36m║  Memory lives in .harness/context/ — grep before creating new code   ║\x1b[0m",
  );
  log(
    "\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m",
  );

  log("\n\x1b[33mFor more details, open: .harness/Harness.md\x1b[0m\n");
}

function cmdIterate() {
  log("\n\x1b[36m=== harness:iterate ===\x1b[0m");

  // Clean up orphaned processes from previous failed runs (idempotency)
  killOrphanedProcesses();

  log("Running format + lint fix on changed files...\n");

  const config = loadConfig();
  const stage = config.stages.iterate || [];

  let success = true;
  for (const step of stage) {
    if (!runCommand(step.command, step.files).success) {
      success = false;
      // Continue anyway for iterate - we want to fix as much as possible
    }
  }

  if (success) {
    logSuccess("Iterate complete");
  } else {
    logError("Some commands had issues (see above)");
    printRecoveryPointers();
    process.exit(1);
  }
}

/**
 * Check if a command is an agent script that can run in parallel.
 * Agent scripts must be read-only analyzers with no git state mutations.
 * Note: base-tripwire is NOT parallelizable because it creates git worktrees,
 * which conflicts with concurrent git operations (causes ".git/index" errors).
 */
function isParallelizableAgent(command) {
  return (
    command.includes("undocumented-detector") ||
    command.includes("agent-memory-coherence") ||
    command.includes("harness-guardian") ||
    command.includes("agent-code-review")
  );
}

async function cmdPost() {
  log("\n\x1b[36m=== harness:post ===\x1b[0m");

  // Clean up orphaned processes from previous failed runs
  killOrphanedProcesses();

  if (VERBOSE) {
    log("Running verification (verbose)...\n");
  }

  const config = loadConfig();
  const stage = config.stages.post || [];

  // Phase 1: Static Checks (Fast-Fail)
  // - policy-audit
  // - npm test
  // These should run FIRST to catch obvious issues before engaging expensive agents.
  const staticChecks = stage.filter(
    (step) => !isParallelizableAgent(step.command),
  );
  const agentChecks = stage.filter((step) =>
    isParallelizableAgent(step.command),
  );

  log(`\n\x1b[36m▶ Phase 1: Static Checks (${staticChecks.length})\x1b[0m`);
  // Run static checks SERIALLY to ensure deterministic output and immediate failure
  for (const step of staticChecks) {
    // Use runCommand (sync) for static checks to bail out immediately
    const result = runCommand(step.command, step.files);
    if (!result.success) {
      logError(`Phase 1 Failed: ${step.command}`);
      // Error output is already handled by runCommand
      printRecoveryPointers();
      process.exit(1);
    }
  }
  logSuccess("Phase 1 (Static) passed");

  console.log("[HARNESS_PHASE:STATIC_PASS]");

  if (agentChecks.length > 0) {
    // Phase 2: Dynamic Checks (Agents)
    log(`\n\x1b[36m▶ Phase 2: Agents (${agentChecks.length})\x1b[0m`);

    const results = await Promise.all(
      agentChecks.map((step) => runCommandAsync(step.command, step.files)),
    );

    // Check for failures
    const failures = results.filter((r) => !r.success);

    if (SHOW_TIMING) {
      log("\n\x1b[36m=== Execution Timing ===\x1b[0m");
      // Sort by duration descending
      const allResults = [...results]; // Only agents here
      const sortedResults = allResults.sort((a, b) => b.duration - a.duration);

      for (const r of sortedResults) {
        let name = r.command
          .replace("node .harness/framework/scripts/", "")
          .replace(".mjs", "");
        if (name.length > 50) name = name.substring(0, 47) + "...";
        const seconds = (r.duration / 1000).toFixed(2);
        log(`${name.padEnd(30)} : ${seconds}s`);
      }
      log("");
    }

    if (failures.length > 0) {
      log("\n\x1b[31mPost verification failed!\x1b[0m");
      for (const failure of failures) {
        logError(`Failed: ${failure.command}`);
      }
      printRecoveryPointers();
      process.exit(1);
    }
  }

  logSuccess("Post verification complete");
  console.log("[HARNESS_VERDICT:PASS]");
}

function cmdCi() {
  log("\n\x1b[36m=== harness:ci ===\x1b[0m");

  // Clean up orphaned processes from previous failed runs
  killOrphanedProcesses();

  log("Running CI verification...\n");

  const config = loadConfig();
  const stage = config.stages.ci || [];

  for (const step of stage) {
    if (!runCommand(step.command, step.files).success) {
      logError(`Failed: ${step.command}`);
      printRecoveryPointers();
      process.exit(1);
    }
  }

  logSuccess("CI verification complete");
}

function getCurrentDate() {
  return process.env.HARNESS_DATE || new Date().toISOString().slice(0, 10);
}

function getContextRoot() {
  const override = process.env.HARNESS_CONTEXT_ROOT;
  if (!override) {
    return join(HARNESS_ROOT, "context");
  }
  return isAbsolute(override) ? override : join(REPO_ROOT, override);
}

function cmdNewLearned(slug) {
  const date = getCurrentDate();
  const filename = `${date}-${slug}.md`;
  const targetDir = join(getContextRoot(), "learned");
  const targetPath = join(targetDir, filename);
  const templatePath = join(
    HARNESS_ROOT,
    "framework",
    "templates",
    "learned.md",
  );

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (existsSync(targetPath)) {
    logError(`File already exists: ${targetPath}`);
    process.exit(1);
  }

  let template = "";
  if (existsSync(templatePath)) {
    template = readFileSync(templatePath, "utf-8");
    template = template.replace(/{{date}}/g, date);
    template = template.replace(/{{slug}}/g, slug);
  } else {
    template = `# ${slug}

**Date:** ${date}

## What Happened

(describe the bug or issue)

## Root Cause

(what was the underlying problem)

## Solution

(how you fixed it)

## Search terms

- 

## Related

NONE

## Tags

#
`;
  }

  writeFileSync(targetPath, template);
  logSuccess(`Created: ${targetPath}`);

  log("\nDon't forget to:");
  log("  1. Fill in the Search terms, Related, and Tags fields");
  log("  2. Add or update a test that proves the learning");
}

function cmdNewDecision(slug) {
  const date = getCurrentDate();
  const filename = `${date}-${slug}.md`;
  const targetDir = join(getContextRoot(), "decisions");
  const targetPath = join(targetDir, filename);
  const templatePath = join(
    HARNESS_ROOT,
    "framework",
    "templates",
    "decision.md",
  );

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (existsSync(targetPath)) {
    logError(`File already exists: ${targetPath}`);
    process.exit(1);
  }

  let template = "";
  if (existsSync(templatePath)) {
    template = readFileSync(templatePath, "utf-8");
    template = template.replace(/{{date}}/g, date);
    template = template.replace(/{{slug}}/g, slug);
  } else {
    template = `# ${slug}

**Date:** ${date}

## Context

(what situation led to this decision)

## Decision

(what you decided to do)

## Rationale

(why this approach over alternatives)

## Consequences

(what trade-offs or implications this has)

## Search terms

- 

## Related

NONE

## Tags

#
`;
  }

  writeFileSync(targetPath, template);
  logSuccess(`Created: ${targetPath}`);
  log("\nDon't forget to fill in the Search terms, Related, and Tags fields");
}

function cmdNewMeta(slug) {
  const date = getCurrentDate();
  const filename = `${date}-${slug}.md`;
  const targetDir = join(getContextRoot(), "decisions", "harness");
  const targetPath = join(targetDir, filename);
  const templatePath = join(
    HARNESS_ROOT,
    "framework",
    "templates",
    "harness-decision.md",
  );

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (existsSync(targetPath)) {
    logError(`File already exists: ${targetPath}`);
    process.exit(1);
  }

  if (!existsSync(templatePath)) {
    logError(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  let template = readFileSync(templatePath, "utf-8");
  template = template.replace(/{{date}}/g, date);
  template = template.replace(/{{slug}}/g, slug);

  writeFileSync(targetPath, template);
  logSuccess(`Created: ${targetPath}`);
  log("\nDon't forget to complete the Security & Integrity Impact section");
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

// Parse additional flags
let slug = null;
let SHOW_TIMING = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--slug" && args[i + 1]) {
    slug = args[i + 1];
    i++;
  }
  if (args[i] === "--timing") {
    SHOW_TIMING = true;
  }
}

switch (command) {
  case "prep":
    cmdPrep();
    break;

  case "iterate":
    cmdIterate();
    break;

  case "post":
    cmdPost().catch((err) => {
      logError(`Post failed: ${err.message}`);
      process.exit(1);
    });
    break;

  case "ci":
    cmdCi();
    break;

  case "new:learned":
    if (!slug) {
      logError("Usage: harness new:learned --slug <slug>");
      process.exit(1);
    }
    cmdNewLearned(slug);
    break;

  case "new:decision":
    if (!slug) {
      logError("Usage: harness new:decision --slug <slug>");
      process.exit(1);
    }
    cmdNewDecision(slug);
    break;

  case "new:meta":
    if (!slug) {
      logError("Usage: harness new:meta --slug <slug>");
      process.exit(1);
    }
    cmdNewMeta(slug);
    break;

  default:
    log("Harness CLI");
    log("");
    log("Usage: harness <command> [options]");
    log("");
    log("Commands:");
    log("  prep              Print MUST block from Harness.md");
    log("  iterate           Format + lint fix (changed files)");
    log("  post              Medium verification (tests + policy)");
    log(
      "  ci                Full CI gate (lint + typecheck + tripwire + review)",
    );
    log("  new:learned       Create a learned entry");
    log("  new:decision      Create a decision entry");
    log("  new:meta          Create a harness meta-decision entry");
    log("");
    log("Options:");
    log(
      "  --verbose, -v     Print full output (default: quiet, prints only on failure)",
    );
    log("  --slug <slug>     Slug for new entries (required for new:*)");
    process.exit(1);
}

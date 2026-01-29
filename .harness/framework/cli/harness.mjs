#!/usr/bin/env node

/**
 * Harness CLI Orchestrator
 *
 * Commands:
 *   prep          - Print MUST block from Harness.md
 *   iterate       - Format + lint fix (changed files)
 *   post          - Medium verification (tests + policy)
 *   ci            - Full CI gate (lint + typecheck + tripwire + agents)
 *   new:entry     - Create a context history entry from template
 *   new:meta      - Create a harness meta entry
 */

import { execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, dirname, isAbsolute, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { listSkillMeta } from "../lib/skills.mjs";

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

const HISTORY_TYPES = new Set([
  "fix",
  "decision",
  "incident",
  "refactor",
  "investigation",
  "meta",
  "feature",
  "note",
]);

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

function logWarning(msg) {
  console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
}

const DEFAULT_DIAGNOSTICS_DIR = join(HARNESS_ROOT, "diagnostics", "latest");

function prepareDiagnosticsForRun() {
  process.env.HARNESS_DIAGNOSTICS_DIR = DEFAULT_DIAGNOSTICS_DIR;
  try {
    rmSync(DEFAULT_DIAGNOSTICS_DIR, { recursive: true, force: true });
    mkdirSync(DEFAULT_DIAGNOSTICS_DIR, { recursive: true });
  } catch {
    // Diagnostics are best-effort only.
  }
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
     - \x1b[36mnpm run harness:ci\x1b[0m (full verification: lint + typecheck + tripwire + agents)
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

  // Skills summary
  const skills = listSkillMeta();
  if (skills.length > 0) {
    log(
      "\n\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m",
    );
    log(
      "\x1b[36m║                         AVAILABLE SKILLS                             ║\x1b[0m",
    );
    log(
      "\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\n",
    );
    log(JSON.stringify(skills, null, 2));
  }

  // Meta-Infrastructure check
  const changedFiles = getChangedFiles();
  const isHarnessWork = changedFiles.some(
    (f) => f.startsWith(".harness/") || f.startsWith("harness-tests/"),
  );

  if (isHarnessWork) {
    log("\n\x1b[31m⚠️  Meta-Infrastructure detected:\x1b[0m");
    log("\x1b[31mYou are modifying the harness itself.\x1b[0m");
    log(
      "\x1b[31mEnsure ARCHITECTURAL changes are documented in .harness/context/history/\x1b[0m",
    );
  }

  log(
    "\n\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m",
  );
  log(
    "\x1b[36m║  History lives in .harness/context/history — grep before new code    ║\x1b[0m",
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

function isAgentCommand(command) {
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
  prepareDiagnosticsForRun();

  const config = loadConfig();
  const stage = config.stages.post || [];

  const agentSteps = stage.filter((step) => isAgentCommand(step.command));
  if (agentSteps.length > 0) {
    logError("Agent scripts are CI-only. Remove them from harness:post.");
    for (const step of agentSteps) {
      logError(`Post includes agent step: ${step.command}`);
    }
    printRecoveryPointers();
    process.exit(1);
  }

  if (VERBOSE) {
    log("Running verification (verbose)...\n");
  }

  const results = [];
  log(`\n\x1b[36m▶ Post Checks (${stage.length})\x1b[0m`);
  for (const step of stage) {
    const result = runCommand(step.command, step.files);
    results.push({ command: step.command, duration: result.duration });
    if (!result.success) {
      logError(`Post check failed: ${step.command}`);
      printRecoveryPointers();
      process.exit(1);
    }
  }

  if (SHOW_TIMING && results.length > 0) {
    log("\n\x1b[36m=== Execution Timing ===\x1b[0m");
    const sortedResults = [...results].sort((a, b) => b.duration - a.duration);
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

  logSuccess("Post verification complete");
  console.log("[HARNESS_VERDICT:PASS]");
}

function cmdCi() {
  log("\n\x1b[36m=== harness:ci ===\x1b[0m");

  // Clean up orphaned processes from previous failed runs
  killOrphanedProcesses();
  prepareDiagnosticsForRun();

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

function getHistoryDir() {
  return join(getContextRoot(), "history");
}

function getTemplatePathForType(type) {
  if (type === "meta") {
    return join(HARNESS_ROOT, "framework", "templates", "history-meta.md");
  }
  if (type === "fix" || type === "incident") {
    return join(HARNESS_ROOT, "framework", "templates", "history-fix.md");
  }
  return join(HARNESS_ROOT, "framework", "templates", "history-decision.md");
}

function cmdNewEntry(slug, type) {
  if (!type || !HISTORY_TYPES.has(type)) {
    logError(
      `Invalid or missing type. Allowed: ${Array.from(HISTORY_TYPES).join(", ")}`,
    );
    process.exit(1);
  }

  const date = getCurrentDate();
  const filename = `${date}-${slug}.md`;
  const targetDir = getHistoryDir();
  const targetPath = join(targetDir, filename);
  const templatePath = getTemplatePathForType(type);

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
  template = template.replace(/{{type}}/g, type);

  writeFileSync(targetPath, template);
  logSuccess(`Created: ${targetPath}`);
  log("\nDon't forget to fill in Summary and Context sections");
}

function cmdNewMeta(slug) {
  cmdNewEntry(slug, "meta");
}

function listMarkdownFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      listMarkdownFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractLegacySection(content, heading) {
  const match = content.match(
    new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`),
  );
  return match ? match[1].trim() : "";
}

function parseLegacyList(sectionText) {
  if (!sectionText) return [];
  const items = [];
  for (const line of sectionText.split("\n")) {
    const cleaned = line.replace(/^[-*]\s*/, "").trim();
    if (!cleaned) continue;
    cleaned.split(",").forEach((token) => {
      const value = token.trim();
      if (value) items.push(value);
    });
  }
  return items;
}

function parseLegacyTags(sectionText) {
  if (!sectionText) return [];
  const matches = sectionText.match(/#[\w-]+/g) || [];
  return Array.from(new Set(matches));
}

function buildFrontmatter({ date, type, schema, searchTerms, related, tags }) {
  const formatYamlValue = (value) =>
    `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const lines = [
    "---",
    `date: ${date}`,
    `type: ${type}`,
    "status: active",
    `schema: ${schema}`,
    "search_terms:",
  ];
  for (const term of searchTerms) {
    lines.push(`  - ${formatYamlValue(term)}`);
  }
  lines.push("related:");
  for (const rel of related) {
    lines.push(`  - ${formatYamlValue(rel)}`);
  }
  lines.push("tags:");
  for (const tag of tags) {
    lines.push(`  - ${formatYamlValue(tag)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function updateLegacyLinks(content) {
  const replacements = [
    ["file://.harness/context/decisions/harness/", ".harness/context/history/"],
    ["file://.harness/context/decisions/", ".harness/context/history/"],
    ["file://.harness/context/learned/", ".harness/context/history/"],
    ["../decisions/harness/", ".harness/context/history/"],
    ["../decisions/", ".harness/context/history/"],
    ["../learned/", ".harness/context/history/"],
    [".harness/context/decisions/harness/", ".harness/context/history/"],
    [".harness/context/decisions/", ".harness/context/history/"],
    [".harness/context/learned/", ".harness/context/history/"],
  ];

  let updated = content;
  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }
  return updated;
}

function cmdMigrateHistory() {
  const contextRoot = getContextRoot();
  const historyDir = getHistoryDir();
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }

  const legacyRoots = [
    join(contextRoot, "learned"),
    join(contextRoot, "decisions"),
  ];

  const legacyFiles = legacyRoots.flatMap((dir) => listMarkdownFiles(dir));
  const filesToMigrate = legacyFiles.filter(
    (file) => !file.endsWith("TIMELINE.md"),
  );

  if (filesToMigrate.length === 0) {
    logSuccess("No legacy entries found to migrate");
    return;
  }

  const targets = new Map();
  for (const file of filesToMigrate) {
    const baseName = basename(file);
    if (targets.has(baseName)) {
      logError(`Filename collision: ${baseName}`);
      process.exit(1);
    }
    targets.set(baseName, file);
  }

  for (const [baseName, file] of targets.entries()) {
    const relative = file.replace(contextRoot + "/", "");
    let type = null;
    if (relative.startsWith("learned/")) {
      type = "fix";
    } else if (relative.startsWith("decisions/harness/")) {
      type = "meta";
    } else if (relative.startsWith("decisions/")) {
      type = "decision";
    }

    if (!type) {
      logWarning(`Skipping unknown entry type: ${relative}`);
      continue;
    }

    const content = readFileSync(file, "utf-8");
    const searchTerms = parseLegacyList(
      extractLegacySection(content, "Search terms"),
    );
    const relatedRaw = parseLegacyList(
      extractLegacySection(content, "Related"),
    );
    const tags = parseLegacyTags(extractLegacySection(content, "Tags"));
    const date = baseName.slice(0, 10);
    const related = relatedRaw.map((value) => updateLegacyLinks(value));

    const frontmatter = buildFrontmatter({
      date,
      type,
      schema: "v1",
      searchTerms: searchTerms.length > 0 ? searchTerms : ["legacy"],
      related: related.length > 0 ? related : ["NONE"],
      tags: tags.length > 0 ? tags : ["#history"],
    });

    const updatedContent = updateLegacyLinks(content);
    const migratedContent = `${frontmatter}\n\n${updatedContent}`;
    const targetPath = join(historyDir, baseName);
    writeFileSync(targetPath, migratedContent);
    rmSync(file);
    logSuccess(`Migrated: ${relative} -> history/${baseName}`);
  }

  logSuccess("History migration complete");
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

// Parse additional flags
let slug = null;
let type = null;
let SHOW_TIMING = false;
let geminiModel = null;
let codexModel = null;
let codexReasoning = null;
let providerOverride = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--slug" && args[i + 1]) {
    slug = args[i + 1];
    i++;
  }
  if (args[i] === "--type" && args[i + 1]) {
    type = args[i + 1];
    i++;
  }
  if (args[i] === "--timing") {
    SHOW_TIMING = true;
  }
  if (args[i] === "--gemini-model" && args[i + 1]) {
    geminiModel = args[i + 1];
    i++;
  }
  if (args[i] === "--codex-model" && args[i + 1]) {
    codexModel = args[i + 1];
    i++;
  }
  if (args[i] === "--codex-reasoning" && args[i + 1]) {
    codexReasoning = args[i + 1];
    i++;
  }
  if (args[i] === "--provider" && args[i + 1]) {
    providerOverride = args[i + 1];
    i++;
  }
  if (args[i] === "--codex") {
    providerOverride = "codex";
  }
}

if (geminiModel) {
  process.env.HARNESS_GEMINI_MODEL = geminiModel;
}
if (codexModel) {
  process.env.HARNESS_CODEX_MODEL = codexModel;
}
if (codexReasoning) {
  process.env.HARNESS_CODEX_REASONING = codexReasoning;
}
if (providerOverride) {
  process.env.HARNESS_PROVIDER = providerOverride;
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

  case "new:entry":
    if (!slug || !type) {
      logError("Usage: harness new:entry --slug <slug> --type <type>");
      process.exit(1);
    }
    cmdNewEntry(slug, type);
    break;

  case "new:meta":
    if (!slug) {
      logError("Usage: harness new:meta --slug <slug>");
      process.exit(1);
    }
    cmdNewMeta(slug);
    break;

  case "migrate:history":
    cmdMigrateHistory();
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
      "  ci                Full CI gate (lint + typecheck + tripwire + agents)",
    );
    log("  new:entry         Create a history entry (requires --type)");
    log("  new:meta          Create a harness meta entry");
    log("  migrate:history   Move legacy entries into history");
    log("");
    log("Options:");
    log(
      "  --verbose, -v     Print full output (default: quiet, prints only on failure)",
    );
    log("  --slug <slug>     Slug for new entries (required for new:*)");
    log("  --type <type>     Entry type (required for new:entry)");
    log("  --gemini-model <model>  Gemini model override for agent steps");
    log("  --codex                Use Codex CLI for agent steps");
    log("  --codex-model <model>  Codex model override for agent steps");
    log(
      "  --codex-reasoning <level>  Codex reasoning override for agent steps",
    );
    log("  --provider <name>       Provider override for agent steps");
    process.exit(1);
}

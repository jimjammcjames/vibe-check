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
 *   new:session   - Create a task session entry
 */

import { exec, execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import {
  join,
  dirname,
  isAbsolute,
  basename,
  resolve,
  relative,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadHarnessConfig } from "../lib/harness-config.mjs";
import { normalizeList, parseFrontmatter } from "../lib/history-entry.mjs";
import { listSkillMeta, syncAgentsSkillsOverview } from "../lib/skills.mjs";
import { minimatch } from "../scripts/minimatch.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(HARNESS_ROOT, "..");

const VERBOSE =
  process.argv.includes("--verbose") || process.argv.includes("-v");
let SHOW_TIMING = false;

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

function killOrphanedProcesses() {
  const patterns = ["prettier", "eslint", "tsc"];

  for (const pattern of patterns) {
    try {
      execSync(
        `pkill -f "${pattern}.*--write\\|--check\\|--fix" 2>/dev/null || true`,
        {
          cwd: REPO_ROOT,
          stdio: "ignore",
          shell: true,
        },
      );
    } catch {
      // pkill returns non-zero when no processes matched.
    }
  }
}

function printRecoveryPointers() {
  log(`
\x1b[33m───────────────────────────────────────────────────────────────────────\x1b[0m
\x1b[33mRecovery:\x1b[0m
  1. Rerun the right stage:
     - \x1b[36mnpm run harness:iterate\x1b[0m (format + lint fix on changed files)
     - \x1b[36mnpm run harness:post -- --staged\x1b[0m (staged commit intent gate)
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
  return loadHarnessConfig({ harnessRoot: HARNESS_ROOT });
}

function getChangedFiles() {
  try {
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

function filterRelevantChangedFiles(
  changedFiles,
  fileExists = (file) => existsSync(join(REPO_ROOT, file)),
) {
  return changedFiles.filter(
    (file) =>
      fileExists(file) &&
      (file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".js") ||
        file.endsWith(".jsx") ||
        file.endsWith(".json") ||
        file.endsWith(".md") ||
        file.endsWith(".mjs") ||
        file.endsWith(".yml") ||
        file.endsWith(".yaml")),
  );
}

function prepareCommand(command, files = "all") {
  const changedFiles = files === "changed" ? getChangedFiles() : [];
  if (files === "changed") {
    if (changedFiles.length === 0) {
      if (VERBOSE) logInfo(`Skipping (no changed files): ${command}`);
      return {
        command,
        skipped: true,
        result: { success: true, output: "", duration: 0 },
      };
    }
    const relevantFiles = filterRelevantChangedFiles(changedFiles);
    if (relevantFiles.length === 0) {
      if (VERBOSE) logInfo(`Skipping (no relevant files): ${command}`);
      return {
        command,
        skipped: true,
        result: { success: true, output: "", duration: 0 },
      };
    }
    command = `${command} ${relevantFiles.join(" ")}`;
  }

  return { command, skipped: false };
}

function extractDisplayName(command) {
  let displayName = command.split(" ")[0];
  if (displayName === "node") {
    displayName = command.split(" ")[1].split("/").pop();
  }
  return displayName;
}

function extractEssentialLines(output) {
  const lines = output.split("\n");
  return lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("✓ Rule") ||
      trimmed.startsWith("✗ Rule") ||
      trimmed.startsWith("✓ Policy") ||
      trimmed.startsWith("✓ All changes") ||
      trimmed.startsWith("✓ All entries") ||
      trimmed.startsWith("[TRIPWIRE:PASS]") ||
      trimmed.startsWith("[TRIPWIRE:FAIL]") ||
      trimmed.includes("Verdict:") ||
      trimmed.startsWith("Severity:") ||
      trimmed.startsWith("✗ Review failed") ||
      trimmed.includes("INTEGRITY BREACH")
    );
  });
}

function finalizeFailedCommand({ command, error, start }) {
  const stdout = error.stdout?.toString() || "";
  const stderr = error.stderr?.toString() || "";
  const duration = Date.now() - start;

  const wasTerminated =
    error.signal === "SIGTERM" ||
    error.signal === "SIGKILL" ||
    stderr.toLowerCase().includes("terminated") ||
    stderr.toLowerCase().includes("killed");

  if (wasTerminated) {
    logError(`Command was terminated externally: ${command}`);
    log("\n\x1b[33m⚠ PROCESS COLLISION DETECTED\x1b[0m");
    log("Another harness instance may have killed this process.");
    log("\x1b[36m→ ACTION: Simply rerun the command. This is safe.\x1b[0m\n");
    return {
      success: false,
      output: stdout + stderr,
      duration,
      terminated: true,
    };
  }

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

function runCommand(command, files = "all") {
  const start = Date.now();
  const prepared = prepareCommand(command, files);
  if (prepared.skipped) {
    return prepared.result;
  }

  command = prepared.command;

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
      return { success: true, output: "", duration: Date.now() - start };
    }

    logInfo(`Running ${extractDisplayName(command)}...`);
    const output = execSync(command, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
      shell: true,
    });

    const essentialLines = extractEssentialLines(output);
    if (essentialLines.length > 0) {
      log(essentialLines.join("\n"));
    }

    return { success: true, output, duration: Date.now() - start };
  } catch (error) {
    return finalizeFailedCommand({ command, error, start });
  }
}

function runCommandAsync(command, files = "all") {
  const start = Date.now();
  const prepared = prepareCommand(command, files);
  if (prepared.skipped) {
    return Promise.resolve(prepared.result);
  }

  command = prepared.command;

  if (VERBOSE) {
    log(`\n\x1b[90m$ ${command}\x1b[0m`);
  } else {
    logInfo(`Running ${extractDisplayName(command)}...`);
  }

  return new Promise((resolvePromise) => {
    const child = exec(command, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      shell: true,
      maxBuffer: 50 * 1024 * 1024,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
      if (VERBOSE) process.stdout.write(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
      if (VERBOSE) process.stderr.write(chunk);
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        if (!VERBOSE) {
          const essentialLines = extractEssentialLines(stdout);
          if (essentialLines.length > 0) {
            log(essentialLines.join("\n"));
          }
        }

        resolvePromise({
          success: true,
          output: stdout,
          duration: Date.now() - start,
        });
        return;
      }

      resolvePromise(
        finalizeFailedCommand({
          command,
          error: { stdout, stderr, signal },
          start,
        }),
      );
    });

    child.on("error", (error) => {
      resolvePromise(
        finalizeFailedCommand({
          command,
          error: { ...error, stdout, stderr },
          start,
        }),
      );
    });
  });
}

function cmdPrep() {
  try {
    syncAgentsSkillsOverview();
  } catch (error) {
    const message = error?.message || String(error);
    if (message.includes("AGENTS.md not found")) {
      logError(message);
      process.exit(1);
    }
    logWarning(`Could not sync AGENTS.md skills overview: ${message}`);
  }

  const harnessDocPath = join(HARNESS_ROOT, "Harness.md");

  if (!existsSync(harnessDocPath)) {
    logError(`Harness.md not found at ${harnessDocPath}`);
    process.exit(1);
  }

  const content = readFileSync(harnessDocPath, "utf-8");
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

  const config = loadConfig();
  const harnessCoreGlobs = config.globs.harnessCore || [];
  const changedFiles = getChangedFiles();
  const isHarnessWork = changedFiles.some(
    (file) =>
      matchesAnyGlob(file, harnessCoreGlobs) ||
      file.startsWith("harness-tests/"),
  );

  if (isHarnessWork) {
    log("\n\x1b[31m⚠ Meta-infrastructure detected:\x1b[0m");
    log("\x1b[31mYou are modifying the harness itself.\x1b[0m");
    log(
      "\x1b[31mDocument harness-core changes in .harness/context/history/\x1b[0m",
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
  killOrphanedProcesses();

  log("Running format + lint fix on changed files...\n");

  const config = loadConfig();
  const stage = config.stages.iterate || [];

  let success = true;
  for (const step of stage) {
    if (!runCommand(step.command, step.files).success) {
      success = false;
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

async function cmdPost({ stagedOnly = false } = {}) {
  log(`\n\x1b[36m=== harness:post${stagedOnly ? " --staged" : ""} ===\x1b[0m`);

  killOrphanedProcesses();
  prepareDiagnosticsForRun();

  if (stagedOnly) {
    log("Running staged commit policy verification...\n");

    const result = runCommand(
      "node .harness/framework/scripts/policy-audit.mjs --staged",
    );

    if (!result.success) {
      logError("Staged post check failed");
      printRecoveryPointers();
      process.exit(1);
    }

    logSuccess("Staged policy verification complete");
    console.log("[HARNESS_VERDICT:PASS]");
    return;
  }

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
    for (const result of sortedResults) {
      let name = result.command
        .replace("node .harness/framework/scripts/", "")
        .replace(".mjs", "");
      if (name.length > 50) {
        name = `${name.substring(0, 47)}...`;
      }
      log(`${name.padEnd(30)} : ${(result.duration / 1000).toFixed(2)}s`);
    }
    log("");
  }

  logSuccess("Post verification complete");
  console.log("[HARNESS_VERDICT:PASS]");
}

async function runCiStage(
  stage,
  { runner = runCommandAsync, parallelAgentReviews = false } = {},
) {
  const results = [];

  if (!parallelAgentReviews) {
    let ciChecksLogged = false;
    let agentReviewsLogged = false;

    for (const step of stage) {
      const agentStep = isAgentCommand(step.command);
      if (agentStep && !agentReviewsLogged) {
        const agentCount = stage.filter((item) =>
          isAgentCommand(item.command),
        ).length;
        log(`\n\x1b[36m▶ Agent Reviews (${agentCount})\x1b[0m`);
        agentReviewsLogged = true;
      }
      if (!agentStep && !ciChecksLogged) {
        const ciCount = stage.filter(
          (item) => !isAgentCommand(item.command),
        ).length;
        log(`\n\x1b[36m▶ CI Checks (${ciCount})\x1b[0m`);
        ciChecksLogged = true;
      }

      const result = await runner(step.command, step.files);
      results.push({ command: step.command, duration: result.duration });
      if (!result.success) {
        return { success: false, failedCommand: step.command, results };
      }
    }

    return { success: true, failedCommand: null, results };
  }

  const serialSteps = stage.filter((step) => !isAgentCommand(step.command));
  const agentSteps = stage.filter((step) => isAgentCommand(step.command));

  if (serialSteps.length > 0) {
    log(`\n\x1b[36m▶ CI Checks (${serialSteps.length})\x1b[0m`);
  }

  for (const step of serialSteps) {
    const result = await runner(step.command, step.files);
    results.push({ command: step.command, duration: result.duration });
    if (!result.success) {
      return { success: false, failedCommand: step.command, results };
    }
  }

  if (agentSteps.length > 0) {
    log(`\n\x1b[36m▶ Agent Reviews (${agentSteps.length}, parallel)\x1b[0m`);
    const agentResults = await Promise.all(
      agentSteps.map(async (step) => {
        const result = await runner(step.command, step.files);
        return {
          command: step.command,
          success: result.success,
          duration: result.duration,
        };
      }),
    );
    results.push(
      ...agentResults.map(({ command, duration }) => ({ command, duration })),
    );

    const failedAgent = agentResults.find((result) => !result.success);
    if (failedAgent) {
      return {
        success: false,
        failedCommand: failedAgent.command,
        results,
      };
    }
  }

  return { success: true, failedCommand: null, results };
}

async function cmdCi() {
  log("\n\x1b[36m=== harness:ci ===\x1b[0m");

  killOrphanedProcesses();
  prepareDiagnosticsForRun();

  log("Running CI verification...\n");

  const config = loadConfig();
  const stage = config.stages.ci || [];
  const outcome = await runCiStage(stage, {
    parallelAgentReviews:
      process.env.HARNESS_PARALLEL_AGENT_REVIEWS === "1" ||
      config.agents?.parallel_agent_reviews === true,
  });

  if (!outcome.success) {
    logError(`Failed: ${outcome.failedCommand}`);
    printRecoveryPointers();
    process.exit(1);
  }

  logSuccess("CI verification complete");
}

function getCurrentDate() {
  return process.env.HARNESS_DATE || new Date().toISOString().slice(0, 10);
}

function getCurrentTimestamp() {
  return process.env.HARNESS_TIMESTAMP || new Date().toISOString();
}

function getCurrentTimeCompact() {
  return getCurrentTimestamp().slice(11, 16).replace(":", "");
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

function getSessionsDir() {
  return join(getContextRoot(), "sessions");
}

function toRepoRelativePath(file) {
  const rel = relative(REPO_ROOT, file);
  if (!rel || rel.startsWith("..")) {
    return file;
  }
  return rel.replace(/\\/g, "/");
}

function resolveArtifactPath(file) {
  return isAbsolute(file) ? file : join(REPO_ROOT, file);
}

function matchesAnyGlob(file, patterns) {
  if (!patterns) return false;
  const values = Array.isArray(patterns) ? patterns : [patterns];
  return values.some((pattern) => minimatch(file, pattern));
}

function getStagedFiles() {
  try {
    return execSync("git diff --cached --name-only", {
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

function getStagedRealCodeFiles() {
  const config = loadConfig();
  const stagedFiles = getStagedFiles();
  const realCodeGlobs = config.globs.realCode || [];
  const exemptGlobs = config.globs.exempt || [];

  return stagedFiles.filter(
    (file) =>
      matchesAnyGlob(file, realCodeGlobs) && !matchesAnyGlob(file, exemptGlobs),
  );
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

function getSessionFiles() {
  const sessionsDir = getSessionsDir();
  if (!existsSync(sessionsDir)) return [];

  return listMarkdownFiles(sessionsDir)
    .map((file) => toRepoRelativePath(file))
    .sort()
    .reverse();
}

function formatYamlValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function serializeFrontmatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${formatYamlValue(item)}`);
      }
      continue;
    }
    lines.push(`${key}: ${formatYamlValue(value)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function writeMarkdownWithFrontmatter(targetPath, data, body) {
  const normalizedBody = body.replace(/^\n+/, "");
  writeFileSync(
    targetPath,
    `${serializeFrontmatter(data)}\n\n${normalizedBody}`.trimEnd() + "\n",
  );
}

function replaceTemplateList(template, key, values) {
  const listValues = values.length > 0 ? values : ["NONE"];
  const replacement = `${key}:\n${listValues
    .map((value) => `  - ${formatYamlValue(value)}`)
    .join("\n")}`;
  return template.replace(
    new RegExp(`${key}:\\n(?:\\s+- .*\\n?)+`),
    `${replacement}\n`,
  );
}

function formatSessionSlug(sessionFile) {
  const baseName = basename(sessionFile, ".md");
  return baseName.replace(/^\d{4}-\d{2}-\d{2}-\d{4}-/, "");
}

function formatSessionChoices(sessionFiles) {
  return sessionFiles
    .map((file) => `  - ${file} (slug: ${formatSessionSlug(file)})`)
    .join("\n");
}

function getCurrentDateSessionFiles(sessionFiles) {
  const datePrefix = `${getCurrentDate()}-`;
  return sessionFiles.filter((file) => basename(file).startsWith(datePrefix));
}

function resolveSessionRefs(sessionFiles, sessionSlug = null) {
  if (sessionSlug) {
    const matches = sessionFiles.filter(
      (file) => formatSessionSlug(file) === sessionSlug,
    );

    if (matches.length === 1) {
      return matches;
    }

    if (matches.length > 1) {
      throw new Error(
        `Multiple sessions matched --session-slug ${sessionSlug}.\n\n${formatSessionChoices(
          matches,
        )}\n\nPick a more specific slug.`,
      );
    }

    if (sessionFiles.length === 0) {
      throw new Error(
        `No session matched --session-slug ${sessionSlug}. No session artifacts exist yet.`,
      );
    }

    throw new Error(
      `No session matched --session-slug ${sessionSlug}.\n\nAvailable sessions:\n${formatSessionChoices(
        sessionFiles,
      )}`,
    );
  }

  const currentDateSessionFiles = getCurrentDateSessionFiles(sessionFiles);
  if (currentDateSessionFiles.length === 1) {
    return currentDateSessionFiles;
  }
  if (currentDateSessionFiles.length > 1) {
    throw new Error(
      `Multiple session files exist for ${getCurrentDate()}. Re-run with --session-slug <session-slug> so the new history entry links to the correct task.\n\nToday's sessions:\n${formatSessionChoices(
        currentDateSessionFiles,
      )}`,
    );
  }

  return ["NONE"];
}

function linkHistoryToSession(sessionFile, historyFile) {
  const targetPath = resolveArtifactPath(sessionFile);
  if (!existsSync(targetPath)) return;

  const content = readFileSync(targetPath, "utf-8");
  const { data, body } = parseFrontmatter(content);
  if (!data) return;

  const relatedHistory = normalizeList(data.related_history).filter(
    (value) => value !== "NONE",
  );
  if (!relatedHistory.includes(historyFile)) {
    relatedHistory.push(historyFile);
  }

  writeMarkdownWithFrontmatter(
    targetPath,
    {
      ...data,
      related_history: relatedHistory.length > 0 ? relatedHistory : ["NONE"],
    },
    body,
  );
}

function getHistoryEntryTemplatePath(type) {
  if (type === "meta") {
    return join(HARNESS_ROOT, "framework", "templates", "history-meta.md");
  }
  if (type === "fix" || type === "incident") {
    return join(HARNESS_ROOT, "framework", "templates", "history-fix.md");
  }
  return join(HARNESS_ROOT, "framework", "templates", "history-decision.md");
}

function renderHistoryEntryTemplate({
  slug,
  type,
  date = getCurrentDate(),
  relatedEntries = ["NONE"],
  affectedFiles = ["NONE"],
  sessionRefs = ["NONE"],
}) {
  const templatePath = getHistoryEntryTemplatePath(type);
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  let template = readFileSync(templatePath, "utf-8");
  template = template.replace(/{{date}}/g, date);
  template = template.replace(/{{slug}}/g, slug);
  template = template.replace(/{{type}}/g, type);
  template = replaceTemplateList(template, "related_entries", relatedEntries);
  template = replaceTemplateList(template, "affected_files", affectedFiles);
  template = replaceTemplateList(template, "session_refs", sessionRefs);
  return template;
}

function getSessionTemplatePath() {
  return join(HARNESS_ROOT, "framework", "templates", "session.md");
}

function cmdNewEntry(slug, type, sessionSlug = null) {
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

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (existsSync(targetPath)) {
    logError(`File already exists: ${targetPath}`);
    process.exit(1);
  }

  try {
    const sessionFiles = getSessionFiles();
    const sessionRefs = resolveSessionRefs(sessionFiles, sessionSlug);
    const stagedRealCodeFiles = getStagedRealCodeFiles();

    const template = renderHistoryEntryTemplate({
      slug,
      type,
      date,
      relatedEntries: ["NONE"],
      affectedFiles:
        stagedRealCodeFiles.length > 0 ? stagedRealCodeFiles : ["NONE"],
      sessionRefs,
    });

    writeFileSync(targetPath, template);

    if (sessionRefs.length === 1 && sessionRefs[0] !== "NONE") {
      linkHistoryToSession(
        sessionRefs[0],
        join(".harness", "context", "history", filename),
      );
    }

    logSuccess(`Created: ${targetPath}`);
    if (sessionRefs.length === 1 && sessionRefs[0] === "NONE") {
      logWarning(
        'No session linked. Run `npm run harness:new:session -- --slug "task-name"` if this change needs commit-time session coverage.',
      );
    }
    log(
      "\nDon't forget to fill in the required v3 sections, affected_files, and validation details.",
    );
  } catch (error) {
    logError(error?.message || String(error));
    process.exit(1);
  }
}

function cmdNewMeta(slug, sessionSlug = null) {
  cmdNewEntry(slug, "meta", sessionSlug);
}

function cmdNewSession(slug) {
  if (!slug) {
    logError("Usage: harness new:session --slug <slug>");
    process.exit(1);
  }

  const date = getCurrentDate();
  const filename = `${date}-${getCurrentTimeCompact()}-${slug}.md`;
  const targetDir = getSessionsDir();
  const targetPath = join(targetDir, filename);
  const templatePath = getSessionTemplatePath();

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
  template = template.replace(/{{started_at}}/g, getCurrentTimestamp());
  template = template.replace(/{{slug}}/g, slug);

  writeFileSync(targetPath, template);
  logSuccess(`Created: ${targetPath}`);
  log("\nUpdate the session as the task evolves; there is no close step.");
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
    const relative = file.replace(`${contextRoot}/`, "");
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

    const migratedContent = `${frontmatter}\n\n${updateLegacyLinks(content)}`;
    const targetPath = join(historyDir, baseName);
    writeFileSync(targetPath, migratedContent);
    rmSync(file);
    logSuccess(`Migrated: ${relative} -> history/${baseName}`);
  }

  logSuccess("History migration complete");
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  let slug = null;
  let type = null;
  let sessionSlug = null;
  let geminiModel = null;
  let codexModel = null;
  let codexReasoning = null;
  let copilotModel = null;
  let copilotReasoning = null;
  let parallelAgentReviews = false;
  let providerOverride = null;
  let stagedOnly = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--slug" && args[i + 1]) {
      slug = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--type" && args[i + 1]) {
      type = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--session-slug" && args[i + 1]) {
      sessionSlug = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--timing") {
      SHOW_TIMING = true;
      continue;
    }
    if (args[i] === "--gemini-model" && args[i + 1]) {
      geminiModel = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--codex-model" && args[i + 1]) {
      codexModel = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--codex-reasoning" && args[i + 1]) {
      codexReasoning = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--copilot-model" && args[i + 1]) {
      copilotModel = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--copilot-reasoning" && args[i + 1]) {
      copilotReasoning = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--provider" && args[i + 1]) {
      providerOverride = args[i + 1];
      i++;
      continue;
    }
    if (args[i] === "--codex") {
      providerOverride = "codex";
      continue;
    }
    if (args[i] === "--copilot") {
      providerOverride = "copilot";
      continue;
    }
    if (args[i] === "--parallel-agent-reviews") {
      parallelAgentReviews = true;
      continue;
    }
    if (args[i] === "--staged") {
      stagedOnly = true;
    }
  }

  if (geminiModel) process.env.HARNESS_GEMINI_MODEL = geminiModel;
  if (codexModel) process.env.HARNESS_CODEX_MODEL = codexModel;
  if (codexReasoning) process.env.HARNESS_CODEX_REASONING = codexReasoning;
  if (copilotModel) process.env.HARNESS_COPILOT_MODEL = copilotModel;
  if (copilotReasoning) {
    process.env.HARNESS_COPILOT_REASONING = copilotReasoning;
  }
  if (parallelAgentReviews) {
    process.env.HARNESS_PARALLEL_AGENT_REVIEWS = "1";
  }
  if (providerOverride) process.env.HARNESS_PROVIDER = providerOverride;

  switch (command) {
    case "prep":
      cmdPrep();
      break;
    case "iterate":
      cmdIterate();
      break;
    case "post":
      cmdPost({ stagedOnly }).catch((error) => {
        logError(`Post failed: ${error.message}`);
        process.exit(1);
      });
      break;
    case "ci":
      cmdCi().catch((error) => {
        logError(`CI failed: ${error.message}`);
        process.exit(1);
      });
      break;
    case "new:entry":
      if (!slug || !type) {
        logError("Usage: harness new:entry --slug <slug> --type <type>");
        process.exit(1);
      }
      cmdNewEntry(slug, type, sessionSlug);
      break;
    case "new:meta":
      if (!slug) {
        logError("Usage: harness new:meta --slug <slug>");
        process.exit(1);
      }
      cmdNewMeta(slug, sessionSlug);
      break;
    case "new:session":
      if (!slug) {
        logError("Usage: harness new:session --slug <slug>");
        process.exit(1);
      }
      cmdNewSession(slug);
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
      log("  new:session       Create a task session entry");
      log("  migrate:history   Move legacy entries into history");
      log("");
      log("Options:");
      log(
        "  --verbose, -v     Print full output (default: quiet, prints only on failure)",
      );
      log("  --slug <slug>     Slug for new entries (required for new:*)");
      log(
        "  --session-slug <slug>  Explicit session slug to link when multiple candidate sessions exist",
      );
      log("  --type <type>     Entry type (required for new:entry)");
      log(
        "  --staged          Run staged-only commit policy verification for post",
      );
      log(
        "  --parallel-agent-reviews    Run CI agent review steps in parallel",
      );
      log(
        "  --gemini-model <model>      Gemini model override for agent steps",
      );
      log("  --codex                      Use Codex CLI for agent steps");
      log(
        "  --codex-model <model>        Codex model override for agent steps",
      );
      log(
        "  --codex-reasoning <level>   Codex reasoning override for agent steps",
      );
      log(
        "  --copilot                    Use GitHub Copilot CLI for agent steps",
      );
      log(
        "  --copilot-model <model>     GitHub Copilot model override for agent steps",
      );
      log(
        "  --copilot-reasoning <level> GitHub Copilot reasoning override for agent steps",
      );
      log("  --provider <name>            Provider override for agent steps");
      process.exit(1);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const isDirectExecution =
  invokedPath !== null && import.meta.url === pathToFileURL(invokedPath).href;

if (isDirectExecution) {
  main();
}

export {
  filterRelevantChangedFiles,
  formatSessionChoices,
  renderHistoryEntryTemplate,
  resolveSessionRefs,
  runCiStage,
};

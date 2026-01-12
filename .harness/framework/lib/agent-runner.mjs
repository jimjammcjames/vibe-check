/**
 * Agent Runner
 *
 * Shared execution logic for all harness agents.
 * Handles sandbox creation, file staging, provider invocation, and result parsing.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { getProvider } from "../providers/index.mjs";

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
} // Always show errors
function logSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
} // Always show success
function logWarning(msg) {
  console.log(`\x1b[33m⚠ ${msg}\x1b[0m`);
} // Always show warnings
function logInfo(msg) {
  if (!QUIET) console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
}

function normalizeDiagnosticValue(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function recordAgentFailure({ name, provider, error, rateLimited }) {
  try {
    const overrideDir = process.env.HARNESS_DIAGNOSTICS_DIR;
    const diagnosticsDir = overrideDir
      ? isAbsolute(overrideDir)
        ? overrideDir
        : join(REPO_ROOT, overrideDir)
      : join(HARNESS_ROOT, "diagnostics", "latest");
    mkdirSync(diagnosticsDir, { recursive: true });
    const logPath = join(diagnosticsDir, "agent-failures.log");
    const message = normalizeDiagnosticValue(error);
    const payload = {
      timestamp: new Date().toISOString(),
      agent: name,
      provider,
      rate_limited: Boolean(rateLimited),
      error: message ? message.replace(/\s+/g, " ").trim().slice(0, 800) : null,
    };
    writeFileSync(logPath, `${JSON.stringify(payload)}\n`, { flag: "a" });
  } catch {
    // Ignore diagnostics write failures
  }
}

/**
 * Load harness config
 */
function loadConfig() {
  const configPath = join(HARNESS_ROOT, "config.yml");
  if (!existsSync(configPath)) {
    return { agents: { provider: "http" } };
  }

  const content = readFileSync(configPath, "utf-8");
  const lines = content.split("\n");
  const agents = {};
  let inAgents = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!line.startsWith(" ") && trimmed === "agents:") {
      inAgents = true;
      continue;
    }
    if (!line.startsWith(" ") && trimmed.endsWith(":")) {
      inAgents = false;
      continue;
    }

    if (inAgents) {
      const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let value = kvMatch[2].replace(/^["']|["']$/g, "");
        if (value === "true") value = true;
        if (value === "false") value = false;
        agents[key] = value;
      }
    }
  }

  return {
    agents: {
      provider: agents.provider || "http",
      gemini_home: agents.gemini_home || null,
      gemini_model: agents.gemini_model || null,
      codex_model: agents.codex_model || null,
      codex_reasoning: agents.codex_reasoning || null,
      gemini_home_seed:
        typeof agents.gemini_home_seed === "boolean"
          ? agents.gemini_home_seed
          : undefined,
    },
  };
}

// ============================================================================
// Agent Runner
// ============================================================================

/**
 * Run an agent task
 *
 * @param {object} options
 * @param {string} options.name - Agent name (used for sandbox directory prefix)
 * @param {object} options.files - Map of filename -> content to stage
 * @param {string} options.prompt - Prompt to send to the LLM
 * @param {string} options.outputFile - Expected output file (e.g., 'RESULT.json')
 * @param {object} options.providerConfig - Optional provider-specific config
 * @param {string} options.providerOverride - Optional: force a specific provider
 * @returns {object} { success, result, rateLimited, sandboxDir, error }
 */
export async function runAgent({
  name,
  files,
  prompt,
  outputFile,
  providerConfig = {},
  providerOverride,
}) {
  // Get provider
  const config = loadConfig();
  const providerName =
    providerOverride ||
    process.env.HARNESS_PROVIDER ||
    config.agents?.provider ||
    "http";

  const provider = getProvider(providerName);

  logInfo(`Using provider: ${provider.name}`);

  // Invoke provider
  const startTime = Date.now();
  const mergedProviderConfig = {
    ...providerConfig,
    workspaceRoot: REPO_ROOT,
  };
  if (process.env.HARNESS_GEMINI_MODEL && !mergedProviderConfig.model) {
    mergedProviderConfig.model = process.env.HARNESS_GEMINI_MODEL;
  }
  if (process.env.HARNESS_GEMINI_HOME && !mergedProviderConfig.homeDir) {
    mergedProviderConfig.homeDir = process.env.HARNESS_GEMINI_HOME;
  }
  if (config.agents?.gemini_model && !mergedProviderConfig.model) {
    mergedProviderConfig.model = config.agents.gemini_model;
  }
  if (config.agents?.gemini_home && !mergedProviderConfig.homeDir) {
    mergedProviderConfig.homeDir = config.agents.gemini_home;
  }
  if (config.agents?.gemini_home_seed === false) {
    mergedProviderConfig.seedHome = false;
  }
  if (provider.name === "codex") {
    if (process.env.HARNESS_CODEX_MODEL && !mergedProviderConfig.model) {
      mergedProviderConfig.model = process.env.HARNESS_CODEX_MODEL;
    }
    if (process.env.HARNESS_CODEX_REASONING) {
      mergedProviderConfig.reasoningEffort =
        process.env.HARNESS_CODEX_REASONING;
    }
    if (config.agents?.codex_model && !mergedProviderConfig.model) {
      mergedProviderConfig.model = config.agents.codex_model;
    }
    if (config.agents?.codex_reasoning) {
      mergedProviderConfig.reasoningEffort = config.agents.codex_reasoning;
    }
  }

  let result;
  try {
    result = await provider.invoke({
      prompt,
      files,
      outputFile,
      config: mergedProviderConfig,
    });
  } catch (error) {
    recordAgentFailure({
      name,
      provider: provider.name,
      error,
      rateLimited: false,
    });
    logWarning("Agent execution failed.");
    logError(
      `Error: ${normalizeDiagnosticValue(error) || "Provider threw error"}`,
    );
    return {
      success: false,
      rateLimited: false,
      result: null,
      error: normalizeDiagnosticValue(error),
    };
  }
  const duration = Date.now() - startTime;
  logInfo(`Execution time: ${duration}ms`);

  // Handle result
  if (result.rateLimited) {
    logWarning("Provider unavailable (rate limit/network).");
    if (result.error) logError(result.error);
    recordAgentFailure({
      name,
      provider: provider.name,
      error: result.error || "Provider unavailable",
      rateLimited: true,
    });
    return {
      success: false,
      rateLimited: true,
      result: null,
      error: result.error,
    };
  }

  if (!result.success) {
    logWarning("Agent did not produce expected output.");
    if (result.error) logError(`Error: ${result.error}`);
    if (result.stderr) {
      logInfo("--- STDERR ---");
      console.log(result.stderr);
      logInfo("--------------");
    }
    recordAgentFailure({
      name,
      provider: provider.name,
      error: result.error || "Agent did not produce expected output",
      rateLimited: false,
    });
    return {
      success: false,
      rateLimited: false,
      result: null,
      error: result.error,
    };
  }

  return {
    success: true,
    rateLimited: false,
    result: result.result,
    error: null,
  };
}

/**
 * Export utilities for agents that need them
 */
export {
  log,
  logError,
  logSuccess,
  logWarning,
  logInfo,
  REPO_ROOT,
  HARNESS_ROOT,
};

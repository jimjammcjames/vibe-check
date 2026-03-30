/**
 * Agent Runner
 *
 * Shared execution logic for all harness agents.
 * Handles sandbox creation, file staging, provider invocation, and result parsing.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHarnessConfig } from "./harness-config.mjs";
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

function buildProviderConfig(providerName, providerConfig, config) {
  const mergedProviderConfig = {
    ...providerConfig,
    workspaceRoot: REPO_ROOT,
  };

  if (providerName === "gemini") {
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
  }

  if (providerName === "codex") {
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

  if (providerName === "copilot") {
    if (process.env.HARNESS_COPILOT_MODEL && !mergedProviderConfig.model) {
      mergedProviderConfig.model = process.env.HARNESS_COPILOT_MODEL;
    }
    if (process.env.HARNESS_COPILOT_REASONING) {
      mergedProviderConfig.reasoningEffort =
        process.env.HARNESS_COPILOT_REASONING;
    }
    if (
      process.env.HARNESS_COPILOT_CONFIG_DIR &&
      !mergedProviderConfig.configDir
    ) {
      mergedProviderConfig.configDir = process.env.HARNESS_COPILOT_CONFIG_DIR;
    }
    if (config.agents?.copilot_model && !mergedProviderConfig.model) {
      mergedProviderConfig.model = config.agents.copilot_model;
    }
    if (config.agents?.copilot_reasoning) {
      mergedProviderConfig.reasoningEffort = config.agents.copilot_reasoning;
    }
    if (config.agents?.copilot_config_dir && !mergedProviderConfig.configDir) {
      mergedProviderConfig.configDir = config.agents.copilot_config_dir;
    }
  }

  return mergedProviderConfig;
}

function resolveProviderSequence({ providerOverride, config }) {
  if (providerOverride) {
    return [providerOverride];
  }

  if (process.env.HARNESS_PROVIDER) {
    return [process.env.HARNESS_PROVIDER];
  }

  const primaryProvider = config.agents?.provider || "http";
  const fallbackProvider = config.agents?.fallback_provider;
  return [...new Set([primaryProvider, fallbackProvider].filter(Boolean))];
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
  const config = loadHarnessConfig({
    harnessRoot: HARNESS_ROOT,
    requireBaseConfig: false,
  });
  return {
    ...config,
    agents: {
      provider: config.agents?.provider || "http",
      fallback_provider: config.agents?.fallback_provider || null,
      gemini_home: config.agents?.gemini_home || null,
      gemini_model: config.agents?.gemini_model || null,
      codex_model: config.agents?.codex_model || null,
      codex_reasoning: config.agents?.codex_reasoning || null,
      copilot_model: config.agents?.copilot_model || null,
      copilot_reasoning: config.agents?.copilot_reasoning || null,
      copilot_config_dir: config.agents?.copilot_config_dir || null,
      gemini_home_seed:
        typeof config.agents?.gemini_home_seed === "boolean"
          ? config.agents.gemini_home_seed
          : undefined,
      parallel_agent_reviews: config.agents?.parallel_agent_reviews,
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
  const config = loadConfig();
  const providerSequence = resolveProviderSequence({
    providerOverride,
    config,
  });
  let lastRateLimitedResult = null;

  for (const [index, providerName] of providerSequence.entries()) {
    const provider = getProvider(providerName);
    const nextProviderName = providerSequence[index + 1];
    const mergedProviderConfig = buildProviderConfig(
      provider.name,
      providerConfig,
      config,
    );

    logInfo(
      `Using provider: ${provider.name}${index > 0 ? " (fallback)" : ""}`,
    );

    let result;
    try {
      const startTime = Date.now();
      result = await provider.invoke({
        prompt,
        files,
        outputFile,
        config: mergedProviderConfig,
      });
      const duration = Date.now() - startTime;
      logInfo(`Execution time: ${duration}ms`);
    } catch (error) {
      recordAgentFailure({
        name,
        provider: provider.name,
        error,
        rateLimited: false,
      });
      if (nextProviderName) {
        logWarning(
          `Provider ${provider.name} failed before producing output. Falling back to provider: ${nextProviderName}`,
        );
        continue;
      }
      logWarning("Agent execution failed.");
      logError(
        `Error: ${normalizeDiagnosticValue(error) || "Provider threw error"}`,
      );
      return {
        success: false,
        rateLimited: false,
        result: null,
        sandboxDir: null,
        error: normalizeDiagnosticValue(error),
      };
    }

    if (result.rateLimited) {
      lastRateLimitedResult = result;
      recordAgentFailure({
        name,
        provider: provider.name,
        error: result.error || "Provider unavailable",
        rateLimited: true,
      });
      if (nextProviderName) {
        logWarning(
          `Provider ${provider.name} unavailable (rate limit/network). Falling back to provider: ${nextProviderName}`,
        );
        continue;
      }
      logWarning("Provider unavailable (rate limit/network).");
      if (result.error) logError(result.error);
      return {
        success: false,
        rateLimited: true,
        result: null,
        sandboxDir: result.sandboxDir || null,
        error: result.error,
      };
    }

    if (!result.success) {
      recordAgentFailure({
        name,
        provider: provider.name,
        error: result.error || "Agent did not produce expected output",
        rateLimited: false,
      });
      if (nextProviderName) {
        logWarning(
          `Provider ${provider.name} did not produce expected output. Falling back to provider: ${nextProviderName}`,
        );
        continue;
      }
      logWarning("Agent did not produce expected output.");
      if (result.error) logError(`Error: ${result.error}`);
      if (result.stderr) {
        logInfo("--- STDERR ---");
        console.log(result.stderr);
        logInfo("--------------");
      }
      return {
        success: false,
        rateLimited: false,
        result: null,
        sandboxDir: result.sandboxDir || null,
        error: result.error,
      };
    }

    return {
      success: true,
      rateLimited: false,
      result: result.result,
      sandboxDir: result.sandboxDir || null,
      error: null,
    };
  }

  return {
    success: false,
    rateLimited: true,
    result: null,
    sandboxDir: lastRateLimitedResult?.sandboxDir || null,
    error: lastRateLimitedResult?.error || "Provider unavailable",
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

/**
 * Gemini CLI Provider
 *
 * Invokes Google Gemini CLI for agent tasks.
 * Unlike Codex, Gemini doesn't have a sandbox/workspace concept,
 * so we include file contents in the prompt and parse JSON response.
 */

import { execSync } from "node:child_process";
import {
  accessSync,
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import os from "node:os";

/**
 * Default configuration for Gemini
 */
const DEFAULT_CONFIG = {
  timeout: 300000, // 5 minutes
  diffOnly: false, // If true, only read HARNESS_DIFF.txt for context
  model: "gemini-3-flash-preview", // Default Gemini model
  homeDir: null, // Optional override for GEMINI HOME location
  seedHome: true, // Copy ~/.gemini into homeDir if missing
  workspaceRoot: null, // Optional repo root for relative homeDir
};

function resolveHomeDir(homeDir, workspaceRoot) {
  if (!homeDir) return null;
  if (isAbsolute(homeDir)) return homeDir;
  if (workspaceRoot) return resolve(workspaceRoot, homeDir);
  return resolve(homeDir);
}

function isWritableDir(dirPath) {
  try {
    accessSync(dirPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function maybeSeedGeminiHome(homeDir, seedHome, workspaceRoot) {
  if (!homeDir || !seedHome) return;
  const realHome = process.env.HOME || os.homedir();
  if (!realHome || realHome === homeDir) return;

  const sourceDir = join(realHome, ".gemini");
  const targetDir = join(homeDir, ".gemini");
  if (existsSync(targetDir) || !existsSync(sourceDir)) return;

  try {
    mkdirSync(homeDir, { recursive: true });
    cpSync(sourceDir, targetDir, { recursive: true });
  } catch {
    // Ignore seed failures; Gemini can still initialize fresh state.
  }
}

function parseJsonCandidate(text) {
  if (!text) return null;
  let jsonStr = String(text).trim();
  if (!jsonStr) return null;

  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Fall through to greedy extraction.
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function extractReportDetails(stderr) {
  if (!stderr) return null;
  const match = String(stderr).match(/Full report available at:\s*(\S+)/);
  if (!match) return null;

  const reportPath = match[1];
  if (!existsSync(reportPath)) {
    return { path: reportPath, message: null };
  }

  try {
    const report = JSON.parse(readFileSync(reportPath, "utf-8"));
    const message =
      report &&
      typeof report === "object" &&
      report.error &&
      typeof report.error.message === "string"
        ? report.error.message
        : null;
    return { path: reportPath, message };
  } catch {
    return { path: reportPath, message: null };
  }
}

function summarizeText(text, maxLength = 1200) {
  if (!text) return null;
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength)}...`;
}

/**
 * Gemini provider implementation
 */
export const geminiProvider = {
  name: "gemini",

  /**
   * Check if Gemini CLI is available
   */
  async isAvailable() {
    try {
      execSync("which gemini", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Invoke Gemini to run an agent task
   *
   * @param {object} options
   * @param {string} options.prompt - The prompt to send to the agent
   * @param {string} options.sandboxDir - Directory containing staged files
   * @param {string} options.outputFile - Expected output file name (e.g., 'RESULT.json')
   * @param {object} options.config - Provider config overrides
   * @returns {object} { success, result, stdout, stderr, error }
   */
  async invoke({ prompt, files = {}, outputFile, config = {} }) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const configuredHome = resolveHomeDir(cfg.homeDir, cfg.workspaceRoot);
    const homeDir =
      configuredHome ||
      (cfg.workspaceRoot && !isWritableDir(os.homedir())
        ? join(cfg.workspaceRoot, ".harness", ".gemini-home")
        : null);

    if (homeDir) {
      maybeSeedGeminiHome(homeDir, cfg.seedHome, cfg.workspaceRoot);
      mkdirSync(homeDir, { recursive: true });
    }

    // Create a temporary sandbox for debug logs
    const tempDir = execSync("mktemp -d -t harness-gemini-XXXXXX", {
      encoding: "utf-8",
    }).trim();

    // Build the context from in-memory files
    let contextFiles = "";
    if (cfg.diffOnly) {
      // Only include HARNESS_DIFF.txt if present
      if (files["HARNESS_DIFF.txt"]) {
        contextFiles += `\n\n=== HARNESS_DIFF.txt ===\n${files["HARNESS_DIFF.txt"]}`;
      }
    } else {
      for (const [filename, content] of Object.entries(files)) {
        if (content) {
          contextFiles += `\n\n=== ${filename} ===\n${content}`;
        }
      }
    }

    // Build the enhanced prompt
    const jsonOutputName = outputFile.replace(".json", "");
    const enhancedPrompt = `${prompt}

=== FILES FOR CONTEXT ===${contextFiles}

=== CRITICAL INSTRUCTION ===
You MUST respond with ONLY valid JSON matching the ${jsonOutputName} schema described above.
Do NOT include any explanation, markdown formatting, or code blocks.
Output ONLY the raw JSON object, nothing else.`;

    const modelName = cfg.model || "gemini-3-flash-preview";

    let stdout = "";
    let stderr = "";

    try {
      stdout = execSync(`gemini -m "${modelName}" --output-format json`, {
        cwd: tempDir, // Run in temp dir
        encoding: "utf-8",
        timeout: cfg.timeout,
        stdio: ["pipe", "pipe", "pipe"],
        input: enhancedPrompt,
        maxBuffer: 10 * 1024 * 1024,
        env: homeDir
          ? { ...process.env, HOME: homeDir, USERPROFILE: homeDir }
          : process.env,
      });
    } catch (error) {
      stdout = error.stdout ? String(error.stdout) : "";
      stderr = error.stderr ? String(error.stderr) : "";
    }

    // Save debug logs to temp dir
    try {
      writeFileSync(join(tempDir, "PROVIDER_STDOUT.txt"), stdout);
      writeFileSync(join(tempDir, "PROVIDER_STDERR.txt"), stderr);
      writeFileSync(join(tempDir, "PROMPT.txt"), enhancedPrompt); // Save prompt for debugging
    } catch (e) {
      /* ignore write errors */
    }

    const stdoutPayload = parseJsonCandidate(stdout);
    const stderrPayload = parseJsonCandidate(stderr);
    const isCliWrapper =
      stdoutPayload &&
      typeof stdoutPayload === "object" &&
      !Array.isArray(stdoutPayload) &&
      ("response" in stdoutPayload || "error" in stdoutPayload);
    const responseText =
      isCliWrapper && typeof stdoutPayload.response === "string"
        ? stdoutPayload.response
        : null;
    const cliErrorMessage =
      isCliWrapper &&
      stdoutPayload.error &&
      typeof stdoutPayload.error.message === "string"
        ? stdoutPayload.error.message
        : stderrPayload &&
            typeof stderrPayload === "object" &&
            !Array.isArray(stderrPayload) &&
            stderrPayload.error &&
            typeof stderrPayload.error.message === "string"
          ? stderrPayload.error.message
          : null;

    const responsePayload = parseJsonCandidate(
      responseText ?? (isCliWrapper ? "" : stdout),
    );
    if (responsePayload) {
      // Write result to temp file just in case
      writeFileSync(
        join(tempDir, outputFile),
        JSON.stringify(responsePayload, null, 2),
      );

      return {
        success: true,
        result: responsePayload,
        stdout,
        stderr,
        error: null,
      };
    }

    const reportDetails = extractReportDetails(stderr);
    const reportMessage = reportDetails?.message || null;
    const reportPath = reportDetails?.path || null;
    const errorText = `${stderr}\n${cliErrorMessage || ""}\n${
      reportMessage || ""
    }`.trim();
    const isRateLimited =
      errorText.includes("rate limit") || errorText.includes("429");
    const isNetworkError = errorText.includes("network error");
    const isApiError =
      errorText.includes("Error when talking to Gemini API") ||
      errorText.includes("API Error");
    const isQuotaExhausted =
      errorText.toLowerCase().includes("exhausted your capacity") ||
      errorText.toLowerCase().includes("quota");

    const isHomePermissionError =
      (errorText.includes("EPERM") ||
        errorText.includes("operation not permitted")) &&
      errorText.includes(".gemini");

    if (isHomePermissionError) {
      return {
        success: false,
        result: null,
        stdout,
        stderr,
        error:
          "Gemini CLI could not write to ~/.gemini. Set agents.gemini_home (or HARNESS_GEMINI_HOME) to a writable path, or run with escalated permissions.",
      };
    }

    if (isQuotaExhausted) {
      const quotaMessage = summarizeText(reportMessage || errorText);
      const reportHint = reportPath
        ? ` Report: ${reportPath}`
        : " Report: unavailable.";
      return {
        success: false,
        rateLimited: true,
        result: null,
        error: `Gemini quota exhausted. ${quotaMessage || "No message."} Nothing to do until quota resets.${reportHint}`,
      };
    }

    if (isRateLimited || isNetworkError || isApiError) {
      const details = summarizeText(errorText);
      return {
        success: false,
        rateLimited: true,
        result: null,
        error: details
          ? `Gemini CLI error: ${details}`
          : "Gemini CLI error with no stderr/stdout details.",
      };
    }

    const detailParts = [];
    const errorSnippet = summarizeText(cliErrorMessage);
    const reportSnippet = summarizeText(reportMessage);
    const stderrSnippet = summarizeText(stderr);
    const stdoutSnippet = summarizeText(stdout);
    if (errorSnippet) detailParts.push(`error: ${errorSnippet}`);
    if (reportSnippet) detailParts.push(`report: ${reportSnippet}`);
    if (stderrSnippet) detailParts.push(`stderr: ${stderrSnippet}`);
    if (stdoutSnippet) detailParts.push(`stdout: ${stdoutSnippet}`);
    if (reportPath) detailParts.push(`report_path: ${reportPath}`);

    const detailText =
      detailParts.length > 0
        ? detailParts.join(" | ")
        : "No stdout/stderr captured.";

    return {
      success: false,
      result: null,
      stdout,
      stderr,
      error: `Gemini CLI response was not valid JSON. ${detailText} Logs: ${tempDir}`,
    };
  },
};

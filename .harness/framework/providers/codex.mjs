/**
 * Codex Provider
 *
 * Invokes OpenAI Codex CLI for agent tasks.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Default configuration for Codex
 */
const DEFAULT_CONFIG = {
  model: null,
  reasoningEffort: null,
  timeout: 300000, // 5 minutes
  sandbox: "workspace-write",
};

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

/**
 * Codex provider implementation
 */
export const codexProvider = {
  name: "codex",

  /**
   * Check if Codex CLI is available
   */
  async isAvailable() {
    try {
      execSync("which codex", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Invoke Codex to run an agent task
   *
   * @param {object} options
   * @param {string} options.prompt - The prompt to send to the agent
   * @param {string} options.sandboxDir - Directory containing staged files
   * @param {string} options.outputFile - Expected output file name (e.g., 'RESULT.json')
   * @param {object} options.config - Provider config overrides
   * @returns {object} { success, result, stdout, stderr, error }
   */
  async invoke({ prompt, sandboxDir, files = {}, outputFile, config = {} }) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const workingDir = sandboxDir || mkdtempSync(join(tmpdir(), "harness-"));

    if (files && typeof files === "object") {
      for (const [filename, content] of Object.entries(files)) {
        if (!content) continue;
        const targetPath = join(workingDir, filename);
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, content);
      }
    }

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    const codexPrompt = `${prompt}

=== FILE OUTPUT REQUIREMENT ===
Write the final JSON response to a file named ${outputFile} in the current working directory.
Then print ONLY the raw JSON to stdout.`;

    const modelArg = cfg.model ? `-m ${cfg.model}` : "";
    const reasoningArg = cfg.reasoningEffort
      ? `-c model_reasoning_effort="${cfg.reasoningEffort}"`
      : "";

    try {
      stdout = execSync(
        `codex exec -s ${cfg.sandbox} ${reasoningArg} ${modelArg} --skip-git-repo-check -C "${workingDir}" -`,
        {
          cwd: workingDir,
          encoding: "utf-8",
          timeout: cfg.timeout,
          stdio: ["pipe", "pipe", "pipe"],
          input: codexPrompt,
        },
      );
    } catch (error) {
      exitCode = error.status || 1;
      stdout = error.stdout || "";
      stderr = error.stderr || "";
    }

    // Save debug output
    writeFileSync(join(workingDir, "PROVIDER_STDOUT.txt"), stdout);
    writeFileSync(join(workingDir, "PROVIDER_STDERR.txt"), stderr);
    writeFileSync(join(workingDir, "PROVIDER_EXIT_CODE.txt"), String(exitCode));

    // Try to read result file
    const resultPath = join(workingDir, outputFile);
    if (existsSync(resultPath)) {
      try {
        const result = JSON.parse(readFileSync(resultPath, "utf-8"));
        return {
          success: true,
          result,
          stdout,
          stderr,
          error: null,
        };
      } catch (parseError) {
        return {
          success: false,
          result: null,
          stdout,
          stderr,
          error: `Failed to parse ${outputFile}: ${parseError.message}`,
        };
      }
    }

    const stdoutResult = parseJsonCandidate(stdout);
    if (stdoutResult) {
      return {
        success: true,
        result: stdoutResult,
        stdout,
        stderr,
        error: null,
      };
    }

    // Check for rate limiting after attempting to extract output
    const isRateLimited =
      stderr.includes("usage_limit_reached") ||
      stderr.includes("429") ||
      stderr.includes("rate limit");
    const isNetworkError =
      stderr.includes("ECONNREFUSED") || stderr.includes("ETIMEDOUT");

    if (isRateLimited || isNetworkError) {
      return {
        success: false,
        rateLimited: true,
        result: null,
        stdout,
        stderr,
        error: "Provider unavailable (rate limit or network)",
      };
    }

    return {
      success: false,
      result: null,
      stdout,
      stderr,
      error: `Agent did not produce ${outputFile}`,
    };
  },
};

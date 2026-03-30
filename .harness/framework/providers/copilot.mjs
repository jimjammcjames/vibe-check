/**
 * GitHub Copilot CLI Provider
 *
 * Invokes GitHub Copilot CLI through `gh copilot` for harness agent tasks.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const DEFAULT_CONFIG = {
  model: null,
  reasoningEffort: null,
  timeout: 300000,
  configDir: null,
  workspaceRoot: null,
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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function resolveConfigDir(configDir, workspaceRoot) {
  if (!configDir) return null;
  if (isAbsolute(configDir)) return configDir;
  if (workspaceRoot) return resolve(workspaceRoot, configDir);
  return resolve(configDir);
}

export const copilotProvider = {
  name: "copilot",

  async isAvailable() {
    try {
      execSync("which gh", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      execSync("gh copilot --help", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  },

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

    const resolvedCopilotHome = resolveConfigDir(
      cfg.configDir,
      cfg.workspaceRoot,
    );
    const resolvedLogDir = resolvedCopilotHome
      ? join(resolvedCopilotHome, "logs")
      : null;
    if (resolvedCopilotHome) {
      mkdirSync(resolvedCopilotHome, { recursive: true });
    }
    if (resolvedLogDir) {
      mkdirSync(resolvedLogDir, { recursive: true });
    }

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    const copilotPrompt = `${prompt}

=== FILE OUTPUT REQUIREMENT ===
Write the final JSON response to a file named ${outputFile} in the current working directory.
Then print ONLY the raw JSON to stdout.`;

    const modelArg = cfg.model ? `--model ${shellQuote(cfg.model)}` : "";
    const reasoningArg = cfg.reasoningEffort
      ? `--reasoning-effort ${shellQuote(cfg.reasoningEffort)}`
      : "";
    const configDirArg = resolvedCopilotHome
      ? `--config-dir ${shellQuote(resolvedCopilotHome)}`
      : "";
    const logDirArg = resolvedLogDir
      ? `--log-dir ${shellQuote(resolvedLogDir)}`
      : "";
    const workingDirArg = `--add-dir ${shellQuote(workingDir)}`;
    const stateDirAccessArg =
      resolvedCopilotHome && resolvedCopilotHome !== workingDir
        ? `--add-dir ${shellQuote(resolvedCopilotHome)}`
        : "";
    const logDirAccessArg =
      resolvedLogDir &&
      resolvedLogDir !== workingDir &&
      resolvedLogDir !== resolvedCopilotHome
        ? `--add-dir ${shellQuote(resolvedLogDir)}`
        : "";

    try {
      stdout = execSync(
        `gh copilot -- --allow-all-tools --no-ask-user --no-custom-instructions --no-color -s ${workingDirArg} ${stateDirAccessArg} ${logDirAccessArg} ${modelArg} ${reasoningArg} ${configDirArg} ${logDirArg} -p ${shellQuote(copilotPrompt)}`,
        {
          cwd: workingDir,
          encoding: "utf-8",
          timeout: cfg.timeout,
          stdio: ["pipe", "pipe", "pipe"],
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            ...(resolvedCopilotHome
              ? { COPILOT_HOME: resolvedCopilotHome }
              : {}),
          },
        },
      );
    } catch (error) {
      exitCode = error.status || 1;
      stdout = error.stdout || "";
      stderr = error.stderr || "";
    }

    writeFileSync(join(workingDir, "PROVIDER_STDOUT.txt"), stdout);
    writeFileSync(join(workingDir, "PROVIDER_STDERR.txt"), stderr);
    writeFileSync(join(workingDir, "PROVIDER_EXIT_CODE.txt"), String(exitCode));

    const resultPath = join(workingDir, outputFile);
    if (existsSync(resultPath)) {
      try {
        const result = JSON.parse(readFileSync(resultPath, "utf-8"));
        return {
          success: true,
          result,
          stdout,
          stderr,
          sandboxDir: workingDir,
          error: null,
        };
      } catch (parseError) {
        return {
          success: false,
          result: null,
          stdout,
          stderr,
          sandboxDir: workingDir,
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
        sandboxDir: workingDir,
        error: null,
      };
    }

    const combinedOutput = `${stdout}\n${stderr}`;
    const isRateLimited =
      combinedOutput.includes("429") ||
      combinedOutput.includes("rate limit") ||
      combinedOutput.includes("quota");
    const isNetworkError =
      combinedOutput.includes("ECONNREFUSED") ||
      combinedOutput.includes("ETIMEDOUT") ||
      combinedOutput.includes("ENOTFOUND");

    if (isRateLimited || isNetworkError) {
      return {
        success: false,
        rateLimited: true,
        result: null,
        stdout,
        stderr,
        sandboxDir: workingDir,
        error: "Provider unavailable (rate limit or network)",
      };
    }

    return {
      success: false,
      result: null,
      stdout,
      stderr,
      sandboxDir: workingDir,
      error: `Agent did not produce ${outputFile}`,
    };
  },
};

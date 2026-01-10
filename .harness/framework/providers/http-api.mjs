/**
 * HTTP API Provider
 *
 * A flexible, configuration-driven provider for "Bring Your Own API" (BYO API).
 * Supports OpenAI-compatible endpoints and custom LLM APIs via direct HTTP requests.
 */

import { existsSync, readFileSync } from "node:fs";

/**
 * Default configuration for HTTP API provider
 */
const DEFAULT_CONFIG = {
  endpoint:
    process.env.HARNESS_API_ENDPOINT || "https://api.openai.com/v1/responses",
  method: "POST",
  model: process.env.HARNESS_API_MODEL || "gpt-4.1-nano",
  timeout: 300000, // 5 minutes
  diffOnly: false, // If true, only read HARNESS_DIFF.txt for context
  apiFormat: "responses", // 'responses' (new) or 'chat' (legacy)
};

/**
 * OpenAI Responses API body template (optimized for caching + structured outputs)
 * @param {string} prompt - The agent-specific instructions
 * @param {object} files - Files for context
 * @param {string} model - Model name
 * @returns {object} Request body
 */
function responsesBodyTemplate(instructions, files, model) {
  const sortedFiles = Object.keys(files || {}).sort();
  let rulesContent = "";
  const otherFiles = {};

  // Move rules to static prefix for caching
  for (const file of sortedFiles) {
    if (file === "HARNESS_RULES.md") {
      rulesContent = files[file];
    } else {
      otherFiles[file] = files[file];
    }
  }

  const contextFiles = buildContext(otherFiles);

  // Structure: System (Static Prefix) -> User (Variable Data)
  const messages = [
    {
      role: "system",
      content: `You are a high-performance code review sub-agent.
=== HARNESS CORE RULES ===
${rulesContent || "Follow standard local development harness rules."}

=== RUBRIC ===
- PASS: All requirements met, documentation is coherent, no gaming detected.
- FAIL: Missing documentation, incoherent logic, or "gaming".

=== INSTRUCTIONS ===
${instructions}`,
    },
    {
      role: "user",
      content: `Review the following changes and context:
${contextFiles}`,
    },
  ];

  // Infer schema from instructions or use a generic one if not found
  let schema = {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["pass", "fail"] },
      reasoning: { type: "string" },
      gaming_detected: { type: "boolean" },
    },
    required: ["verdict", "reasoning", "gaming_detected"],
    additionalProperties: false,
  };

  // Special case for undocumented detector schema
  if (instructions.includes("change_clusters_found")) {
    schema = {
      type: "object",
      properties: {
        change_clusters_found: { type: "array", items: { type: "string" } },
        documented_clusters: { type: "array", items: { type: "string" } },
        undocumented_clusters: { type: "array", items: { type: "string" } },
        all_documented: { type: "boolean" },
      },
      required: [
        "change_clusters_found",
        "documented_clusters",
        "undocumented_clusters",
        "all_documented",
      ],
      additionalProperties: false,
    };
  }
  // Match agent-code-review snake_case schema exactly
  if (instructions.includes("change_type")) {
    schema = {
      type: "object",
      properties: {
        change_type: { type: "string", enum: ["fix", "feature", "unknown"] },
        systemic_gap_present: { type: "boolean" },
        systemic_gap_quality: {
          type: "string",
          enum: ["deep", "shallow", "missing"],
        },
        gap_closure_file: { type: "string" },
        gap_closure_in_diff: { type: "boolean" },
        quality_score: { type: "number" },
        quality_breakdown: { type: "string" },
        entry_type_mismatch: { type: "boolean" },
        missing_tests_for_fix: { type: "boolean" },
        gaming_detected: { type: "boolean" },
        critical_issues: { type: "string" },
        violations: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
        compliant: { type: "boolean" },
      },
      required: [
        "change_type",
        "systemic_gap_present",
        "systemic_gap_quality",
        "gap_closure_file",
        "gap_closure_in_diff",
        "quality_score",
        "quality_breakdown",
        "entry_type_mismatch",
        "missing_tests_for_fix",
        "gaming_detected",
        "critical_issues",
        "violations",
        "summary",
        "compliant",
      ],
      additionalProperties: false,
    };
  }

  return {
    model,
    input: messages,
    text: {
      format: {
        type: "json_schema",
        name: "harness_result",
        strict: true,
        schema: schema,
      },
    },
    store: false,
  };
}

/**
 * OpenAI Chat Completions API body template (legacy fallback)
 */
function chatBodyTemplate(instructions, files, model) {
  const contextFiles = buildContext(files);
  return {
    model,
    messages: [
      {
        role: "system",
        content: instructions,
      },
      {
        role: "user",
        content: contextFiles,
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  };
}

/**
 * Build context from in-memory files
 */
function buildContext(files) {
  let contextFiles = "";
  if (!files) return contextFiles;

  // Sort files to maintain stable cache prefix if possible
  const sortedFiles = Object.keys(files).sort();

  for (const filename of sortedFiles) {
    const content = files[filename];
    contextFiles += `\n\n=== ${filename} ===\n${content}`;
  }
  return contextFiles;
}

/**
 * HTTP API provider implementation
 */
export const httpApiProvider = {
  name: "http",

  async isAvailable() {
    return typeof fetch === "function";
  },

  async invoke({ prompt: instructions, files, config = {} }) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    let apiKey = process.env.HARNESS_API_KEY;
    if (!apiKey && !cfg.headers) {
      try {
        if (existsSync("key.txt")) {
          apiKey = readFileSync("key.txt", "utf-8").trim();
        }
      } catch {
        // Ignore key.txt read errors; environment variable may provide the key.
      }
    }

    if (!apiKey && !cfg.headers) {
      return {
        success: false,
        result: null,
        stdout: "",
        stderr: "HARNESS_API_KEY environment variable is not set",
        error: "Missing API key",
      };
    }

    // Build request body - prioritize Responses API with Structured Outputs
    const bodyTemplate =
      cfg.apiFormat === "responses" ? responsesBodyTemplate : chatBodyTemplate;
    const body = bodyTemplate(instructions, files, cfg.model);

    const headers = cfg.headers || {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      const response = await fetch(cfg.endpoint, {
        method: cfg.method,
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      stdout = await response.text();

      if (!response.ok) {
        exitCode = 1;
        stderr = `HTTP ${response.status}: ${response.statusText}\n${stdout}`;
      }
    } catch (error) {
      exitCode = 1;
      stderr = error.message || "Unknown error";
      if (error.name === "AbortError") {
        stderr = "Request timeout";
      }
    }

    const isRateLimited =
      stderr.includes("rate limit") || stderr.includes("429");
    const isNetworkError =
      exitCode !== 0 ||
      stderr.includes("ECONNREFUSED") ||
      stderr.includes("timeout");

    if (isRateLimited || isNetworkError) {
      return {
        success: false,
        rateLimited: isRateLimited,
        result: null,
        stdout,
        stderr,
        error: stderr || "Network/API Error",
      };
    }

    try {
      const apiResponse = JSON.parse(stdout);
      let content = null;

      // Responses API format: output[].content[].text
      if (apiResponse.output && Array.isArray(apiResponse.output)) {
        for (const item of apiResponse.output) {
          if (item.content && Array.isArray(item.content)) {
            for (const contentItem of item.content) {
              if (contentItem.type === "output_text" && contentItem.text) {
                content = contentItem.text;
                break;
              }
            }
          }
        }
      }
      // Chat Completions API format
      else if (
        apiResponse.choices &&
        apiResponse.choices[0]?.message?.content
      ) {
        content = apiResponse.choices[0].message.content;
      }

      if (content) {
        const result =
          typeof content === "string" ? JSON.parse(content) : content;
        return {
          success: true,
          result,
          stdout,
          stderr,
          error: null,
        };
      }
    } catch (parseError) {
      stderr = `JSON Parse Error: ${parseError.message}\nRaw output: ${stdout.slice(0, 500)}`;
    }

    return {
      success: false,
      result: null,
      stdout,
      stderr,
      error: `Failed to extract valid result: ${stderr}`,
    };
  },
};

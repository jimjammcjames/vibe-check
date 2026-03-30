import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeConfig(baseValue, overrideValue) {
  if (overrideValue === undefined) {
    return baseValue;
  }

  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return Array.isArray(overrideValue) ? [...overrideValue] : overrideValue;
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    const merged = { ...baseValue };
    for (const [key, value] of Object.entries(overrideValue)) {
      merged[key] = deepMergeConfig(baseValue[key], value);
    }
    return merged;
  }

  return overrideValue;
}

function normalizeHarnessConfigShape(config = {}) {
  return {
    agents: {},
    reviewers: {},
    stages: {},
    globs: {},
    ...config,
  };
}

function normalizeLocalAgentOverrides(agents = {}) {
  if (!isPlainObject(agents)) {
    return {};
  }

  const allowedAgentKeys = [
    "provider",
    "fallback_provider",
    "gemini_home",
    "gemini_model",
    "codex_model",
    "codex_reasoning",
    "copilot_model",
    "copilot_reasoning",
    "copilot_config_dir",
    "gemini_home_seed",
    "parallel_agent_reviews",
  ];

  const normalized = {};
  for (const key of allowedAgentKeys) {
    if (agents[key] !== undefined) {
      normalized[key] = agents[key];
    }
  }
  return normalized;
}

function normalizeLocalOverrideConfig(config = {}) {
  return normalizeHarnessConfigShape({
    agents: normalizeLocalAgentOverrides(config.agents),
  });
}

export function parseHarnessConfigYaml(content) {
  if (!content.trim()) {
    return normalizeHarnessConfigShape();
  }

  const parsed = YAML.parse(content) || {};
  return normalizeHarnessConfigShape(parsed);
}

export function loadHarnessConfig({
  harnessRoot,
  requireBaseConfig = true,
  localOverrideFilename = "config.local.yml",
} = {}) {
  if (!harnessRoot) {
    throw new Error("loadHarnessConfig requires harnessRoot");
  }

  const configPath = join(harnessRoot, "config.yml");
  const localOverridePath = join(harnessRoot, localOverrideFilename);

  if (!existsSync(configPath)) {
    if (requireBaseConfig) {
      throw new Error(`Config not found: ${configPath}`);
    }
    return normalizeHarnessConfigShape();
  }

  const baseConfig = parseHarnessConfigYaml(readFileSync(configPath, "utf-8"));
  if (!existsSync(localOverridePath)) {
    return baseConfig;
  }

  const localConfig = normalizeLocalOverrideConfig(
    parseHarnessConfigYaml(readFileSync(localOverridePath, "utf-8")),
  );
  return deepMergeConfig(baseConfig, localConfig);
}

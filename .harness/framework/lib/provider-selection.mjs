import { getProvider } from "../providers/index.mjs";

export function resolveConfiguredProviderSequence({
  providerOverride,
  envProvider = process.env.HARNESS_PROVIDER,
  config = {},
} = {}) {
  if (providerOverride) {
    return [providerOverride];
  }

  if (envProvider) {
    return [envProvider];
  }

  const primaryProvider = config.agents?.provider || "http";
  const fallbackProvider = config.agents?.fallback_provider;
  return [...new Set([primaryProvider, fallbackProvider].filter(Boolean))];
}

export async function resolveAvailableProviderSequence(options = {}) {
  const configuredProviders = resolveConfiguredProviderSequence(options);
  const availableProviders = [];
  const unavailableProviders = [];

  for (const providerName of configuredProviders) {
    const provider = getProvider(providerName);
    let isAvailable = true;
    if (typeof provider.isAvailable === "function") {
      try {
        isAvailable = await provider.isAvailable();
      } catch {
        isAvailable = false;
      }
    }

    if (isAvailable) {
      availableProviders.push(providerName);
    } else {
      unavailableProviders.push(providerName);
    }
  }

  return {
    configuredProviders,
    availableProviders,
    unavailableProviders,
  };
}

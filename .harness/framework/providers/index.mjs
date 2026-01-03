/**
 * LLM Provider Registry
 * 
 * Central registry for swappable LLM providers.
 * Providers must implement the `invoke()` interface.
 */

import { codexProvider } from './codex.mjs';
import { stubProvider } from './stub.mjs';
import { geminiProvider } from './gemini.mjs';
import { httpApiProvider } from './http-api.mjs';

const providers = {
    codex: codexProvider,
    stub: stubProvider,
    gemini: geminiProvider,
    http: httpApiProvider
};

/**
 * Get a provider by name
 * @param {string} name - Provider name ('codex', 'stub', etc.)
 * @returns {object} Provider instance
 */
export function getProvider(name = 'codex') {
    const provider = providers[name];
    if (!provider) {
        throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
    }
    return provider;
}

/**
 * Register a new provider
 * @param {string} name - Provider name
 * @param {object} provider - Provider instance (must have invoke method)
 */
export function registerProvider(name, provider) {
    if (typeof provider.invoke !== 'function') {
        throw new Error(`Provider ${name} must implement invoke() method`);
    }
    providers[name] = provider;
}

/**
 * List available providers
 * @returns {string[]} Provider names
 */
export function listProviders() {
    return Object.keys(providers);
}

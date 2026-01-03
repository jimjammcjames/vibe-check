/**
 * Agent Runner
 * 
 * Shared execution logic for all harness agents.
 * Handles sandbox creation, file staging, provider invocation, and result parsing.
 */

import { existsSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProvider } from '../providers/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HARNESS_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(HARNESS_ROOT, '..');

// ============================================================================
// Utilities
// ============================================================================

function log(msg) { console.log(msg); }
function logError(msg) { console.error(`\x1b[31m✗ ${msg}\x1b[0m`); }
function logSuccess(msg) { console.log(`\x1b[32m✓ ${msg}\x1b[0m`); }
function logWarning(msg) { console.log(`\x1b[33m⚠ ${msg}\x1b[0m`); }
function logInfo(msg) { console.log(`\x1b[36mℹ ${msg}\x1b[0m`); }

/**
 * Load harness config
 */
function loadConfig() {
    const configPath = join(HARNESS_ROOT, 'config.yml');
    if (!existsSync(configPath)) {
        return { agents: { provider: 'codex' } };
    }

    const content = readFileSync(configPath, 'utf-8');
    // Simple YAML parsing for agents section
    const providerMatch = content.match(/provider:\s*(\w+)/);
    return {
        agents: {
            provider: providerMatch ? providerMatch[1] : 'codex'
        }
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
export async function runAgent({ name, files, prompt, outputFile, providerConfig = {}, providerOverride }) {
    // Create sandbox
    const sandboxBase = join(REPO_ROOT, 'harness-tests', 'simulation', 'temp');
    if (!existsSync(sandboxBase)) {
        mkdirSync(sandboxBase, { recursive: true });
    }
    const sandboxDir = mkdtempSync(join(sandboxBase, `${name}-`));

    // Stage files
    for (const [filename, content] of Object.entries(files)) {
        writeFileSync(join(sandboxDir, filename), content);
    }

    // Save prompt for debugging
    writeFileSync(join(sandboxDir, 'PROMPT.txt'), prompt);

    // Get provider
    const config = loadConfig();
    const providerName = providerOverride || process.env.HARNESS_PROVIDER || config.agents?.provider || 'codex';

    let provider;
    try {
        provider = getProvider(providerName);
    } catch (error) {
        logWarning(`Provider '${providerName}' not found, falling back to codex`);
        provider = getProvider('codex');
    }

    logInfo(`Using provider: ${provider.name}`);

    // Invoke provider
    const result = await provider.invoke({
        prompt,
        sandboxDir,
        outputFile,
        config: providerConfig
    });

    // Handle result
    if (result.rateLimited) {
        logWarning('Provider unavailable (rate limit/network). Proceeding with fallback.');
        return {
            success: false,
            rateLimited: true,
            result: null,
            sandboxDir,
            error: result.error
        };
    }

    if (!result.success) {
        logWarning(`Agent did not produce expected output. Sandbox: ${sandboxDir}`);
        return {
            success: false,
            rateLimited: false,
            result: null,
            sandboxDir,
            error: result.error
        };
    }

    return {
        success: true,
        rateLimited: false,
        result: result.result,
        sandboxDir,
        error: null
    };
}

/**
 * Export utilities for agents that need them
 */
export { log, logError, logSuccess, logWarning, logInfo, REPO_ROOT, HARNESS_ROOT };

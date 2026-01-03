/**
 * Codex Provider
 * 
 * Invokes OpenAI Codex CLI for agent tasks.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Default configuration for Codex
 */
const DEFAULT_CONFIG = {
    model: 'gpt-4.1-nano',
    reasoningEffort: 'low',
    timeout: 300000,  // 5 minutes
    sandbox: 'workspace-write'
};

/**
 * Codex provider implementation
 */
export const codexProvider = {
    name: 'codex',

    /**
     * Check if Codex CLI is available
     */
    async isAvailable() {
        try {
            execSync('which codex', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
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
    async invoke({ prompt, sandboxDir, outputFile, config = {} }) {
        const cfg = { ...DEFAULT_CONFIG, ...config };

        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            stdout = execSync(
                `codex exec -s ${cfg.sandbox} -c model_reasoning_effort="${cfg.reasoningEffort}" -m ${cfg.model} --skip-git-repo-check -C "${sandboxDir}" -`,
                {
                    cwd: sandboxDir,
                    encoding: 'utf-8',
                    timeout: cfg.timeout,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    input: prompt
                }
            );
        } catch (error) {
            exitCode = error.status || 1;
            stdout = error.stdout || '';
            stderr = error.stderr || '';
        }

        // Save debug output
        writeFileSync(join(sandboxDir, 'PROVIDER_STDOUT.txt'), stdout);
        writeFileSync(join(sandboxDir, 'PROVIDER_STDERR.txt'), stderr);
        writeFileSync(join(sandboxDir, 'PROVIDER_EXIT_CODE.txt'), String(exitCode));

        // Check for rate limiting
        const isRateLimited = stderr.includes('usage_limit_reached') ||
            stderr.includes('429') ||
            stderr.includes('rate limit');
        const isNetworkError = stderr.includes('ECONNREFUSED') ||
            stderr.includes('ETIMEDOUT');

        if (isRateLimited || isNetworkError) {
            return {
                success: false,
                rateLimited: true,
                result: null,
                stdout,
                stderr,
                error: 'Provider unavailable (rate limit or network)'
            };
        }

        // Try to read result file
        const resultPath = join(sandboxDir, outputFile);
        if (existsSync(resultPath)) {
            try {
                const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
                return {
                    success: true,
                    result,
                    stdout,
                    stderr,
                    error: null
                };
            } catch (parseError) {
                return {
                    success: false,
                    result: null,
                    stdout,
                    stderr,
                    error: `Failed to parse ${outputFile}: ${parseError.message}`
                };
            }
        }

        return {
            success: false,
            result: null,
            stdout,
            stderr,
            error: `Agent did not produce ${outputFile}`
        };
    }
};

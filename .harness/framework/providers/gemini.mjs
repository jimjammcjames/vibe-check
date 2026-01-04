/**
 * Gemini CLI Provider
 * 
 * Invokes Google Gemini CLI for agent tasks.
 * Unlike Codex, Gemini doesn't have a sandbox/workspace concept,
 * so we include file contents in the prompt and parse JSON response.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Default configuration for Gemini
 */
const DEFAULT_CONFIG = {
    timeout: 300000,  // 5 minutes
    diffOnly: false   // If true, only read HARNESS_DIFF.txt for context
};

/**
 * Gemini provider implementation
 */
export const geminiProvider = {
    name: 'gemini',

    /**
     * Check if Gemini CLI is available
     */
    async isAvailable() {
        try {
            execSync('which gemini', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
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

        // Create a temporary sandbox for debug logs
        const tempDir = execSync('mktemp -d -t harness-gemini-XXXXXX', { encoding: 'utf-8' }).trim();

        // Build the context from in-memory files
        let contextFiles = '';
        if (cfg.diffOnly) {
            // Only include HARNESS_DIFF.txt if present
            if (files['HARNESS_DIFF.txt']) {
                contextFiles += `\n\n=== HARNESS_DIFF.txt ===\n${files['HARNESS_DIFF.txt']}`;
            }
        } else {
            for (const [filename, content] of Object.entries(files)) {
                if (content) {
                    contextFiles += `\n\n=== ${filename} ===\n${content}`;
                }
            }
        }

        // Build the enhanced prompt
        const jsonOutputName = outputFile.replace('.json', '');
        const enhancedPrompt = `${prompt}

=== FILES FOR CONTEXT ===${contextFiles}

=== CRITICAL INSTRUCTION ===
You MUST respond with ONLY valid JSON matching the ${jsonOutputName} schema described above.
Do NOT include any explanation, markdown formatting, or code blocks.
Output ONLY the raw JSON object, nothing else.`;

        // Hardcoded model
        const modelName = 'gemini-3-flash-preview';

        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            stdout = execSync(
                `gemini -m "${modelName}"`,
                {
                    cwd: tempDir, // Run in temp dir
                    encoding: 'utf-8',
                    timeout: cfg.timeout,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    input: enhancedPrompt,
                    maxBuffer: 10 * 1024 * 1024
                }
            );
        } catch (error) {
            exitCode = error.status || 1;
            stdout = error.stdout || '';
            stderr = error.stderr || '';
        }

        // Save debug logs to temp dir
        try {
            writeFileSync(join(tempDir, 'PROVIDER_STDOUT.txt'), stdout);
            writeFileSync(join(tempDir, 'PROVIDER_STDERR.txt'), stderr);
            writeFileSync(join(tempDir, 'PROMPT.txt'), enhancedPrompt); // Save prompt for debugging
        } catch (e) { /* ignore write errors */ }

        // Clean up temp dir log (optional, or print path for debug)
        // console.log(`[Gemini] Debug logs at: ${tempDir}`);

        // Try to parse JSON
        try {
            let jsonStr = stdout.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                // Write result to temp file just in case
                writeFileSync(join(tempDir, outputFile), JSON.stringify(result, null, 2));

                return {
                    success: true,
                    result,
                    stdout,
                    stderr,
                    error: null
                };
            }
        } catch (parseError) { }

        const isRateLimited = stderr.includes('rate limit') || stderr.includes('429');
        const isNetworkError = stderr.includes('network error');

        if (isRateLimited || isNetworkError) {
            return {
                success: false,
                rateLimited: true,
                result: null,
                error: 'Provider unavailable'
            };
        }

        return {
            success: false,
            result: null,
            stdout,
            stderr,
            error: `Could not parse JSON. Logs: ${tempDir}`
        };
    }
};

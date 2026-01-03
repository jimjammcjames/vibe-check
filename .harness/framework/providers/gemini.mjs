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
    timeout: 300000  // 5 minutes
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
    async invoke({ prompt, sandboxDir, outputFile, config = {} }) {
        const cfg = { ...DEFAULT_CONFIG, ...config };

        // Build the context by reading staged files
        let contextFiles = '';
        try {
            const files = execSync(`ls -1 "${sandboxDir}"`, { encoding: 'utf-8' })
                .trim().split('\n').filter(f => f && !f.startsWith('PROVIDER_') && !f.startsWith('PROMPT'));

            for (const file of files) {
                const filePath = join(sandboxDir, file);
                if (existsSync(filePath)) {
                    const content = readFileSync(filePath, 'utf-8');
                    contextFiles += `\n\n=== ${file} ===\n${content}`;
                }
            }
        } catch (e) {
            // No files to read, that's fine
        }

        // Build the enhanced prompt with file contents inline
        // Since Gemini doesn't write files, we need JSON in response
        const jsonOutputName = outputFile.replace('.json', '');
        const enhancedPrompt = `${prompt}

=== FILES FOR CONTEXT ===${contextFiles}

=== CRITICAL INSTRUCTION ===
You MUST respond with ONLY valid JSON matching the ${jsonOutputName} schema described above.
Do NOT include any explanation, markdown formatting, or code blocks.
Output ONLY the raw JSON object, nothing else.`;

        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            // Use gemini CLI with stdin piping to avoid shell escaping issues
            stdout = execSync(
                `gemini`,
                {
                    cwd: sandboxDir,
                    encoding: 'utf-8',
                    timeout: cfg.timeout,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    input: enhancedPrompt,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
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

        // Try to parse JSON from the response FIRST
        // This prevents false positives if the JSON response content contains words like "rate limit"
        try {
            // Try to extract JSON from the response (might be wrapped in markdown code blocks)
            let jsonStr = stdout.trim();

            // Remove markdown code blocks if present
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            // Find JSON object in the response
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);

                // Write the result to the expected output file for consistency
                writeFileSync(join(sandboxDir, outputFile), JSON.stringify(result, null, 2));

                return {
                    success: true,
                    result,
                    stdout,
                    stderr,
                    error: null
                };
            }
        } catch (parseError) {
            // JSON parsing failed, continue to check for errors
        }

        // Only check for rate limiting if we didn't get valid JSON
        // Check stderr (not stdout) to avoid false positives from response content
        const isRateLimited = stderr.includes('rate limit') ||
            stderr.includes('quota') ||
            stderr.includes('429') ||
            stderr.includes('RESOURCE_EXHAUSTED');
        const isNetworkError = stderr.includes('ECONNREFUSED') ||
            stderr.includes('ETIMEDOUT') ||
            stderr.includes('network error');

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

        return {
            success: false,
            result: null,
            stdout,
            stderr,
            error: `Could not parse JSON from response. Response: ${stdout.slice(0, 200)}`
        };
    }
};

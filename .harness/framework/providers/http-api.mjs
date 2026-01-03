/**
 * HTTP API Provider
 * 
 * A flexible, configuration-driven provider for "Bring Your Own API" (BYO API).
 * Supports OpenAI-compatible endpoints and custom LLM APIs via direct HTTP requests.
 */

import { existsSync, readFileSync } from 'node:fs';

/**
 * Default configuration for HTTP API provider
 */
const DEFAULT_CONFIG = {
    endpoint: process.env.HARNESS_API_ENDPOINT || 'https://api.openai.com/v1/responses',
    method: 'POST',
    model: process.env.HARNESS_API_MODEL || 'gpt-5-mini',
    timeout: 300000,  // 5 minutes
    diffOnly: false,  // If true, only read HARNESS_DIFF.txt for context
    apiFormat: 'responses'  // 'responses' (new) or 'chat' (legacy)
};

/**
 * OpenAI Responses API body template (new format)
 * @param {string} prompt - The prompt to send
 * @param {string} model - Model name
 * @returns {object} Request body
 */
function responsesBodyTemplate(prompt, model) {
    return {
        model,
        input: [
            {
                role: 'system',
                content: 'You are a code review assistant. Respond ONLY with valid JSON matching the schema described in the prompt. No markdown, no explanation, just raw JSON.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        text: {
            format: { type: 'text' }
        },
        reasoning: {
            effort: 'medium'
        },
        store: true
    };
}

/**
 * OpenAI Chat Completions API body template (legacy format)
 * @param {string} prompt - The prompt to send
 * @param {string} model - Model name
 * @returns {object} Request body
 */
function chatBodyTemplate(prompt, model) {
    return {
        model,
        messages: [
            {
                role: 'system',
                content: 'You are a code review assistant. Respond ONLY with valid JSON matching the schema described in the prompt. No markdown, no explanation, just raw JSON.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.1,
        max_tokens: 4096
    };
}

/**
 * Default body template - uses Responses API format
 */
function defaultBodyTemplate(prompt, model) {
    return responsesBodyTemplate(prompt, model);
}

/**
 * Build context from in-memory files
 * @param {object} files - Map of filename -> content
 * @returns {string} Concatenated file contents
 */
function buildContext(files) {
    let contextFiles = '';
    if (!files) return contextFiles;

    for (const [filename, content] of Object.entries(files)) {
        // Skip large files or internal files if needed
        contextFiles += `\n\n=== ${filename} ===\n${content}`;
    }
    return contextFiles;
}

/**
 * HTTP API provider implementation
 */
export const httpApiProvider = {
    name: 'http',

    /**
     * Check if HTTP requests are available (fetch exists in Node 18+)
     */
    async isAvailable() {
        return typeof fetch === 'function';
    },

    /**
     * Invoke HTTP API to run an agent task
     * 
     * @param {object} options
     * @param {string} options.prompt - The prompt to send to the agent
     * @param {string} options.sandboxDir - Directory containing staged files
     * @param {string} options.outputFile - Expected output file name (e.g., 'RESULT.json')
     * @param {object} options.config - Provider config overrides
     * @returns {object} { success, result, stdout, stderr, error }
     */
    async invoke({ prompt, files, config = {} }) {
        const cfg = { ...DEFAULT_CONFIG, ...config };

        // Get API key from environment or key.txt fallback
        let apiKey = process.env.HARNESS_API_KEY;
        if (!apiKey && !cfg.headers) {
            // Try to read from key.txt in CWD (repo root)
            try {
                if (existsSync('key.txt')) {
                    apiKey = readFileSync('key.txt', 'utf-8').trim();
                }
            } catch (e) {
                // Ignore errors reading key.txt
            }
        }

        if (!apiKey && !cfg.headers) {
            return {
                success: false,
                result: null,
                stdout: '',
                stderr: 'HARNESS_API_KEY environment variable is not set and key.txt not found',
                error: 'Missing API key'
            };
        }

        // Build context from in-memory files
        const contextFiles = buildContext(files);

        // Build the enhanced prompt
        const enhancedPrompt = `${prompt}

=== FILES FOR CONTEXT ===${contextFiles}

=== CRITICAL INSTRUCTION ===
You MUST respond with ONLY valid JSON.
Do NOT include any explanation, markdown formatting, or code blocks.
Output ONLY the raw JSON object, nothing else.`;

        // Build request body
        const bodyTemplate = cfg.bodyTemplate || defaultBodyTemplate;
        const body = typeof bodyTemplate === 'function'
            ? bodyTemplate(enhancedPrompt, cfg.model)
            : { ...bodyTemplate, prompt: enhancedPrompt };

        // Build headers
        const headers = cfg.headers || {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

            const response = await fetch(cfg.endpoint, {
                method: cfg.method,
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            stdout = await response.text();

            if (!response.ok) {
                exitCode = 1;
                stderr = `HTTP ${response.status}: ${response.statusText}`;
            }
        } catch (error) {
            exitCode = 1;
            stderr = error.message || 'Unknown error';
            if (error.name === 'AbortError') { stderr = 'Request timeout'; }
        }

        const isRateLimited = stderr.includes('rate limit') || stderr.includes('429');
        const isNetworkError = exitCode !== 0 || stderr.includes('ECONNREFUSED') || stderr.includes('timeout');

        if (isRateLimited || isNetworkError) {
            return {
                success: false,
                rateLimited: isRateLimited,
                result: null,
                stdout,
                stderr,
                error: stderr || 'Network/API Error'
            };
        }

        // Try to parse JSON from the response
        try {
            let jsonStr = stdout.trim();

            // Parse OpenAI-style response
            const apiResponse = JSON.parse(jsonStr);

            // Extract content from response - handle both API formats
            let content = jsonStr;

            // Responses API format: output[].content[].text
            if (apiResponse.output && Array.isArray(apiResponse.output)) {
                for (const item of apiResponse.output) {
                    if (item.content && Array.isArray(item.content)) {
                        for (const contentItem of item.content) {
                            if (contentItem.type === 'output_text' && contentItem.text) {
                                content = contentItem.text;
                                break;
                            }
                        }
                    }
                }
            }
            // Chat Completions API format: choices[].message.content
            else if (apiResponse.choices && apiResponse.choices[0]?.message?.content) {
                content = apiResponse.choices[0].message.content;
            } else if (apiResponse.content) {
                content = apiResponse.content;
            }

            // Remove markdown code blocks if present
            if (typeof content === 'string') {
                if (content.startsWith('```json')) {
                    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                } else if (content.startsWith('```')) {
                    content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                // Find JSON object in the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);

                    return {
                        success: true,
                        result,
                        stdout,
                        stderr,
                        error: null
                    };
                }
            }
        } catch (parseError) {
            // JSON parsing failed
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

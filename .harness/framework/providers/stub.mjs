/**
 * Stub Provider
 * 
 * Returns configurable responses for testing without API calls.
 * Useful for CI environments and unit tests.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Default stub responses for different agent types
 */
const DEFAULT_RESPONSES = {
    // Guardian response
    'RESULT.json': {
        verdict: 'pass',
        reasoning: 'Stub provider: auto-approved for testing',
        gaming_detected: false
    },
    // Coherence checker response
    'COHERENCE.json': {
        entries_checked: [],
        issues: [],
        all_coherent: true
    },
    // Undocumented detector response  
    'RESULT.json': {
        change_clusters_found: [],
        documented_clusters: [],
        undocumented_clusters: [],
        all_documented: true
    },
    // Review adapter response
    'COMPLIANCE_REVIEW.json': {
        compliant: true,
        gaming_detected: false,
        quality_score: 8,
        quality_breakdown: 'Stub provider: no quality analysis performed',
        change_type: 'unknown',
        violations: [],
        summary: 'Stub provider: auto-approved for testing'
    }
};

/**
 * Stub provider implementation
 */
export const stubProvider = {
    name: 'stub',

    /**
     * Always available
     */
    async isAvailable() {
        return true;
    },

    /**
     * Return a stubbed response
     * 
     * @param {object} options
     * @param {string} options.prompt - Ignored
     * @param {string} options.sandboxDir - Directory to write stub response
     * @param {string} options.outputFile - Output file name
     * @param {object} options.config - Optional: { response: {...} } to override
     * @returns {object} { success, result, stdout, stderr, error }
     */
    async invoke({ prompt, sandboxDir, outputFile, config = {} }) {
        // Allow custom response via config
        const response = config.response || DEFAULT_RESPONSES[outputFile] || {
            success: true,
            message: 'Stub provider: no specific response configured'
        };

        // Write the response to the sandbox
        const resultPath = join(sandboxDir, outputFile);
        writeFileSync(resultPath, JSON.stringify(response, null, 2));

        // Also write debug info
        writeFileSync(join(sandboxDir, 'PROVIDER_STDOUT.txt'), '[stub] Response written');
        writeFileSync(join(sandboxDir, 'PROVIDER_STDERR.txt'), '');
        writeFileSync(join(sandboxDir, 'PROVIDER_EXIT_CODE.txt'), '0');

        return {
            success: true,
            result: response,
            stdout: '[stub] Response written',
            stderr: '',
            error: null
        };
    }
};

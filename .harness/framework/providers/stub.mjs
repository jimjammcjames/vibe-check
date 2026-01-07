/**
 * Stub Provider
 *
 * Returns configurable responses for testing without API calls.
 * Useful for CI environments and unit tests.
 */

/**
 * Default stub responses for different agent types
 */
const DEFAULT_RESPONSES = {
  // Guardian response - uses GUARDIAN_RESULT.json to avoid conflict
  "GUARDIAN_RESULT.json": {
    verdict: "pass",
    reasoning: "Stub provider: auto-approved for testing",
    gaming_detected: false,
  },
  // Coherence checker response
  "COHERENCE.json": {
    entries_checked: [],
    issues: [],
    all_coherent: true,
  },
  // Undocumented detector response (uses RESULT.json)
  "RESULT.json": {
    change_clusters_found: [],
    documented_clusters: [],
    undocumented_clusters: [],
    all_documented: true,
  },
  // Review adapter response
  "COMPLIANCE_REVIEW.json": {
    compliant: true,
    gaming_detected: false,
    quality_score: 8,
    quality_breakdown: "Stub provider: no quality analysis performed",
    change_type: "unknown",
    violations: [],
    summary: "Stub provider: auto-approved for testing",
  },
};

/**
 * Stub provider implementation
 */
export const stubProvider = {
  name: "stub",

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
  async invoke({ prompt, files, outputFile, config = {} }) {
    // Allow custom response via config
    // Note: files are ignored in stub
    const response = config.response ||
      DEFAULT_RESPONSES[outputFile] || {
        success: true,
        message: "Stub provider: no specific response configured",
      };

    return {
      success: true,
      result: response,
      stdout: "[stub] In-memory response returned",
      stderr: "",
      error: null,
    };
  },
};

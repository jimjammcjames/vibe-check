import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const DEFAULT_DIAGNOSTICS_DIRNAME = join(".harness", "diagnostics", "latest");
const REVIEW_COVERAGE_FILENAME = "review-coverage.json";

export function getDiagnosticsDir(repoRoot) {
  const override = process.env.HARNESS_DIAGNOSTICS_DIR;
  if (!override) {
    return join(repoRoot, DEFAULT_DIAGNOSTICS_DIRNAME);
  }
  return isAbsolute(override) ? override : join(repoRoot, override);
}

export function buildReviewCoverageResult({
  skippedAgentReviews = false,
  configuredProviders = [],
  availableProviders = [],
  unavailableProviders = [],
  allowMissingAgentProvider = process.env
    .HARNESS_ALLOW_MISSING_AGENT_PROVIDER === "1",
} = {}) {
  return {
    skipped_agent_reviews: Boolean(skippedAgentReviews),
    configured_providers: configuredProviders,
    available_providers: availableProviders,
    unavailable_providers: unavailableProviders,
    allow_missing_agent_provider: Boolean(allowMissingAgentProvider),
  };
}

export function writeReviewCoverageDiagnostics(repoRoot, reviewCoverage) {
  const diagnosticsDir = getDiagnosticsDir(repoRoot);
  mkdirSync(diagnosticsDir, { recursive: true });
  const diagnosticsPath = join(diagnosticsDir, REVIEW_COVERAGE_FILENAME);
  writeFileSync(
    diagnosticsPath,
    `${JSON.stringify(reviewCoverage, null, 2)}\n`,
  );
  return diagnosticsPath;
}

export function renderReviewCoverageSummary(reviewCoverage) {
  const configuredProviders =
    reviewCoverage.configured_providers.join(", ") || "none";
  const availableProviders =
    reviewCoverage.available_providers.join(", ") || "none";
  const unavailableProviders =
    reviewCoverage.unavailable_providers.join(", ") || "none";

  if (reviewCoverage.skipped_agent_reviews) {
    return [
      "## Agent Review Coverage",
      "",
      "Provider-backed agent reviews were skipped because no configured providers were runnable on this runner.",
      "",
      `- Configured providers: ${configuredProviders}`,
      `- Available providers: ${availableProviders}`,
      `- Unavailable providers: ${unavailableProviders}`,
      `- Allow missing provider: ${reviewCoverage.allow_missing_agent_provider ? "yes" : "no"}`,
    ].join("\n");
  }

  return [
    "## Agent Review Coverage",
    "",
    "Provider-backed agent reviews remained in the CI stage.",
    "",
    `- Configured providers: ${configuredProviders}`,
    `- Available providers: ${availableProviders}`,
    `- Unavailable providers: ${unavailableProviders}`,
    `- Allow missing provider: ${reviewCoverage.allow_missing_agent_provider ? "yes" : "no"}`,
  ].join("\n");
}

export function appendReviewCoverageSummary(reviewCoverage) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return null;
  appendFileSync(
    summaryPath,
    `\n${renderReviewCoverageSummary(reviewCoverage)}\n`,
  );
  return summaryPath;
}

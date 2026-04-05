import test from "node:test";
import assert from "node:assert";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

const { registerProvider } = await import(
  join(REPO_ROOT, ".harness/framework/providers/index.mjs")
);
const { resolveAvailableProviderSequence, resolveConfiguredProviderSequence } =
  await import(
    join(REPO_ROOT, ".harness/framework/lib/provider-selection.mjs")
  );
const { runAgent } = await import(
  join(REPO_ROOT, ".harness/framework/lib/agent-runner.mjs")
);
const { filterCiStageForProviderAvailability } = await import(
  join(REPO_ROOT, ".harness/framework/cli/harness.mjs")
);
const {
  appendReviewCoverageSummary,
  buildReviewCoverageResult,
  renderReviewCoverageSummary,
  writeReviewCoverageDiagnostics,
} = await import(join(REPO_ROOT, ".harness/framework/cli/harness.mjs"));

function registerTestProvider(name, { available }) {
  registerProvider(name, {
    name,
    async isAvailable() {
      return available;
    },
    async invoke() {
      return {
        success: true,
        result: {
          verdict: "pass",
          reasoning: `${name} invoked`,
          gaming_detected: false,
        },
      };
    },
  });
}

test("provider selection resolves configured providers with fallback dedupe", () => {
  const providers = resolveConfiguredProviderSequence({
    config: {
      agents: {
        provider: "alpha",
        fallback_provider: "alpha",
      },
    },
    envProvider: null,
  });

  assert.deepStrictEqual(providers, ["alpha"]);
});

test("provider selection separates available and unavailable providers", async () => {
  registerTestProvider("test-available-selection", { available: true });
  registerTestProvider("test-unavailable-selection", { available: false });

  const result = await resolveAvailableProviderSequence({
    config: {
      agents: {
        provider: "test-unavailable-selection",
        fallback_provider: "test-available-selection",
      },
    },
    envProvider: null,
  });

  assert.deepStrictEqual(result.configuredProviders, [
    "test-unavailable-selection",
    "test-available-selection",
  ]);
  assert.deepStrictEqual(result.availableProviders, [
    "test-available-selection",
  ]);
  assert.deepStrictEqual(result.unavailableProviders, [
    "test-unavailable-selection",
  ]);
});

test("agent runner reports a clear error when no configured providers are available", async () => {
  registerTestProvider("test-runner-unavailable", { available: false });

  const result = await runAgent({
    name: "provider-selection-test",
    files: {},
    prompt: "noop",
    outputFile: "RESULT.json",
    providerOverride: "test-runner-unavailable",
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.unavailable, true);
  assert.match(result.error, /No configured providers available/);
});

test("CI stage filtering drops agent reviews only when explicitly allowed and no providers are runnable", async () => {
  registerTestProvider("test-ci-unavailable", { available: false });
  const originalFlag = process.env.HARNESS_ALLOW_MISSING_AGENT_PROVIDER;

  process.env.HARNESS_ALLOW_MISSING_AGENT_PROVIDER = "1";
  try {
    const result = await filterCiStageForProviderAvailability(
      [
        { command: "node .harness/framework/scripts/test-lint.mjs" },
        { command: "node .harness/framework/scripts/harness-guardian.mjs" },
      ],
      {
        agents: {
          provider: "test-ci-unavailable",
        },
      },
    );

    assert.strictEqual(result.skippedAgentReviews, true);
    assert.deepStrictEqual(result.stage, [
      { command: "node .harness/framework/scripts/test-lint.mjs" },
    ]);
  } finally {
    if (originalFlag === undefined) {
      delete process.env.HARNESS_ALLOW_MISSING_AGENT_PROVIDER;
    } else {
      process.env.HARNESS_ALLOW_MISSING_AGENT_PROVIDER = originalFlag;
    }
  }
});

test("review coverage diagnostics write the expected JSON shape", async () => {
  const diagnosticsDir = mkdtempSync(join(tmpdir(), "review-coverage-"));
  const originalDiagnosticsDir = process.env.HARNESS_DIAGNOSTICS_DIR;

  process.env.HARNESS_DIAGNOSTICS_DIR = diagnosticsDir;
  try {
    const reviewCoverage = buildReviewCoverageResult({
      skippedAgentReviews: true,
      configuredProviders: ["gemini", "codex"],
      availableProviders: [],
      unavailableProviders: ["gemini", "codex"],
      allowMissingAgentProvider: true,
    });
    const diagnosticsPath = writeReviewCoverageDiagnostics(reviewCoverage);
    const written = JSON.parse(await readFile(diagnosticsPath, "utf-8"));

    assert.deepStrictEqual(written, {
      skipped_agent_reviews: true,
      configured_providers: ["gemini", "codex"],
      available_providers: [],
      unavailable_providers: ["gemini", "codex"],
      allow_missing_agent_provider: true,
    });
  } finally {
    if (originalDiagnosticsDir === undefined) {
      delete process.env.HARNESS_DIAGNOSTICS_DIR;
    } else {
      process.env.HARNESS_DIAGNOSTICS_DIR = originalDiagnosticsDir;
    }
    rmSync(diagnosticsDir, { recursive: true, force: true });
  }
});

test("review coverage summary describes skipped provider-backed reviews", () => {
  const summary = renderReviewCoverageSummary({
    skipped_agent_reviews: true,
    configured_providers: ["gemini", "codex"],
    available_providers: [],
    unavailable_providers: ["gemini", "codex"],
    allow_missing_agent_provider: true,
  });

  assert.match(summary, /Agent Review Coverage/);
  assert.match(summary, /skipped/i);
  assert.match(summary, /gemini, codex/);
});

test("review coverage summary appends to GITHUB_STEP_SUMMARY when configured", async () => {
  const summaryDir = mkdtempSync(join(tmpdir(), "review-coverage-summary-"));
  const summaryPath = join(summaryDir, "summary.md");
  const originalSummaryPath = process.env.GITHUB_STEP_SUMMARY;

  process.env.GITHUB_STEP_SUMMARY = summaryPath;
  try {
    const writtenPath = appendReviewCoverageSummary({
      skipped_agent_reviews: false,
      configured_providers: ["gemini"],
      available_providers: ["gemini"],
      unavailable_providers: [],
      allow_missing_agent_provider: true,
    });
    const summary = await readFile(summaryPath, "utf-8");

    assert.strictEqual(writtenPath, summaryPath);
    assert.match(summary, /Agent Review Coverage/);
    assert.match(summary, /remained in the CI stage/i);
  } finally {
    if (originalSummaryPath === undefined) {
      delete process.env.GITHUB_STEP_SUMMARY;
    } else {
      process.env.GITHUB_STEP_SUMMARY = originalSummaryPath;
    }
    rmSync(summaryDir, { recursive: true, force: true });
  }
});

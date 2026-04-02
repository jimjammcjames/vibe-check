import test from "node:test";
import assert from "node:assert";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

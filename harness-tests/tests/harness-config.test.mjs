import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadHarnessConfig,
  parseHarnessConfigYaml,
} from "../../.harness/framework/lib/harness-config.mjs";

describe("harness-config", () => {
  it("parses empty yaml into the normalized shape", () => {
    assert.deepStrictEqual(parseHarnessConfigYaml(""), {
      agents: {},
      reviewers: {},
      stages: {},
      globs: {},
    });
  });

  it("loads config.local.yml and limits overrides to supported agent keys", () => {
    const root = mkdtempSync(join(tmpdir(), "harness-config-"));
    const harnessRoot = join(root, ".harness");
    mkdirSync(harnessRoot, { recursive: true });

    writeFileSync(
      join(harnessRoot, "config.yml"),
      `agents:
  provider: gemini
  gemini_home: ".harness/.gemini-home"
stages:
  ci:
    - command: "npm test"
`,
    );

    writeFileSync(
      join(harnessRoot, "config.local.yml"),
      `agents:
  provider: codex
  fallback_provider: copilot
  codex_model: gpt-5.4
  unsupported_key: no
reviewers:
  code_reviewer:
    fail_threshold: low
`,
    );

    try {
      const loaded = loadHarnessConfig({ harnessRoot });
      assert.equal(loaded.agents.provider, "codex");
      assert.equal(loaded.agents.fallback_provider, "copilot");
      assert.equal(loaded.agents.codex_model, "gpt-5.4");
      assert.equal(loaded.agents.unsupported_key, undefined);
      assert.equal(loaded.reviewers.code_reviewer, undefined);
      assert.equal(loaded.stages.ci[0].command, "npm test");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("loads a shared git-common-dir override before the worktree override", () => {
    const root = mkdtempSync(join(tmpdir(), "harness-config-shared-"));
    const harnessRoot = join(root, ".harness");
    const sharedHarnessRoot = join(root, ".git", ".harness");
    mkdirSync(harnessRoot, { recursive: true });
    mkdirSync(sharedHarnessRoot, { recursive: true });

    writeFileSync(
      join(harnessRoot, "config.yml"),
      `agents:
  provider: gemini
  codex_model: gpt-4.1-mini
`,
    );

    writeFileSync(
      join(sharedHarnessRoot, "config.local.yml"),
      `agents:
  provider: codex
  codex_model: gpt-5.4
`,
    );

    writeFileSync(
      join(harnessRoot, "config.local.yml"),
      `agents:
  codex_model: gpt-5.4-mini
`,
    );

    try {
      const loaded = loadHarnessConfig({
        harnessRoot,
        execGit: () => ".git",
      });
      assert.equal(loaded.agents.provider, "codex");
      assert.equal(loaded.agents.codex_model, "gpt-5.4-mini");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

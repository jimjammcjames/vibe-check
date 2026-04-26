import test from "node:test";
import assert from "node:assert/strict";

import { getDocumentationScopeFiles } from "../../.harness/framework/scripts/undocumented-detector.mjs";

test("getDocumentationScopeFiles ignores doc-only and exempt-only diffs", () => {
  const config = {
    globs: {
      realCode: ["src/**", ".harness/framework/**"],
      exempt: ["README.md", "docs/**"],
    },
  };

  const scopeFiles = getDocumentationScopeFiles(
    ["README.md", "docs/setup.md"],
    config,
  );

  assert.deepStrictEqual(scopeFiles, []);
});

test("getDocumentationScopeFiles keeps non-exempt real code in scope", () => {
  const config = {
    globs: {
      realCode: ["src/**", ".harness/framework/**"],
      exempt: ["README.md", "docs/**"],
    },
  };

  const scopeFiles = getDocumentationScopeFiles(
    [
      "README.md",
      "src/index.ts",
      ".harness/framework/scripts/policy-audit.mjs",
    ],
    config,
  );

  assert.deepStrictEqual(scopeFiles, [
    "src/index.ts",
    ".harness/framework/scripts/policy-audit.mjs",
  ]);
});

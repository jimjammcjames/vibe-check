import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveBaseRef } from "../../.harness/framework/lib/base-ref.mjs";

describe("base-ref resolver", () => {
  it("prefers the requested reviewer's configured base ref", () => {
    const baseRef = resolveBaseRef({
      config: {
        reviewers: {
          base_tripwire: { base_ref: "upstream/release" },
          code_reviewer: { base_ref: "origin/main" },
        },
      },
      reviewerName: "base_tripwire",
      execGit: () => "origin/trunk",
    });

    assert.equal(baseRef, "upstream/release");
  });

  it("falls back to another configured reviewer base ref", () => {
    const baseRef = resolveBaseRef({
      config: {
        reviewers: {
          code_reviewer: { base_ref: "origin/release" },
        },
      },
      reviewerName: "base_tripwire",
      execGit: () => "origin/trunk",
    });

    assert.equal(baseRef, "origin/release");
  });

  it("falls back to the remote default branch when config is unset", () => {
    const baseRef = resolveBaseRef({
      config: { reviewers: {} },
      reviewerName: "code_reviewer",
      execGit: () => "origin/trunk",
    });

    assert.equal(baseRef, "origin/trunk");
  });

  it("falls back to origin/main when no configured or remote default base ref exists", () => {
    const baseRef = resolveBaseRef({
      config: { reviewers: {} },
      reviewerName: "code_reviewer",
      execGit() {
        throw new Error("no remote HEAD");
      },
    });

    assert.equal(baseRef, "origin/main");
  });
});

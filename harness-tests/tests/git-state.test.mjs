import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDetachedHeadMessage,
  getCurrentBranch,
  isDetachedHead,
  requireNamedBranch,
} from "../../.harness/framework/lib/git-state.mjs";

test("getCurrentBranch returns the checked-out branch name", () => {
  const branch = getCurrentBranch({
    execGit: () => "james/feature-branch",
  });

  assert.equal(branch, "james/feature-branch");
  assert.equal(
    isDetachedHead({ execGit: () => "james/feature-branch" }),
    false,
  );
});

test("requireNamedBranch throws a canonical recovery message on detached HEAD", () => {
  assert.throws(
    () =>
      requireNamedBranch({
        execGit: () => "",
        purpose: "opening or updating a PR",
        recoveryCommand: "git checkout -b my-branch",
      }),
    /git checkout -b my-branch/,
  );

  assert.match(
    buildDetachedHeadMessage({
      purpose: "opening or updating a PR",
      recoveryCommand: "git checkout -b my-branch",
    }),
    /Detached HEAD is fine for exploration/,
  );
});

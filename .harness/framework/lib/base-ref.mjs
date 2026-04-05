import { execSync } from "node:child_process";

function normalizeBaseRef(baseRef) {
  if (typeof baseRef !== "string") return null;
  const trimmed = baseRef.trim();
  return trimmed === "" ? null : trimmed;
}

function defaultExecGit(command, repoRoot) {
  return execSync(command, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export function resolveConfiguredBaseRef(config = {}, reviewerName = null) {
  const reviewers = config.reviewers || {};
  const reviewerNames = reviewerName
    ? [
        reviewerName,
        ...Object.keys(reviewers).filter((name) => name !== reviewerName),
      ]
    : Object.keys(reviewers);

  for (const name of reviewerNames) {
    const configuredBaseRef = normalizeBaseRef(reviewers[name]?.base_ref);
    if (configuredBaseRef) {
      return configuredBaseRef;
    }
  }

  return null;
}

export function resolveRemoteDefaultBaseRef({
  repoRoot,
  remoteName = "origin",
  execGit,
} = {}) {
  const runGit =
    execGit ||
    ((command) => {
      if (!repoRoot) {
        throw new Error("repoRoot is required when execGit is not provided");
      }
      return defaultExecGit(command, repoRoot);
    });

  try {
    return normalizeBaseRef(
      runGit(
        `git symbolic-ref --quiet --short refs/remotes/${remoteName}/HEAD`,
      ),
    );
  } catch {
    return null;
  }
}

export function resolveBaseRef({
  config = {},
  reviewerName = null,
  repoRoot,
  remoteName = "origin",
  execGit,
} = {}) {
  return (
    resolveConfiguredBaseRef(config, reviewerName) ||
    resolveRemoteDefaultBaseRef({ repoRoot, remoteName, execGit }) ||
    `${remoteName}/main`
  );
}

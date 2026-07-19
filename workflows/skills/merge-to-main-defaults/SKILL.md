---
id: merge-to-main-defaults
summary: Treat explicit "merge to main" requests as authorization for the normal validated local-main landing plus remote push unless the user narrows scope.
---

# Merge To Main Defaults

Apply this skill when the user clearly wants changes landed on `main` and does
not explicitly limit the request to local-only behavior.

## Use Cases

- The user says `merge to main`, `land this on main`, or equivalent without narrowing scope.
- A landing needs the default interpretation to include both the local `main` update and the remote push.

## Default Interpretation

When the user says `merge to main`, assume they mean the full normal landing
workflow:

- update local `main` as needed for the landing
- land the requested changes onto local `main`
- push the resulting `main` branch to the remote default branch

Treat `origin/main` as the default remote target unless the repo or user says
otherwise. This default only applies inside the repository's existing review,
validation, and branch-protection rules; it does not authorize bypassing them.

Do not stop just to ask whether the remote push is included. It is included by
default for this phrase.

## Overrides

Do not apply the default remote-push behavior when the user explicitly says any
of the following:

- `local only`
- `don't push`
- `prepare main but stop before push`
- a different target branch or remote

## Execution Rules

- Use non-interactive Git commands only.
- Follow the repo's normal validation, history, review, and protection rules
  before landing.
- Do not force a landing by adding a temporary bypass, weakening a gate, or
  inventing a fake-only escape hatch just to make `main` go green.
- If conflicts, failed validation, branch protection, or missing permissions
  block the merge or push, report the blocker clearly instead of silently
  downgrading to local-only behavior.
- If the checkout contains unrelated user changes, preserve them and work
  around them rather than reverting them.

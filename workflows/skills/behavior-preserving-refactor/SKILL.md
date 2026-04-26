---
id: behavior-preserving-refactor
summary: Preserve the current shipped contract during a refactor so structural cleanup does not silently revive retired behavior or drop the live path.
---

# Behavior-Preserving Refactor

Use this when the task is "improve the structure, but do not change the shipped
behavior."

## Use Cases

- Moving a live workflow into new files, modules, or ownership seams without intending a product change.
- Refactoring a surface that still has legacy, experiment, or rollback-era files nearby.
- Cleaning up architecture after the product already converged on one chosen path.
- Use when the user says or implies:
- "Refactor this, but don't change behavior."
- "Keep the current UX."
- "Make the structure better without losing what shipped."

## Workflow

1. Capture the current live contract before editing.

- Identify the actual mounted or user-facing path, not just the oldest files that look like they own the behavior.
- Search recent history and git for the latest cleanup, rollback, or decision that selected the current behavior.
- Write down the concrete behaviors that must survive: copy, ordering, visibility, empty states, callbacks, and any other user-visible outcomes.

2. Build a keep/remove map.

- Classify nearby files as current owner, helper under the live owner, orphaned legacy path, or experiment/demo-only path.
- Decide which files should survive under the new structure and which should be deleted once the new owner is in place.
- If the live behavior was chosen recently, preserve that chosen contract even if an older implementation looks easier to reuse.

3. Move the contract through the new seam explicitly.

- Recreate the shipped behavior in the new owner instead of assuming matching data flow or prop names will preserve it.
- Do not quietly reintroduce retired variants, chooser UIs, or fallback branches once the product has already converged on one path.
- Keep the preserved contract small and explicit; remove stale variant state that no longer belongs in the shared model.

4. Protect the behavior at the smallest honest seam.

- Add focused regression coverage that proves the preserved contract still holds in the new path.
- Prefer the smallest seam that can really fail for the behavior instead of inflating a giant integration harness by default.
- Replace tests that still validate retired behavior.

5. Clean up dead or misleading paths.

- Delete orphaned components, helpers, or experiment surfaces that the new implementation no longer mounts.
- Keep demo-only or exploratory variants in clearly demo-owned modules instead of shared production files.
- If old files must remain temporarily, leave a clear follow-up or ownership note so future refactors do not grab the wrong surface again.

6. Review the refactor against the live contract, not the old file layout.

- Compare the final mounted path to the last known shipped behavior, not to the pre-refactor file boundaries.
- Use `find-regressions` first if the churn history is unclear.
- Run `review-skill` before handoff once the refactor diff is ready.

## Verification

- Run the focused regression tests that prove the preserved contract.
- Run the narrowest repo checks that cover the changed surface.
- Run `npm run harness:post` after the final diff is ready.
- Confirm the retired or experiment-only path is no longer reachable when that was part of the risk.

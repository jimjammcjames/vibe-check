---
id: refine-code
summary: Clean up recent code changes for clarity and consistency while preserving exact behavior and staying inside the intended diff.
---

# Refine Code

Use this after implementation when the code works but still needs polish.

## Use Cases

- Removing AI slop without changing behavior.
- Tightening a fresh diff before review or handoff.
- Aligning new code with local conventions.

## Workflow

1. Identify the target diff.

```bash
BASE_REF="$(node .harness/framework/scripts/print-base-ref.mjs)"
git diff --name-only "$BASE_REF"...HEAD
git diff "$BASE_REF"...HEAD
```

2. Remove obvious AI slop.

- obvious comments that add no information
- defensive checks that duplicate upstream guarantees
- awkward naming that does not match surrounding code
- type escapes or suppression comments added only to get unstuck

3. Simplify for clarity, not cleverness.

- reduce unnecessary nesting
- inline single-use helpers when locality improves
- remove needless abstractions
- prefer explicit readable code over terse tricks

4. Keep scope tight.

- Focus on code introduced or touched in the current change.
- Avoid drive-by cleanup outside the review surface unless correctness requires it.

5. Verify behavior stayed the same.

```bash
npm test
```

- If the cleanup changes behavior, back it out and try a narrower refinement pass.

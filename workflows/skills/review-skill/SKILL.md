---
id: review-skill
summary: Run a lightweight final-quality pass by codifying learnings, refining recent code, and checking memory coherence when context artifacts changed.
---

# Review Skill

Use this as a lightweight review checkpoint before handoff, PR work, or final landing.

## Use Cases

- Final cleanup after implementation.
- Capturing durable learnings before the session ends.
- Reviewing history coherence when context artifacts changed.

## Workflow

Run these in order:

1. Use `codify-learnings` to capture reusable guidance from the session.
2. Use `refine-code` to remove slop and tighten the recent diff without changing behavior.
3. If the change touched `.harness/context/history/`, use `review-memory-coherence` before handoff.

Do not add extra steps beyond these unless the user explicitly asks.

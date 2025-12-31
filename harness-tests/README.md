# Harness Testing & Simulation

This directory contains the testing infrastructure for the Agent Harness.
It includes:

- **Simulation framework** (`simulation/`): Runs real Codex agents in sandboxes.
- **Unit tests** (`tests/`): Tests for CLI and utility logic.

## Contents

```
harness-dev/
└── tests/           # Self-diagnostic tests for harness functionality
```

## Running Tests

```bash
npm test
```

These tests verify the harness CLI and enforcement logic work correctly. They're useful for:

- Initial setup verification
- After modifying harness code
- Debugging harness issues

## What TO Copy

When porting to another repo, copy only:

- `.harness/` (the whole folder)
- `AGENTS.md`
- Merge the `scripts` from `package.json` (except `test`)
- `.github/workflows/harness.yml`

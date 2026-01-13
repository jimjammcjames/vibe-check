# MCP Manifests

This folder contains MCP (Model Context Protocol) server manifests and the generator tool.

## Quick Start

```bash
# Generate MCP configs for Claude, Cursor, and Codex
node workflows/bin/mcp-gen
```

## `servers.yml` — YAML v1 Schema

The canonical spec file. **Never contains secrets** — only references to environment variable names.

### Schema

```yaml
version: 1
namespace: myrepo # optional; defaults to normalized repo folder name

servers:
  # stdio transport
  - id: fetch
    transport: stdio
    command: uvx
    args: ["mcp-server-fetch"]
    cwd: "." # optional
    require_env: ["FETCH_API_KEY"] # optional; blocks Cursor if missing
    env:
      FETCH_API_KEY: FETCH_API_KEY # server_env -> local_env_name

  # http transport with bearer auth
  - id: figma
    transport: http
    url: "https://mcp.figma.com/mcp"
    auth:
      type: bearer
      token_env: FIGMA_TOKEN
    headers:
      X-Figma-Region: "us-east-1"

  # http transport with oauth
  - id: linear
    transport: http
    url: "https://mcp.linear.app/mcp"
    auth:
      type: oauth
```

### Field Reference

| Field       | Required | Description                                                     |
| ----------- | -------- | --------------------------------------------------------------- |
| `version`   | ✅       | Must be `1`                                                     |
| `namespace` | ❌       | Prefix for server keys; defaults to normalized repo folder name |
| `servers`   | ✅       | Array of server definitions                                     |

#### Server (common)

| Field       | Required | Description                                     |
| ----------- | -------- | ----------------------------------------------- |
| `id`        | ✅       | Unique identifier (used in key: `namespace.id`) |
| `transport` | ✅       | `stdio` or `http`                               |

#### stdio transport

| Field         | Required | Description                                    |
| ------------- | -------- | ---------------------------------------------- |
| `command`     | ✅       | Executable command                             |
| `args`        | ❌       | Array of string arguments                      |
| `cwd`         | ❌       | Working directory                              |
| `env`         | ❌       | Object mapping server env → local env var name |
| `require_env` | ❌       | Array of required env var names                |

#### http transport

| Field            | Required | Description                             |
| ---------------- | -------- | --------------------------------------- |
| `url`            | ✅       | Server URL                              |
| `auth`           | ❌       | Authentication config                   |
| `auth.type`      | ✅\*     | `bearer` or `oauth` (\*if auth present) |
| `auth.token_env` | ✅\*     | Env var name (\*if bearer)              |
| `headers`        | ❌       | Additional headers object               |

## `mcp-gen` — Generator Tool

Generates/merges MCP configs for multiple tools from `servers.yml`.

### Outputs

#### Claude (`.mcp.json`)

- Uses `${ENV}` placeholders — **safe to commit**
- Server keys: `<namespace>.<id>`
- Bearer auth: `Authorization: "Bearer ${TOKEN_ENV}"`

#### Cursor (`.cursor/mcp.json`)

- Uses **resolved literal values** — **must be gitignored**
- Server keys: `<namespace>.<id>`
- Skips servers when required env vars are missing

#### Codex (stdout)

- Prints `codex mcp add` commands
- No files written

### Non-Destructive Merge

The generator only manages keys with the **owned prefix** (`<namespace>.`).

- ✅ Upserts owned entries
- ✅ Deletes owned entries (when env is missing for Cursor)
- ❌ Never touches non-owned entries

This means you can manually add other MCP servers and they won't be overwritten.

### Missing Environment Variables

| Tool   | Behavior                                    |
| ------ | ------------------------------------------- |
| Claude | Writes placeholder; env resolved at runtime |
| Cursor | **Skips** server entry; prints warning      |

Required env detection includes:

- Explicit `require_env` array
- All `env` map values (local env names)
- Bearer `token_env`

### Environment Loading

The generator loads environment variables in order (later wins):

1. `process.env`
2. `.env` (if exists)
3. `.env.local` (if exists)

## File Organization

```
workflows/
├── bin/
│   └── mcp-gen           # CLI entrypoint
└── mcp/
    ├── README.md         # This file
    ├── servers.yml       # Canonical spec
    └── src/
        ├── yaml.mjs      # YAML parser/validator
        ├── namespace.mjs # Namespace utilities
        ├── env.mjs       # Environment loading
        ├── merge.mjs     # Non-destructive merge
        ├── run.mjs       # Orchestrator
        └── builders/
            ├── claude.mjs
            ├── cursor.mjs
            └── codex.mjs
```

## .gitignore Recommendations

```gitignore
# Cursor MCP config (contains secrets)
.cursor/mcp.json

# Test temp files
harness-tests/tests/.tmp/
```

Note: `.mcp.json` (Claude) is safe to commit as it only contains placeholders.

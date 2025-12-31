#!/bin/bash
#
# Harness Simulation Framework
# Runs Codex in an isolated sandbox to test harness behavior
#
# Usage:
#   ./run.sh <task-name>         Run a specific task
#   ./run.sh <task-name> --keep  Keep sandbox after run
#   ./run.sh --list              List available tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"
TASKS_DIR="$SCRIPT_DIR/tasks"
LOGS_DIR="$SCRIPT_DIR/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[simulation]${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# Parse args
TASK_NAME=""
KEEP_SANDBOX=false

for arg in "$@"; do
    case $arg in
        --keep) KEEP_SANDBOX=true ;;
        --list)
            echo "Available tasks:"
            for f in "$TASKS_DIR"/*.md; do
                [ -f "$f" ] && echo "  - $(basename "$f" .md)"
            done
            exit 0
            ;;
        -*) log_error "Unknown option: $arg"; exit 1 ;;
        *) TASK_NAME="$arg" ;;
    esac
done

if [ -z "$TASK_NAME" ]; then
    echo "Usage: $0 <task-name> [--keep]"
    echo "       $0 --list"
    exit 1
fi

TASK_FILE="$TASKS_DIR/$TASK_NAME.md"
if [ ! -f "$TASK_FILE" ]; then
    log_error "Task not found: $TASK_FILE"
    exit 1
fi

# Create log file
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="$LOGS_DIR/simulation-$TASK_NAME-$TIMESTAMP.md"
mkdir -p "$LOGS_DIR"

# Cleanup old logs (unless disabled/parallel run)
if [ "${NO_CLEAN:-false}" != "true" ]; then
    # find . -maxdepth 1 -name "*.md" -delete 2>/dev/null || rm -f "$LOGS_DIR"/*.md
    rm -f "$LOGS_DIR"/*.md 2>/dev/null
    
    # Cleanup old sandbox if tracked
    if [ -f "$LOGS_DIR/.last_sandbox_path" ]; then
        LAST_SANDBOX=$(cat "$LOGS_DIR/.last_sandbox_path")
        if [ -d "$LAST_SANDBOX" ]; then
            # Safety check: ensure it looks like a sandbox
            if [[ "$LAST_SANDBOX" == *"harness-sandbox"* ]]; then
                 # log "Removing previous sandbox: $LAST_SANDBOX"
                 rm -rf "$LAST_SANDBOX"
            fi
        fi
        rm -f "$LOGS_DIR/.last_sandbox_path"
    fi
fi

# Setup sandbox
log "Setting up sandbox..."
source "$LIB_DIR/setup-sandbox.sh"
SANDBOX_DIR=$(setup_sandbox "$REPO_ROOT")
echo "$SANDBOX_DIR" > "$LOGS_DIR/.last_sandbox_path" # Track for next cleanup
log_success "Sandbox created: $SANDBOX_DIR"

# Start logging
{
    echo "# Simulation: $TASK_NAME"
    echo ""
    echo "**Date:** $(date)"
    echo "**Sandbox:** $SANDBOX_DIR"
    echo ""
    echo "## Task Prompt"
    echo ""
    cat "$TASK_FILE"
    echo ""
    echo "---"
    echo ""
    echo "## Codex Output"
    echo ""
    echo '```'
} > "$LOG_FILE"

# Read task prompt
TASK_PROMPT=$(cat "$TASK_FILE")

# Inject Self-Reporting Instruction
TASK_PROMPT="$TASK_PROMPT

## Final Reporting
1. You MUST run \`npm run harness:post\` to verify your work before finishing.
2. Create \`SIMULATION_REPORT.md\` containing:
   - Summary of changes
   - Any harness errors encountered and how you fixed them
   - Confirmation that harness:post passed
"

# Invoke Codex
log "Invoking Codex (o4-mini, workspace-write sandbox)..."
log "Task: $TASK_NAME"
echo ""

cd "$SANDBOX_DIR"

# Run codex and capture output
set +e
codex exec \
    --model gpt-5.2-codex \
    -s workspace-write \
    -c 'model_reasoning_effort="medium"' \
    "$TASK_PROMPT" 2>&1 | tee -a "$LOG_FILE"
CODEX_EXIT=$?
set -e

{
    echo '```'
    echo ""
    echo "---"
    echo ""
    echo "## Harness Results"
    echo ""
} >> "$LOG_FILE"

# Check harness results
log "Checking harness results..."
echo ""

cd "$SANDBOX_DIR"

echo '```' >> "$LOG_FILE"

# Run harness:post to see what it catches
set +e
npm run harness:post 2>&1 | tee -a "$LOG_FILE"
HARNESS_EXIT=${PIPESTATUS[0]}
set -e

echo '```' >> "$LOG_FILE"

# Report
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo ""
    echo "---"
    echo ""
    echo "## Verdict"
    echo ""
} >> "$LOG_FILE"

if [ $HARNESS_EXIT -eq 0 ]; then
    log_success "Harness passed - agent followed all rules"
    echo "**PASS** - Agent followed all harness rules" >> "$LOG_FILE"
else
    log_warn "Harness caught issues (exit code: $HARNESS_EXIT)"
    echo "**CAUGHT** - Harness caught issues (exit code: $HARNESS_EXIT)" >> "$LOG_FILE"
fi

echo ""
echo ""
log "Generating summary..."
node "$LIB_DIR/summarize-log.mjs" "$LOG_FILE" "$SANDBOX_DIR" > "${LOG_FILE/.md/_summary.md}"
cat "${LOG_FILE/.md/_summary.md}"

log "Full log saved to: $LOG_FILE"

# Sandbox persists for inspection (cleaned up on next run)
rm -f "$REPO_ROOT/harness-tests/simulation/latest"
ln -sfn "$SANDBOX_DIR" "$REPO_ROOT/harness-tests/simulation/latest"
log "Sandbox kept for inspection: $SANDBOX_DIR"
log "Quick access linked at: harness-tests/simulation/latest"

echo ""

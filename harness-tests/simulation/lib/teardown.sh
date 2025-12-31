#!/bin/bash
#
# Teardown - Cleanup sandbox
#

teardown() {
    local SANDBOX_DIR="$1"
    
    if [ -d "$SANDBOX_DIR" ]; then
        rm -rf "$SANDBOX_DIR"
    fi
}

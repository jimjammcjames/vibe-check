#!/bin/bash
#
# Setup Sandbox - Creates an isolated temp repo with harness
#

setup_sandbox() {
    local HARNESS_ROOT="$1"
    
    # Create temp directory
    local SANDBOX_DIR=$(mktemp -d -t harness-sandbox-XXXXXX)
    
    # Initialize git repo
    cd "$SANDBOX_DIR"
    # Initialize git repo
    cd "$SANDBOX_DIR"
    git init --quiet
    git config user.email "jane@acme.corp"
    git config user.name "Jane Doe"
    
    # Create basic structure
    mkdir -p src
    
    # Create a minimal starting codebase
    cat > src/index.ts << 'EOF'
// Main entry point
export function main(): void {
    console.log("System initialized");
}

main();
EOF
    
    # Copy harness
    cp -r "$HARNESS_ROOT/.harness" .
    
    # Sanitize context (remove dev history, keep templates)
    # We want the sandbox to start fresh, not with the harness's own memories
    find .harness/context/learned -name "*.md" -not -name "TIMELINE.md" -delete
    find .harness/context/decisions -name "*.md" -not -name "TIMELINE.md" -delete
    
    # Copy package.json (realistic name)
    cat > package.json << 'EOF'
{
  "name": "acme-core",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "echo 'No tests yet'",
    "harness:prep": "node .harness/framework/cli/harness.mjs prep",
    "harness:iterate": "node .harness/framework/cli/harness.mjs iterate",
    "harness:post": "node .harness/framework/cli/harness.mjs post"
  }
}
EOF
    
    # Create tsconfig
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
EOF
    
    # Create eslint.config.js (minimal, no deps needed)
    cat > eslint.config.js << 'EOF'
export default [];
EOF

    # Create .gitignore
    cat > .gitignore << 'EOF'
node_modules/
dist/
EOF

    # Simplify the harness config for sandbox (skip eslint/tsc since no deps)
    cat > .harness/config.yml << 'EOF'
# Harness Configuration (Sandbox - Simplified)

reviewers:
  base_tripwire:
    enabled: true
    base_ref: "origin/main"
    require_fail_on_base: true
    allow_weak_pass: true
    exempt_tag: "#basefail-exempt"
    run_tests_cmd: "npm test"
  
  code_reviewer:
    enabled: false

stages:
  iterate:
    - command: "echo 'iterate: no-op in sandbox'"

  post:
    - command: "npm test"
    - command: "node .harness/framework/scripts/policy-audit.mjs"

  ci:
    - command: "npm test"
    - command: "node .harness/framework/scripts/policy-audit.mjs"

globs:
  realCode:
    - "src/**/*.ts"
    - "src/**/*.tsx"
    - "src/**/*.js"
    - "src/**/*.jsx"

  exempt:
    - "*.config.*"
    - "*.json"
    - ".harness/**"
    - "*.md"
    - ".gitignore"

  tests:
    - "**/*.test.ts"
    - "**/*.test.tsx"
    - "**/*.test.js"
    - "**/*.spec.ts"
    - "**/__tests__/**"

  learned: ".harness/context/learned/**/*.md"
  decisions: ".harness/context/decisions/**/*.md"

  testSide:
    - "**/*.test.ts"
    - "**/*.test.js"
    - "**/__tests__/**"
    - "**/__mocks__/**"
EOF
    
    # Initial commit
    git add -A
    git commit -m "Initial commit" --quiet
    
    # Create 'main' branch for tripwire to compare against
    git branch -M main
    
    # Install pre-commit hook
    mkdir -p .git/hooks
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npm run harness:post
EOF
    chmod +x .git/hooks/pre-commit
    
    # Return sandbox path
    echo "$SANDBOX_DIR"
}

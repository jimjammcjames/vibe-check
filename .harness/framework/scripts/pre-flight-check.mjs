#!/usr/bin/env node

/**
 * Pre-flight check for harness infrastructure
 * 
 * This script validates that critical infrastructure components are working
 * BEFORE they're needed in a commit. Run this periodically or in CI.
 * 
 * Checks:
 * 1. Codex is available and authenticated
 * 2. Configured model is supported
 * 3. Review adapter can execute
 * 4. Debug file structure is correct
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SUPPORTED_MODELS = [
    'gpt-5.2-codex',
    'gpt-5.1-codex-max',
    'gpt-5.1-codex-mini',
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5-codex',
    'gpt-5-codex-mini',
    'gpt-5'
];

console.log('🔍 Harness Pre-Flight Check\n');

let exitCode = 0;

// Check 1: Codex is installed
try {
    console.log('✓ Check 1: Codex installation');
    const version = execSync('codex --version', { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`  Found: ${version.trim()}`);
} catch (error) {
    console.error('✗ Check 1 FAILED: Codex not installed or not in PATH');
    console.error('  Install: https://codex.openai.com');
    exitCode = 1;
}

// Check 2: Codex authentication
try {
    console.log('\n✓ Check 2: Codex authentication');
    // Try a minimal codex exec to verify auth
    execSync('codex exec "echo test"', {
        encoding: 'utf-8',
        timeout: 10000,
        stdio: 'pipe'
    });
    console.log('  Authenticated successfully');
} catch (error) {
    console.error('✗ Check 2 FAILED: Codex authentication issue');
    console.error('  Run: codex login');
    exitCode = 1;
}

// Check 3: Model compatibility
try {
    console.log('\n✓ Check 3: Model compatibility');

    // Extract model from review-adapter.mjs
    const adapterContent = readFileSync('.harness/framework/scripts/review-adapter.mjs', 'utf-8');
    const modelMatch = adapterContent.match(/const model = isFastMode \? '([^']+)'/);

    if (modelMatch) {
        const fastModeModel = modelMatch[1];
        console.log(`  Fast mode model: ${fastModeModel}`);

        if (!SUPPORTED_MODELS.includes(fastModeModel)) {
            console.warn(`  ⚠️  WARNING: ${fastModeModel} may not be supported`);
            console.warn(`  Recommended: ${SUPPORTED_MODELS.slice(0, 3).join(', ')}`);
        } else {
            console.log(`  ✓ Model is in supported list`);
        }

        // Try to actually invoke the model
        try {
            const testDir = join(tmpdir(), `pre-flight-${Date.now()}`);
            mkdirSync(testDir, { recursive: true });

            const testOutput = execSync(
                `codex exec -m ${fastModeModel} -s workspace-write -c model_reasoning_effort="low" --skip-git-repo-check -C "${testDir}" "echo test"`,
                {
                    encoding: 'utf-8',
                    timeout: 30000,
                    stdio: 'pipe'
                }
            );

            console.log(`  ✓ Model ${fastModeModel} invoked successfully`);
        } catch (modelError) {
            console.error(`  ✗ FAILED: Cannot invoke model ${fastModeModel}`);
            if (modelError.stderr) {
                console.error(`  Error: ${modelError.stderr.slice(0, 200)}`);
            }
            exitCode = 1;
        }
    } else {
        console.log('  Using default model (no override)');
    }
} catch (error) {
    console.error('✗ Check 3 FAILED: Could not verify model compatibility');
    console.error(`  ${error.message}`);
    exitCode = 1;
}

// Check 4: Review adapter syntax
try {
    console.log('\n✓ Check 4: Review adapter syntax');
    execSync('node --check .harness/framework/scripts/review-adapter.mjs', {
        encoding: 'utf-8',
        stdio: 'pipe'
    });
    console.log('  No syntax errors detected');
} catch (error) {
    console.error('✗ Check 4 FAILED: Review adapter has syntax errors');
    console.error(`  ${error.message}`);
    exitCode = 1;
}

// Check 5: Debug infrastructure
try {
    console.log('\n✓ Check 5: Debug infrastructure');
    const adapterContent = readFileSync('.harness/framework/scripts/review-adapter.mjs', 'utf-8');

    const requiredDebugFiles = ['CODEX_STDOUT.txt', 'CODEX_STDERR.txt', 'CODEX_EXIT_CODE.txt'];
    const missingFiles = requiredDebugFiles.filter(file => !adapterContent.includes(file));

    if (missingFiles.length > 0) {
        console.error(`  ✗ Missing debug files: ${missingFiles.join(', ')}`);
        exitCode = 1;
    } else {
        console.log('  All required debug files are saved to sandbox');
    }

    if (!adapterContent.includes('logError')) {
        console.warn('  ⚠️  WARNING: No logError usage found (stderr may not be visible)');
    } else {
        console.log('  ✓ Using logError for prominent error display');
    }
} catch (error) {
    console.error('✗ Check 5 FAILED: Could not verify debug infrastructure');
    console.error(`  ${error.message}`);
    exitCode = 1;
}

// Check 6: Sandbox directory
try {
    console.log('\n✓ Check 6: Sandbox directory');
    const sandboxDir = 'harness-tests/simulation/temp';
    if (!existsSync(sandboxDir)) {
        mkdirSync(sandboxDir, { recursive: true });
        console.log(`  Created ${sandboxDir}`);
    } else {
        console.log(`  ${sandboxDir} exists`);
    }
} catch (error) {
    console.error('✗ Check 6 FAILED: Could not verify sandbox directory');
    console.error(`  ${error.message}`);
    exitCode = 1;
}

// Summary
console.log('\n' + '='.repeat(50));
if (exitCode === 0) {
    console.log('✅ All pre-flight checks passed');
    console.log('Harness infrastructure is ready to use');
} else {
    console.log('❌ Some pre-flight checks failed');
    console.log('Fix the issues above before relying on harness automation');
}

process.exit(exitCode);

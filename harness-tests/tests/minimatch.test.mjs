/**
 * Tests for minimatch.mjs glob matching utility
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { minimatch } from '../../.harness/framework/scripts/minimatch.mjs';

describe('minimatch', () => {
    describe('basic patterns', () => {
        it('matches exact filenames', () => {
            assert.strictEqual(minimatch('foo.js', 'foo.js'), true);
            assert.strictEqual(minimatch('foo.js', 'bar.js'), false);
        });

        it('matches single asterisk for any characters except /', () => {
            assert.strictEqual(minimatch('foo.js', '*.js'), true);
            assert.strictEqual(minimatch('bar.ts', '*.js'), false);
            assert.strictEqual(minimatch('src/foo.js', '*.js'), false); // * doesn't match /
        });

        it('matches double asterisk for any path depth', () => {
            assert.strictEqual(minimatch('src/foo.js', '**/*.js'), true);
            assert.strictEqual(minimatch('src/deep/nested/foo.js', '**/*.js'), true);
            assert.strictEqual(minimatch('foo.js', '**/*.js'), true);
        });

        it('matches question mark for single character', () => {
            assert.strictEqual(minimatch('foo.js', 'fo?.js'), true);
            assert.strictEqual(minimatch('food.js', 'fo?.js'), false);
        });
    });

    describe('directory patterns', () => {
        it('matches src/**/*.ts pattern', () => {
            assert.strictEqual(minimatch('src/index.ts', 'src/**/*.ts'), true);
            assert.strictEqual(minimatch('src/utils/helpers.ts', 'src/**/*.ts'), true);
            assert.strictEqual(minimatch('lib/index.ts', 'src/**/*.ts'), false);
        });

        it('matches .harness/** pattern', () => {
            assert.strictEqual(minimatch('.harness/Harness.md', '.harness/**'), true);
            assert.strictEqual(minimatch('.harness/context/learned/foo.md', '.harness/**'), true);
            assert.strictEqual(minimatch('src/harness.ts', '.harness/**'), false);
        });

        it('matches context paths', () => {
            const learnedPattern = '.harness/context/learned/**/*.md';
            assert.strictEqual(minimatch('.harness/context/learned/2025-01-01-bug.md', learnedPattern), true);
            assert.strictEqual(minimatch('.harness/context/decisions/2025-01-01-arch.md', learnedPattern), false);
        });
    });

    describe('file extension patterns', () => {
        it('matches *.config.* pattern', () => {
            assert.strictEqual(minimatch('eslint.config.js', '*.config.*'), true);
            assert.strictEqual(minimatch('prettier.config.mjs', '*.config.*'), true);
            assert.strictEqual(minimatch('config.js', '*.config.*'), false);
        });

        it('matches test file patterns', () => {
            assert.strictEqual(minimatch('foo.test.ts', '**/*.test.ts'), true);
            assert.strictEqual(minimatch('src/utils/foo.test.ts', '**/*.test.ts'), true);
            assert.strictEqual(minimatch('foo.spec.ts', '**/*.test.ts'), false);
        });

        it('matches __tests__ directory pattern', () => {
            assert.strictEqual(minimatch('src/__tests__/foo.ts', '**/__tests__/**'), true);
            assert.strictEqual(minimatch('__tests__/bar.js', '**/__tests__/**'), true);
        });
    });

    describe('negation patterns', () => {
        it('negates matches with ! prefix', () => {
            assert.strictEqual(minimatch('foo.js', '!foo.js'), false);
            assert.strictEqual(minimatch('bar.js', '!foo.js'), true);
        });
    });

    describe('special characters', () => {
        it('handles dots in patterns', () => {
            assert.strictEqual(minimatch('.gitignore', '.gitignore'), true);
            assert.strictEqual(minimatch('.eslintrc', '.eslintrc*'), true);
        });

        it('handles parentheses and brackets', () => {
            // These should be escaped properly
            assert.strictEqual(minimatch('file(1).js', 'file(1).js'), true);
        });
    });
});

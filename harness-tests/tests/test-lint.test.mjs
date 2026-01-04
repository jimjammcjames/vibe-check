/**
 * Tests for test-lint.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeTestContent } from '../../.harness/framework/scripts/test-lint.mjs';

describe('test-lint', () => {
    it('flags no-op assertions', () => {
        const noOp = 'assert.' + 'ok(true)';
        const content = `import assert from 'node:assert';
${noOp};`;
        const issues = analyzeTestContent(content);
        assert.ok(issues.some(i => i.code === 'NO_OP_ASSERT'));
    });

    it('flags un-gated network usage', () => {
        const content = `fet` + `ch('https://example.com');`;
        const issues = analyzeTestContent(content);
        assert.ok(issues.some(i => i.code === 'NETWORK_UNGATED'));
    });

    it('allows network usage when gated', () => {
        const content = `if (!process.env.HARNESS_ALLOW_NETWORK_TESTS) return;
fetch('https://example.com');`;
        const issues = analyzeTestContent(content);
        assert.ok(!issues.some(i => i.code === 'NETWORK_UNGATED'));
    });

    it('flags key.txt usage', () => {
        const keyName = 'key' + '.txt';
        const readFn = 'read' + 'FileSync';
        const content = `const keyPath = '${keyName}';\n${readFn}(keyPath, 'utf-8');`;
        const issues = analyzeTestContent(content);
        assert.ok(issues.some(i => i.code === 'KEY_FILE_USAGE'));
    });

    it('flags source inspection via readFileSync', () => {
        const readFn = 'read' + 'FileSync';
        const pathPrefix = '.harness/' + 'framework/scripts/foo.mjs';
        const content = `import { ${readFn} } from 'node:fs';
const content = ${readFn}('${pathPrefix}', 'utf-8');`;
        const issues = analyzeTestContent(content);
        assert.ok(issues.some(i => i.code === 'SOURCE_INSPECTION'));
    });

    it('passes on normal assertions', () => {
        const content = `import assert from 'node:assert';
assert.strictEqual(1 + 1, 2);`;
        const issues = analyzeTestContent(content);
        assert.strictEqual(issues.length, 0);
    });
});

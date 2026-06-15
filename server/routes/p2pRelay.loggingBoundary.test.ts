import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('p2pRelay logging boundary', () => {
	it('does not log relay ticket credentials from websocket upgrades', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'p2pRelay.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*ticket/i);
		expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*token/i);
		expect(source).not.toMatch(/console\.(?:log|warn|error)\([^)]*sec-websocket-protocol/i);
	});
});

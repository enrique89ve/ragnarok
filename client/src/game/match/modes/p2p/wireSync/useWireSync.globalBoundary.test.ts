import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('useWireSync global dependency boundary', () => {
	it('does not reach the combat store through globalThis', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'useWireSync.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).not.toContain('__ragnarokCombatStore');
		expect(source).not.toContain('globalThis.__ragnarokCombatStore');
	});
});

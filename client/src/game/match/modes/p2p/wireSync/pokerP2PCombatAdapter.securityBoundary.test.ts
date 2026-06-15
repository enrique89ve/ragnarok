import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('pokerP2PCombatAdapter security boundary', () => {
	it('uses the explicit poker adapter seam instead of global combat-store access', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'pokerP2PCombatAdapter.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).toContain('getPokerCombatAdapterState');
		expect(source).not.toContain('globalThis');
		expect(source).not.toContain('__ragnarokCombatStore');
	});
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('socialRoutes P2P ticket boundary', () => {
	it('does not return the target peer relay ticket to the challenge sender', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'socialRoutes.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).toContain('matchTicket: senderMatchTicket');
		expect(source).toContain('senderVisibleChallenge');
		expect(source).not.toMatch(/opponentMatchChallenge:\s*targetChallenge/);
		expect(source).not.toMatch(/opponentMatchChallenge:\s*\{\s*\.\.\.targetChallenge/s);
		expect(source).not.toMatch(/opponentMatchChallenge:[\s\S]{0,300}matchTicket:\s*targetMatchTicket/);
	});
});

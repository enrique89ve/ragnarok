import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('wsTransport logging boundary', () => {
	it('does not log relay ticket credentials or websocket protocol headers', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'wsTransport.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).not.toMatch(/debug\.(?:log|warn|error)\([^)]*matchTicket/i);
		expect(source).not.toMatch(/debug\.(?:log|warn|error)\([^)]*protocols?/i);
		expect(source).not.toMatch(/debug\.(?:log|warn|error)\([^)]*P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX/i);
	});
});

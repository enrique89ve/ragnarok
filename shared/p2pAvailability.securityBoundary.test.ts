import { describe, expect, it } from 'vitest';

import {
	MAX_P2P_MATCH_TICKET_TOKEN_LENGTH,
	P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX,
	readP2PMatchTicket,
} from './p2pAvailability';

describe('P2PMatchTicket security boundary', () => {
	it('accepts only websocket-subprotocol-safe ticket tokens', () => {
		const token = 'payload_-123.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

		expect(readP2PMatchTicket({
			token,
			roomId: 'room-1',
			peerId: 'peer-1',
			expiresAt: Date.now() + 60_000,
		})).toEqual({
			token,
			roomId: 'room-1',
			peerId: 'peer-1',
			expiresAt: expect.any(Number),
		});

		expect(`${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}${token}`).toMatch(/^[A-Za-z0-9._-]+$/);
	});

	it('rejects malformed, header-hostile, and oversized ticket tokens', () => {
		const baseTicket = {
			roomId: 'room-1',
			peerId: 'peer-1',
			expiresAt: Date.now() + 60_000,
		};

		expect(readP2PMatchTicket({
			...baseTicket,
			token: 'payload.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg',
		})).toBeNull();
		expect(readP2PMatchTicket({
			...baseTicket,
			token: 'payload\nheader.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
		})).toBeNull();
		expect(readP2PMatchTicket({
			...baseTicket,
			token: `${'a'.repeat(MAX_P2P_MATCH_TICKET_TOKEN_LENGTH + 1)}.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`,
		})).toBeNull();
	});
});

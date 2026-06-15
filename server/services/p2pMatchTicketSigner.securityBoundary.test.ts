import { describe, expect, it } from 'vitest';

import { buildP2PMatchTicket, verifyP2PMatchTicketForRoom } from './p2pMatchTicketSigner';

describe('p2pMatchTicketSigner security boundary', () => {
	it('binds relay tickets to exactly one websocket room and peer', () => {
		const ticket = buildP2PMatchTicket({
			roomId: 'room-alpha',
			peerId: 'peer-a',
			account: 'alice',
			now: 1_000,
		});

		expect(verifyP2PMatchTicketForRoom({
			token: ticket.token,
			roomId: 'room-alpha',
			peerId: 'peer-a',
			now: 2_000,
		}).ok).toBe(true);

		expect(verifyP2PMatchTicketForRoom({
			token: ticket.token,
			roomId: 'room-beta',
			peerId: 'peer-a',
			now: 2_000,
		})).toEqual({ ok: false, reason: 'mismatch' });

		expect(verifyP2PMatchTicketForRoom({
			token: ticket.token,
			roomId: 'room-alpha',
			peerId: 'peer-b',
			now: 2_000,
		})).toEqual({ ok: false, reason: 'mismatch' });
	});

	it('rejects expired relay tickets even when room and peer still match', () => {
		const ticket = buildP2PMatchTicket({
			roomId: 'room-alpha',
			peerId: 'peer-a',
			account: 'alice',
			now: 1_000,
		});

		expect(verifyP2PMatchTicketForRoom({
			token: ticket.token,
			roomId: 'room-alpha',
			peerId: 'peer-a',
			now: 10_000_000,
		})).toEqual({ ok: false, reason: 'expired' });
	});
});

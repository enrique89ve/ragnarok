import { describe, expect, it } from 'vitest';

import { buildP2PWebSocketProtocols, buildP2PWebSocketUrl } from './wsTransport';
import {
	P2P_MATCH_TICKET_WS_PROTOCOL,
	P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX,
	type P2PMatchTicket,
} from '@shared/p2pAvailability';

describe('wsTransport security boundary', () => {
	it('always requests the public relay subprotocol', () => {
		expect(buildP2PWebSocketProtocols(null)).toEqual([P2P_MATCH_TICKET_WS_PROTOCOL]);
	});

	it('keeps relay tickets out of the websocket URL', () => {
		const matchTicket: P2PMatchTicket = {
			token: 'opaqueTicketPayload.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
			roomId: 'room-1',
			peerId: 'peer-1',
			expiresAt: Date.now() + 60_000,
		};

		const url = buildP2PWebSocketUrl({
			url: 'wss://game.example/ws/p2p',
			roomId: matchTicket.roomId,
			peerId: matchTicket.peerId,
		});
		const protocols = buildP2PWebSocketProtocols(matchTicket);

		expect(url).toBe('wss://game.example/ws/p2p?room=room-1&peer=peer-1');
		expect(url).not.toContain(matchTicket.token);
		expect(protocols).toEqual([
			P2P_MATCH_TICKET_WS_PROTOCOL,
			`${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}${matchTicket.token}`,
		]);
	});
});

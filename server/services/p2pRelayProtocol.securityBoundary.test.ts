import { describe, expect, it } from 'vitest';

import {
	P2P_MATCH_TICKET_WS_PROTOCOL,
	P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX,
} from '../../shared/p2pAvailability';
import { hasP2PRelayProtocol, readP2PRelayTicketToken } from './p2pRelayProtocol';

describe('p2pRelayProtocol security boundary', () => {
	it('requires the public relay protocol independently from the bearer ticket protocol', () => {
		const ticketToken = 'payload.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
		const ticketProtocol = `${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}${ticketToken}`;

		expect(hasP2PRelayProtocol(ticketProtocol)).toBe(false);
		expect(readP2PRelayTicketToken(ticketProtocol)).toBe(ticketToken);

		const fullHeader = `${P2P_MATCH_TICKET_WS_PROTOCOL}, ${ticketProtocol}`;
		expect(hasP2PRelayProtocol(fullHeader)).toBe(true);
		expect(readP2PRelayTicketToken(fullHeader)).toBe(ticketToken);
	});

	it('does not accept empty ticket subprotocols as credentials', () => {
		expect(readP2PRelayTicketToken(P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX)).toBeNull();
		expect(readP2PRelayTicketToken(`${P2P_MATCH_TICKET_WS_PROTOCOL}, ${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}`)).toBeNull();
	});
});

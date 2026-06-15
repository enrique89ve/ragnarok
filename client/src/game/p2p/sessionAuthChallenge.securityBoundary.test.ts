import { describe, expect, it } from 'vitest';

import { CHALLENGE_SIGNATURE_ALGORITHM } from '@shared/p2pAvailability';
import { stripRelayMatchTicketFromSessionChallenge } from './sessionAuthChallenge';

describe('session authorization challenge security boundary', () => {
	it('strips relay match tickets before session_authorize signing and transport', () => {
		const sanitized = stripRelayMatchTicketFromSessionChallenge({
			from: 'alice',
			to: 'bob',
			peerId: 'peer-alice',
			timestamp: 1,
			expiresAt: 2,
			nonce: 'nonce_123456789012',
			sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
			serverSig: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
			matchTicket: {
				token: 'payload.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
				roomId: 'room-1',
				peerId: 'peer-alice',
				expiresAt: 2,
			},
		});

		expect(sanitized).toEqual({
			from: 'alice',
			to: 'bob',
			peerId: 'peer-alice',
			timestamp: 1,
			expiresAt: 2,
			nonce: 'nonce_123456789012',
			sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
			serverSig: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
		});
		expect('matchTicket' in sanitized).toBe(false);
	});
});

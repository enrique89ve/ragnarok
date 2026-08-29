import { afterEach, describe, expect, it } from 'vitest';

import {
	clearP2PActiveMatches,
	hasP2PActiveMatchPeer,
	markP2PActiveMatchTerminal,
	registerP2PActiveMatch,
	releaseP2PActiveMatchPeer,
	sweepP2PActiveMatches,
	verifyP2PActiveMatchTicket,
} from './p2pActiveMatchRegistry';
import type { P2PActiveMatch } from './p2pMatchmakingView';

const match: P2PActiveMatch = {
	offerId: 'offer-1',
	player1: 'peer-a',
	player2: 'peer-b',
	createdAt: 1_000,
	player1MatchChallenge: null,
	player2MatchChallenge: null,
	player1MatchTicket: { token: 'ticket-a', roomId: 'match-1', peerId: 'peer-a', expiresAt: 10_000, scope: 'matchmaking' },
	player2MatchTicket: { token: 'ticket-b', roomId: 'match-1', peerId: 'peer-b', expiresAt: 10_000, scope: 'matchmaking' },
	player1QueueTokenHash: 'hash-a',
	player2QueueTokenHash: 'hash-b',
};

afterEach(() => clearP2PActiveMatches());

describe('p2p active match registry', () => {
	it('accepts only the ticket issued for the active peer and room', () => {
		registerP2PActiveMatch('match-1', match);

		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-a', token: 'ticket-a', now: 2_000 })).toMatchObject({
			ok: true,
			matchId: 'match-1',
			peerView: { opponentPeerId: 'peer-b' },
		});
		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-a', token: 'ticket-b', now: 2_000 })).toEqual({
			ok: false,
			reason: 'ticket_mismatch',
		});
	});

	it('rejects tickets after the active match expires', () => {
		registerP2PActiveMatch('match-1', match);

		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-a', token: 'ticket-a', now: 10_001 })).toEqual({
			ok: false,
			reason: 'expired',
		});
	});

	it('keeps a live match available beyond the old five-minute queue lifetime', () => {
		const longLivedMatch: P2PActiveMatch = {
			...match,
			player1MatchTicket: { ...match.player1MatchTicket, expiresAt: 2 * 60 * 60 * 1000 },
			player2MatchTicket: { ...match.player2MatchTicket, expiresAt: 2 * 60 * 60 * 1000 },
		};
		registerP2PActiveMatch('match-1', longLivedMatch);

		sweepP2PActiveMatches(6 * 60 * 1000);

		expect(verifyP2PActiveMatchTicket({
			roomId: 'match-1',
			peerId: 'peer-a',
			token: 'ticket-a',
			now: 6 * 60 * 1000,
		})).toMatchObject({ ok: true });
	});

	it('revokes one peer without granting its old ticket access again', () => {
		registerP2PActiveMatch('match-1', match);

		releaseP2PActiveMatchPeer('peer-a');

		expect(hasP2PActiveMatchPeer('peer-a', 'match-1')).toBe(false);
		expect(hasP2PActiveMatchPeer('peer-b', 'match-1')).toBe(true);
		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-a', token: 'ticket-a', now: 2_000 })).toEqual({
			ok: false,
			reason: 'peer_not_in_match',
		});
		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-b', token: 'ticket-b', now: 2_000 })).toMatchObject({ ok: true });
	});

	it('retains terminal bindings briefly, then removes them during a sweep', () => {
		registerP2PActiveMatch('match-1', match);
		expect(markP2PActiveMatchTerminal('match-1', 2_000)).toBe(true);

		sweepP2PActiveMatches(2_000 + 10 * 60 * 1000 - 1);
		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-a', token: 'ticket-a', now: 2_000 })).toMatchObject({ ok: true });

		sweepP2PActiveMatches(2_000 + 10 * 60 * 1000);
		expect(verifyP2PActiveMatchTicket({ roomId: 'match-1', peerId: 'peer-a', token: 'ticket-a', now: 2_000 })).toEqual({
			ok: false,
			reason: 'not_found',
		});
	});
});

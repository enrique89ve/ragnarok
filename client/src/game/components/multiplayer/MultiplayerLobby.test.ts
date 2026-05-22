import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CHALLENGE_SIGNATURE_ALGORITHM, type ServerSignedChallenge } from '@shared/p2pAvailability';

let helpers: typeof import('./MultiplayerLobby');

beforeAll(async () => {
	vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
	helpers = await import('./MultiplayerLobby');
});

function challenge(overrides: Partial<ServerSignedChallenge> = {}): ServerSignedChallenge {
	return {
		from: 'alice',
		peerId: 'peer-room-1',
		timestamp: 1_000,
		expiresAt: 91_000,
		nonce: 'nonce_1234567890ab',
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: 'a'.repeat(64),
		...overrides,
	};
}

describe('MultiplayerLobby direct challenge helpers', () => {
	it('keeps only unexpired incoming challenges', () => {
		expect(helpers.getActiveIncomingChallenges([
			challenge({ from: 'alice', expiresAt: 91_000 }),
			challenge({ from: 'bob', expiresAt: 5_000 }),
		], 10_000)).toEqual([
			challenge({ from: 'alice', expiresAt: 91_000 }),
		]);
	});

	it('uses the server-signed sender peer id as the direct room reservation', () => {
		expect(helpers.resolveDirectChallengeRoomId(challenge({ peerId: 'peer-direct-room' }))).toBe('peer-direct-room');
	});

	it('accepts only while the local lobby is idle and disconnected', () => {
		const incoming = challenge({ expiresAt: 91_000 });
		expect(helpers.canAcceptDirectChallenge({
			challenge: incoming,
			connectionState: 'disconnected',
			matchmakingStatus: 'idle',
			now: 10_000,
		})).toBe(true);

		expect(helpers.canAcceptDirectChallenge({
			challenge: incoming,
			connectionState: 'connected',
			matchmakingStatus: 'idle',
			now: 10_000,
		})).toBe(false);

		expect(helpers.canAcceptDirectChallenge({
			challenge: incoming,
			connectionState: 'disconnected',
			matchmakingStatus: 'queued',
			now: 10_000,
		})).toBe(false);
	});

	it('expires outgoing challenge UI state without touching matchmaking', () => {
		expect(helpers.isOutgoingChallengeActive({
			to: 'bob',
			peerId: 'peer-room-1',
			sentAt: 1_000,
			expiresAt: 91_000,
		}, 10_000)).toBe(true);

		expect(helpers.isOutgoingChallengeActive({
			to: 'bob',
			peerId: 'peer-room-1',
			sentAt: 1_000,
			expiresAt: 5_000,
		}, 10_000)).toBe(false);
	});

	it('formats short challenge expiry windows', () => {
		expect(helpers.formatChallengeTimeRemaining(69_000, 10_000)).toBe('59s');
		expect(helpers.formatChallengeTimeRemaining(190_000, 10_000)).toBe('3m');
	});

	it('keeps the lobby visible while connected transport is still syncing match state', () => {
		expect(helpers.getConnectedMatchProgress({
			connectionState: 'connected',
			opponentArmy: null,
			p2pInitApplied: false,
			p2pSessionLocalAuthorized: false,
			p2pSessionRemoteAuthorized: false,
			p2pSessionAuthError: null,
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toEqual({
			ready: false,
			title: 'Connected to opponent',
			detail: 'Waiting for the opponent loadout.',
		});

		expect(helpers.getConnectedMatchProgress({
			connectionState: 'connected',
			opponentArmy: { king: { id: 'odin' } } as never,
			p2pInitApplied: false,
			p2pSessionLocalAuthorized: true,
			p2pSessionRemoteAuthorized: true,
			p2pSessionAuthError: null,
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toEqual({
			ready: false,
			title: 'Connected to opponent',
			detail: 'Syncing the initial match state.',
		});
	});

	it('starts only after loadout, init, and both Hive session authorizations are ready', () => {
		expect(helpers.getConnectedMatchProgress({
			connectionState: 'connected',
			opponentArmy: { king: { id: 'odin' } } as never,
			p2pInitApplied: true,
			p2pSessionLocalAuthorized: true,
			p2pSessionRemoteAuthorized: true,
			p2pSessionAuthError: null,
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toEqual({
			ready: true,
			title: 'Opponent connected',
			detail: 'Starting match.',
		});
	});

	it('shows reconnect progress as opponent-facing copy', () => {
		expect(helpers.getConnectedMatchProgress({
			connectionState: 'reconnecting',
			opponentArmy: { king: { id: 'odin' } } as never,
			p2pInitApplied: true,
			p2pSessionLocalAuthorized: true,
			p2pSessionRemoteAuthorized: true,
			p2pSessionAuthError: null,
			reconnectCountdown: 25,
			reconnectAttemptCount: 1,
		})).toEqual({
			ready: false,
			title: 'Reconnecting with opponent',
			detail: 'Attempt 1/2. 25s before technical result.',
		});
	});
});

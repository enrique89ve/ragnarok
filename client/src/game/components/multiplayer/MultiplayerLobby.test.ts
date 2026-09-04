import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CHALLENGE_SIGNATURE_ALGORITHM, type P2PMatchTicket, type ServerSignedChallenge } from '@shared/p2pAvailability';
import type { P2PBattleReadyProof } from '../../p2p/battleReady';

let helpers: typeof import('./MultiplayerLobby.logic');

beforeAll(async () => {
	vi.stubGlobal('window', { location: { origin: 'http://localhost' } });
	vi.stubGlobal('localStorage', {
		getItem: vi.fn(() => null),
		setItem: vi.fn(),
		removeItem: vi.fn(),
	});
	helpers = await import('./MultiplayerLobby.logic');
}, 30_000);

function challenge(overrides: Partial<ServerSignedChallenge> = {}): ServerSignedChallenge {
	return {
		from: 'alice',
		to: 'bob',
		peerId: 'peer-room-1',
		timestamp: 1_000,
		expiresAt: 91_000,
		nonce: 'nonce_1234567890ab',
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: 'a'.repeat(64),
		...overrides,
	};
}

function matchTicket(peerId = 'peer-room-1'): P2PMatchTicket {
	return {
		token: 'ticket-token',
		roomId: peerId,
		peerId,
		expiresAt: 91_000,
	};
}

function battleProof(overrides: Partial<P2PBattleReadyProof> = {}): P2PBattleReadyProof {
	return {
		matchId: 'room-1',
		engineHash: 'engine-v1',
		rulesetHash: 'rules-v1',
		loadoutHash: 'loadout-a',
		initialStateRoot: 'root-v1',
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

	it('requires relay tickets before opening shared-network direct challenge rooms', () => {
		const incoming = challenge({ expiresAt: 91_000 });
		const base = {
			connectionState: 'disconnected' as const,
			matchmakingStatus: 'idle' as const,
			now: 10_000,
		};

		expect(helpers.getDirectChallengeRoomAccess({
			...base,
			challenge: incoming,
			sharedNetwork: false,
		})).toEqual({ ok: true });

		expect(helpers.getDirectChallengeRoomAccess({
			...base,
			challenge: incoming,
			sharedNetwork: true,
		})).toEqual({ ok: false, reason: 'missing_relay_ticket' });

		expect(helpers.getDirectChallengeRoomAccess({
			...base,
			challenge: challenge({ matchTicket: matchTicket() }),
			sharedNetwork: true,
		})).toEqual({ ok: true });
	});

	it('clears local direct challenge state when polling is blocked by starter gate', () => {
		expect(helpers.shouldClearDirectChallengeStateAfterPoll(403, {
			ok: false,
			reason: 'starter_claim_required',
		})).toBe(true);

		expect(helpers.shouldClearDirectChallengeStateAfterPoll(403, {
			ok: false,
			reason: 'not_warband',
		})).toBe(false);

		expect(helpers.shouldClearDirectChallengeStateAfterPoll(401, {
			ok: false,
			reason: 'starter_claim_required',
		})).toBe(false);
	});

	it('blocks direct challenge rooms without a current shared-network Hive session and starter claim', () => {
		expect(helpers.getDirectChallengeProtectedBlockMessage({
			hiveUsername: 'alice',
			authenticatedHiveUsername: null,
			sharedNetwork: true,
			starterClaimed: true,
		})).toContain('current Hive Keychain signature');

		expect(helpers.getDirectChallengeProtectedBlockMessage({
			hiveUsername: 'alice',
			authenticatedHiveUsername: 'alice',
			sharedNetwork: true,
			starterClaimed: false,
		})).toContain('claim the starter deck');

		expect(helpers.getDirectChallengeProtectedBlockMessage({
			hiveUsername: 'alice',
			authenticatedHiveUsername: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
		})).toBeNull();
	});

	it('reports expired and busy direct challenge rooms before ticket validation', () => {
		const base = {
			challenge: challenge({ expiresAt: 5_000 }),
			connectionState: 'connected' as const,
			matchmakingStatus: 'queued' as const,
			now: 10_000,
			sharedNetwork: true,
		};

		expect(helpers.getDirectChallengeRoomAccess(base)).toEqual({ ok: false, reason: 'expired' });
		expect(helpers.getDirectChallengeRoomAccess({
			...base,
			challenge: challenge({ expiresAt: 91_000 }),
		})).toEqual({ ok: false, reason: 'busy' });
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

	it('auto-accepts only a visible active Quick Match offer', () => {
		const offer = {
			protocol: 'ragnarok-match-offer-v1' as const,
			offerId: 'offer-1',
			matchId: 'room-1',
			player: { peerId: 'peer-local', elo: 1000 },
			opponent: { peerId: 'peer-remote', elo: 1000 },
			createdAt: 1_000,
			expiresAt: 2_000,
			serverNonce: 'nonce-1',
		};
		expect(helpers.shouldAutoAcceptQuickMatchOffer({ status: 'offered', offer, pageVisible: true, searchIntentActive: true })).toBe(true);
		expect(helpers.shouldAutoAcceptQuickMatchOffer({ status: 'offered', offer, pageVisible: false, searchIntentActive: true })).toBe(false);
		expect(helpers.shouldAutoAcceptQuickMatchOffer({ status: 'offered', offer, pageVisible: true, searchIntentActive: false })).toBe(false);
	});

	it('reduces internal matchmaking errors to player-facing copy', () => {
		expect(helpers.getPlayerFacingMatchmakingError('Matchmaking service unreachable: offline')).toContain('connection');
		expect(helpers.getPlayerFacingMatchmakingError('Posting key rejected')).toContain('Approval');
		expect(helpers.getPlayerFacingMatchmakingError('starter claim required')).toContain('starter claim');
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
			title: 'Connected',
			detail: 'Waiting for loadout.',
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
			title: 'Syncing',
			detail: 'Preparing match.',
		});
	});

	it('starts after loadout and init without waiting for Hive session authorization', () => {
		expect(helpers.getConnectedMatchProgress({
			connectionState: 'connected',
			opponentArmy: { king: { id: 'odin' } } as never,
			p2pInitApplied: true,
			p2pSessionLocalAuthorized: false,
			p2pSessionRemoteAuthorized: false,
			p2pSessionAuthError: 'Hive Keychain sign rejected: Keychain timeout (60s)',
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
		})).toEqual({
			ready: true,
			title: 'Ready',
			detail: 'Starting.',
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
			title: 'Reconnecting',
			detail: 'Restoring the match automatically (25s).',
		});
	});

	it('does not expose Battle ready before both bilateral proofs match', () => {
		const base = {
			serverMatchCommitted: true,
			localAcceptanceVerified: true,
			remoteAcceptanceVerified: true,
			matchTicket: matchTicket('room-1'),
			expectedRoomId: 'room-1',
			expectedPeerId: 'room-1',
			connectionState: 'connected' as const,
			remotePeerId: 'peer-remote',
			matchId: 'room-1',
			matchSeed: 'seed-1',
			opponentArmy: { king: { id: 'odin' } } as never,
			p2pInitApplied: true,
			expectedRemoteLoadoutHash: 'loadout-b',
			localBattleReady: battleProof(),
			remoteBattleReady: null,
			now: 10_000,
		};

		expect(helpers.getQuickMatchLobbyReadiness(base)).toEqual({
			ready: false,
			reason: 'Opponent battle-ready proof is not complete',
		});
		expect(helpers.getQuickMatchLobbyReadiness({
			...base,
			remoteBattleReady: battleProof({ loadoutHash: 'loadout-b' }),
		})).toEqual({ ready: true, reason: 'Battle ready' });
	});
});

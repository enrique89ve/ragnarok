import { beforeEach, describe, expect, it, vi } from 'vitest';
const matchmakingMocks = vi.hoisted(() => ({
	signHiveMessage: vi.fn(),
}));

vi.mock('../../data/HiveAuth', async () => {
	const actual = await vi.importActual<typeof import('../../data/HiveAuth')>('../../data/HiveAuth');
	return {
		...actual,
		signHiveMessage: matchmakingMocks.signHiveMessage,
	};
});

import {
	buildMatchmakingDelegation,
	buildMatchAcceptance,
	buildQuickMatchQueueBody,
	failQueuedStatus,
	isMatchOfferForPeer,
	readMatchmakingError,
	resetQuickMatchTelemetryForTests,
	runQuickMatchAcceptanceSingleFlight,
	runQuickMatchAuthorizationSingleFlight,
	runQuickMatchSingleFlight,
	resolveQuickMatchAccountId,
	resolveQuickMatchQueueAccess,
} from './useMatchmaking';
import { useMatchmakingStore } from '../stores/matchmakingStore';
import { usePeerStore } from '../stores/peerStore';
import type { P2PMatchTicket } from '@shared/p2pAvailability';

const matchTicket: P2PMatchTicket = {
	token: 'opaqueTicketPayload.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
	roomId: 'room-1',
	peerId: 'peer-1',
	expiresAt: Date.now() + 60_000,
};

describe('useMatchmaking quick-match access helpers', () => {
	beforeEach(() => {
		matchmakingMocks.signHiveMessage.mockReset();
		resetQuickMatchTelemetryForTests();
		useMatchmakingStore.getState().reset();
		usePeerStore.getState().disconnect();
	});

	it('selects the explicit Hive username before the authenticated fallback', () => {
		expect(resolveQuickMatchAccountId({
			hiveUsername: ' Alice ',
			authenticatedHiveUsername: 'bob',
		})).toBe('alice');
		expect(resolveQuickMatchAccountId({
			hiveUsername: ' ',
			authenticatedHiveUsername: ' Bob ',
		})).toBe('bob');
		expect(resolveQuickMatchAccountId({
			hiveUsername: null,
			authenticatedHiveUsername: null,
		})).toBeNull();
	});

	it('blocks shared-network matchmaking without an account and signed session', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: null,
			authenticatedHiveUsername: null,
			sharedNetwork: true,
			starterClaimed: false,
			hiveWalletAvailable: true,
		})).toMatchObject({
			kind: 'blocked',
			reason: 'hive_account_required',
		});

		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: null,
			sharedNetwork: true,
			starterClaimed: true,
			hiveWalletAvailable: true,
		})).toMatchObject({
			kind: 'blocked',
			reason: 'hive_session_required',
		});
	});

	it('blocks shared-network matchmaking when signed session does not match selected account', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: 'bob',
			sharedNetwork: true,
			starterClaimed: true,
			hiveWalletAvailable: true,
		})).toMatchObject({
			kind: 'blocked',
			reason: 'hive_session_mismatch',
		});
	});

	it('blocks quick match until the starter claim exists', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: 'alice',
			sharedNetwork: true,
			starterClaimed: false,
			hiveWalletAvailable: true,
		})).toMatchObject({
			kind: 'blocked',
			reason: 'starter_claim_required',
		});
	});

	it('does not require Keychain again after the Hive session is authenticated', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			hiveWalletAvailable: false,
		})).toEqual({ kind: 'allowed', accountId: 'alice' });
	});

	it('allows shared-network matchmaking when account, session, and starter claim are ready', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			hiveWalletAvailable: true,
		})).toEqual({
			kind: 'allowed',
			accountId: 'alice',
		});
	});

	it('allows Find to establish the session when the account has no hydrated session yet', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: null,
			sharedNetwork: true,
			starterClaimed: true,
			hiveWalletAvailable: true,
			requiresAuthenticatedSession: false,
		})).toEqual({ kind: 'allowed', accountId: 'alice' });
	});

	it('builds the Find delegation with exactly one visible Hive signature', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
			success: true,
			challenge: {
				protocol: 'ragnarok-matchmaking-delegation-v1',
				delegationId: 'delegation-1',
				account: 'alice',
				peerId: 'peer-one',
				rulesetHash: 'ruleset-hash',
				engineHash: 'engine-hash',
				serverNonce: 'nonce_1234567890ab',
				issuedAt: Date.now(),
				expiresAt: Date.now() + 600_000,
			},
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);
		matchmakingMocks.signHiveMessage.mockResolvedValueOnce({ success: true, signature: 'hive-signature' });

		const result = await buildMatchmakingDelegation({
			peerId: 'peer-one',
			accountId: 'alice',
			rulesetHash: 'ruleset-hash',
			engineHash: 'engine-hash',
		});

		expect(result.delegation).toMatchObject({ account: 'alice', peerId: 'peer-one', hiveSig: 'hive-signature' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(matchmakingMocks.signHiveMessage).toHaveBeenCalledTimes(1);
		expect(matchmakingMocks.signHiveMessage).toHaveBeenCalledWith(
			expect.stringContaining('ragnarok-matchmaking-delegation-v1'),
			expect.objectContaining({ username: 'alice' }),
		);
	});

	it('turns a Keychain assertion into actionable Find feedback', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
			success: true,
			challenge: {
				protocol: 'ragnarok-matchmaking-delegation-v1',
				delegationId: 'delegation-assertion',
				account: 'alice',
				peerId: 'peer-one',
				rulesetHash: 'ruleset-hash',
				engineHash: 'engine-hash',
				serverNonce: 'nonce_assertion_1234',
				issuedAt: Date.now(),
				expiresAt: Date.now() + 600_000,
			},
		}), { status: 200 })));
		matchmakingMocks.signHiveMessage.mockResolvedValueOnce({
			success: false,
			error: { code: 'ERR_ASSERTION', expected: true, actual: false },
		});

		await expect(buildMatchmakingDelegation({
			peerId: 'peer-one',
			accountId: 'alice',
			rulesetHash: 'ruleset-hash',
			engineHash: 'engine-hash',
		})).rejects.toThrow('Posting key');
	});

	it('keeps local quick match behind local starter claim without requiring Hive or Keychain', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: null,
			authenticatedHiveUsername: null,
			sharedNetwork: false,
			starterClaimed: true,
			hiveWalletAvailable: false,
		})).toEqual({
			kind: 'allowed',
			accountId: null,
		});
	});

	it('builds an unsigned F1 shared-network queue body without Keychain', async () => {
		const result = await buildQuickMatchQueueBody({
			peerId: 'peer-one',
			searchIntentId: 'intent-one',
			accountId: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			walletAuthMode: 'unsigned-local',
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.body).toEqual({
			searchIntentId: 'intent-one',
			peerId: 'peer-one',
			username: 'alice',
			starterClaimed: true,
		});
		expect(matchmakingMocks.signHiveMessage).not.toHaveBeenCalled();
	});

	it('single-flights the complete Quick Match operation and preserves its intent id', async () => {
		let resolveAttempt: ((result: boolean) => void) | undefined;
		const runAttempt = vi.fn(() => new Promise<boolean>((resolve) => {
			resolveAttempt = resolve;
		}));

		const first = runQuickMatchSingleFlight(runAttempt);
		const second = runQuickMatchSingleFlight(runAttempt);

		expect(second).toBe(first);
		await Promise.resolve();
		expect(runAttempt).toHaveBeenCalledOnce();
		expect(runAttempt.mock.calls[0]?.[0]).toMatch(/^[0-9a-f-]{36}$/);
		resolveAttempt?.(true);
		expect(await first).toBe(true);

		const third = runQuickMatchSingleFlight(runAttempt);
		expect(third).not.toBe(first);
		await Promise.resolve();
		expect(runAttempt).toHaveBeenCalledTimes(2);
		resolveAttempt?.(true);
		expect(await third).toBe(true);
	});

	it('single-flights wallet authorization for the same preparation key', async () => {
		const runAttempt = vi.fn(async () => { throw new Error('authorization stopped'); });
		const first = runQuickMatchAuthorizationSingleFlight('alice:peer:rules:engine', runAttempt);
		const second = runQuickMatchAuthorizationSingleFlight('alice:peer:rules:engine', runAttempt);
		expect(second).toBe(first);
		await Promise.resolve();
		expect(runAttempt).toHaveBeenCalledOnce();
		await expect(first).rejects.toThrow('authorization stopped');
	});

	it('single-flights automatic match acceptance before the first promise settles', async () => {
		let resolveAttempt: ((value: boolean) => void) | undefined;
		const runAttempt = vi.fn(() => new Promise<boolean>(resolve => { resolveAttempt = resolve; }));
		const first = runQuickMatchAcceptanceSingleFlight(runAttempt);
		const second = runQuickMatchAcceptanceSingleFlight(runAttempt);
		expect(second).toBe(first);
		await Promise.resolve();
		expect(runAttempt).toHaveBeenCalledOnce();
		resolveAttempt?.(true);
		await expect(first).resolves.toBe(true);
	});

	it('never signs while building the queue request', async () => {
		matchmakingMocks.signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'signed-queue',
		});

		const result = await buildQuickMatchQueueBody({
			peerId: 'peer-one',
			searchIntentId: 'intent-two',
			accountId: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			walletAuthMode: 'hive-body-auth',
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.body).toEqual({
			searchIntentId: 'intent-two',
			peerId: 'peer-one',
			username: 'alice',
			starterClaimed: true,
		});
		expect(matchmakingMocks.signHiveMessage).not.toHaveBeenCalled();
	});

	it('accepts the offer addressed to this peer, leaving freshness to the server', () => {
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

		expect(isMatchOfferForPeer(offer, 'peer-local')).toBe(true);
		expect(isMatchOfferForPeer(offer, 'peer-remote')).toBe(false);
		expect(isMatchOfferForPeer({ ...offer, expiresAt: 1_001 }, 'peer-local')).toBe(true);
	});

	it('binds acceptance to the opponent in the offer perspective', () => {
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

		expect(buildMatchAcceptance({
			offer,
			peerId: 'peer-local',
			ephemeralPubkey: 'p'.repeat(43),
			rulesetHash: 'ruleset-hash',
			engineHash: 'engine-hash',
		})).toMatchObject({
			peerId: 'peer-local',
			opponentPeerId: 'peer-remote',
		});
	});

	it('does not turn a rejected unused signer into a queue failure', async () => {
		matchmakingMocks.signHiveMessage.mockResolvedValueOnce({
			success: false,
			error: 'rejected',
		});

		await expect(buildQuickMatchQueueBody({
			peerId: 'peer-one',
			searchIntentId: 'intent-three',
			accountId: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			walletAuthMode: 'hive-body-auth',
		})).resolves.toMatchObject({ ok: true });
	});

	it('reads server matchmaking rejection details instead of hiding them behind status codes', async () => {
		await expect(readMatchmakingError(new Response(
			JSON.stringify({ success: false, error: 'starter claim required' }),
			{ status: 403 },
		))).resolves.toBe('starter claim required (HTTP 403)');
	});

	it('clears local matchmaking and peer secrets when queued status polling fails', () => {
		useMatchmakingStore.getState().setStatus('ready');
		useMatchmakingStore.getState().setQueuePosition(2);
		useMatchmakingStore.getState().setQueueToken('queue-token');
		useMatchmakingStore.getState().setOpponent('opponent-peer', true);
		useMatchmakingStore.getState().setRoomId('room-1');
		usePeerStore.getState().setMatchTicket(matchTicket);

		failQueuedStatus('Matchmaking status rejected: starter claim required (HTTP 403)', {
			setStatus: useMatchmakingStore.getState().setStatus,
			setQueuePosition: useMatchmakingStore.getState().setQueuePosition,
			setOpponent: useMatchmakingStore.getState().setOpponent,
			setRoomId: useMatchmakingStore.getState().setRoomId,
			setQueueToken: useMatchmakingStore.getState().setQueueToken,
			setError: useMatchmakingStore.getState().setError,
		});

		expect(useMatchmakingStore.getState()).toMatchObject({
			status: 'error',
			queuePosition: null,
			opponentPeerId: null,
			isHost: null,
			roomId: null,
			queueToken: null,
			error: 'Matchmaking status rejected: starter claim required (HTTP 403)',
		});
		expect(usePeerStore.getState().matchTicket).toBeNull();
	});
});

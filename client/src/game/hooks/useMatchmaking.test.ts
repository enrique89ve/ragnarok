import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildP2PQueueAuthMessage } from '@shared/p2pMatchmakingAuth';

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
	buildQuickMatchQueueBody,
	failQueuedStatus,
	readMatchmakingError,
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

	it('blocks shared-network matchmaking when Keychain is unavailable even after account gates pass', () => {
		expect(resolveQuickMatchQueueAccess({
			accountId: 'alice',
			authenticatedHiveUsername: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			hiveWalletAvailable: false,
		})).toEqual({
			kind: 'blocked',
			reason: 'hive_wallet_unavailable',
			message: 'Hive Keychain is not available in this browser profile.',
		});
	});

	it('allows shared-network matchmaking only when account, session, starter, and Keychain are ready', () => {
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
			accountId: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			walletAuthMode: 'unsigned-local',
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.body).toEqual({
			peerId: 'peer-one',
			username: 'alice',
			starterClaimed: true,
		});
		expect(matchmakingMocks.signHiveMessage).not.toHaveBeenCalled();
	});

	it('builds a queue body whose Hive signature is bound to peerId and starter claim state', async () => {
		matchmakingMocks.signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'signed-queue',
		});

		const result = await buildQuickMatchQueueBody({
			peerId: 'peer-one',
			accountId: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			walletAuthMode: 'hive-body-auth',
		});

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.body).toMatchObject({
			peerId: 'peer-one',
			username: 'alice',
			signature: 'signed-queue',
			starterClaimed: true,
		});
		const timestamp = result.body.timestamp;
		expect(typeof timestamp).toBe('number');
		if (typeof timestamp !== 'number') throw new Error('expected queue timestamp');
		expect(matchmakingMocks.signHiveMessage).toHaveBeenCalledWith(
			buildP2PQueueAuthMessage({
				username: 'alice',
				peerId: 'peer-one',
				starterClaimed: true,
				timestamp,
			}),
			{ username: 'alice', title: 'Ragnarok: queue' },
		);
	});

	it('fails closed when shared-network queue signing is rejected', async () => {
		matchmakingMocks.signHiveMessage.mockResolvedValueOnce({
			success: false,
			error: 'rejected',
		});

		await expect(buildQuickMatchQueueBody({
			peerId: 'peer-one',
			accountId: 'alice',
			sharedNetwork: true,
			starterClaimed: true,
			walletAuthMode: 'hive-body-auth',
		})).resolves.toEqual({
			ok: false,
			message: 'Hive Keychain signature required before entering matchmaking.',
		});
	});

	it('reads server matchmaking rejection details instead of hiding them behind status codes', async () => {
		await expect(readMatchmakingError(new Response(
			JSON.stringify({ success: false, error: 'starter claim required' }),
			{ status: 403 },
		))).resolves.toBe('starter claim required (HTTP 403)');
	});

	it('clears local matchmaking and peer secrets when queued status polling fails', () => {
		useMatchmakingStore.getState().setStatus('matched');
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

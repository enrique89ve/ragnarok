import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearActiveHiveSession, setActiveHiveSession } from '../../data/HiveAuth';
import {
	hasVolatileP2PRuntimeState,
	shouldClearP2PRuntimeForHiveSessionChange,
	usePeerStore,
} from './peerStore';
import { useMatchmakingStore } from './matchmakingStore';
import type { P2PMatchTicket } from '@shared/p2pAvailability';

const matchTicket: P2PMatchTicket = {
	token: 'opaqueTicketPayload.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
	roomId: 'room-1',
	peerId: 'peer-1',
	expiresAt: Date.now() + 60_000,
};

function currentRuntimeState() {
	const peer = usePeerStore.getState();
	const matchmaking = useMatchmakingStore.getState();
	return {
		peer,
		matchmaking: {
			status: matchmaking.status,
			queueToken: matchmaking.queueToken,
			roomId: matchmaking.roomId,
			opponentPeerId: matchmaking.opponentPeerId,
		},
	};
}

describe('peerStore P2P session boundary', () => {
	beforeEach(() => {
		clearActiveHiveSession();
		usePeerStore.getState().disconnect();
		useMatchmakingStore.getState().reset();
	});

	afterEach(() => {
		clearActiveHiveSession();
		usePeerStore.getState().disconnect();
		useMatchmakingStore.getState().reset();
		delete (globalThis as Record<string, unknown>).__ragnarokPeerStore;
	});

	it('does not publish the P2P store or relay tickets on globalThis', () => {
		expect((globalThis as Record<string, unknown>).__ragnarokPeerStore).toBeUndefined();
	});

	it('classifies peer tickets and queue tokens as volatile runtime state', () => {
		expect(hasVolatileP2PRuntimeState(currentRuntimeState())).toBe(false);

		usePeerStore.getState().setMyPeerId('peer-1');
		usePeerStore.getState().setMatchTicket(matchTicket);
		useMatchmakingStore.getState().setQueueToken('queue-token');

		expect(hasVolatileP2PRuntimeState(currentRuntimeState())).toBe(true);
		expect(shouldClearP2PRuntimeForHiveSessionChange({
			previousAuthenticatedHiveUsername: null,
			nextAuthenticatedHiveUsername: 'alice',
			runtimeState: currentRuntimeState(),
		})).toBe(false);
		expect(shouldClearP2PRuntimeForHiveSessionChange({
			previousAuthenticatedHiveUsername: 'alice',
			nextAuthenticatedHiveUsername: 'alice',
			runtimeState: currentRuntimeState(),
		})).toBe(false);
		expect(shouldClearP2PRuntimeForHiveSessionChange({
			previousAuthenticatedHiveUsername: 'alice',
			nextAuthenticatedHiveUsername: null,
			runtimeState: currentRuntimeState(),
		})).toBe(true);
	});

	it('clears peer secrets and matchmaking state when the authenticated Hive session changes', () => {
		setActiveHiveSession('alice');
		usePeerStore.getState().setMyPeerId('peer-1');
		usePeerStore.getState().setMatchChallenges(null, null);
		usePeerStore.getState().setMatchTicket(matchTicket);
		useMatchmakingStore.getState().setStatus('queued');
		useMatchmakingStore.getState().setQueueToken('queue-token');

		setActiveHiveSession('bob');

		expect(usePeerStore.getState().myPeerId).toBeNull();
		expect(usePeerStore.getState().matchTicket).toBeNull();
		expect(usePeerStore.getState().connectionState).toBe('disconnected');
		expect(useMatchmakingStore.getState().status).toBe('idle');
		expect(useMatchmakingStore.getState().queueToken).toBeNull();
	});

	it('cancels a pre-battle leave and resolves a post-action leave with absolute IDs', () => {
		usePeerStore.getState().setMyPeerId('peer-local');
		usePeerStore.getState().setRemotePeerId('peer-remote');
		usePeerStore.getState().initializeBattleLifecycle({
			matchId: 'match-1',
			playerA: 'peer-local',
			playerB: 'peer-remote',
		});

		const cancelled = usePeerStore.getState().requestP2PLeave('peer-local');
		expect(cancelled?.phase).toBe('cancelled');
		expect(cancelled?.result).toBeNull();

		usePeerStore.getState().initializeBattleLifecycle({
			matchId: 'match-2',
			playerA: 'peer-local',
			playerB: 'peer-remote',
		});
		usePeerStore.getState().recordCanonicalAction({
			actionId: 'move-1',
			actorId: 'peer-local',
			canonicalOrder: 1,
		});

		const resolved = usePeerStore.getState().requestP2PLeave('peer-local');
		expect(resolved?.result).toMatchObject({
			kind: 'technical_abandonment',
			winnerId: 'peer-remote',
			loserId: 'peer-local',
			reason: 'explicit_leave',
		});
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	markP2PRefereePlaneConnected,
	markP2PRefereePlaneDisconnected,
	P2P_REFEREE_RECONNECT_RETENTION_MS,
	p2pPhaseCheckpointCoordinator,
	p2pPokerTimeNotary,
} from './p2pReferee';

const turn = {
	type: 'poker_turn_started' as const,
	combatId: 'combat-referee-test',
	turnId: 'combat-referee-test:pre_flop:player:0',
	phase: 'pre_flop' as const,
	activePlayerId: 'player',
	actionsThisRound: 0,
	durationMs: 60_000,
	sentAtMs: 1,
};

const checkpoint = {
	type: 'phase_checkpoint_propose_v1' as const,
	protocolVersion: 1 as const,
	scope: 'round-boundary' as const,
	matchId: 'referee-retention-test',
	epoch: 1,
	fromPhase: 'chess' as const,
	toPhase: 'poker_combat' as const,
	previousCheckpointId: '0'.repeat(64),
	stateRoot: '1'.repeat(64),
};

afterEach(() => {
	vi.useRealTimers();
});

describe('P2P referee reconnect retention', () => {
	it('keeps a committed Poker deadline when both Control WS peers disappear', () => {
		vi.useFakeTimers();
		const roomId = 'referee-retention-poker';
		markP2PRefereePlaneConnected(roomId, 'control');

		p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-a', proposal: turn, nowMs: 1_000 });
		const initialCommitResult = p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-b', proposal: turn, nowMs: 1_000 });
		if (initialCommitResult.status !== 'message') throw new Error('Expected initial Poker notary commit');
		const initialCommit = initialCommitResult.message;

		markP2PRefereePlaneDisconnected(roomId, 'control');
		vi.advanceTimersByTime(P2P_REFEREE_RECONNECT_RETENTION_MS - 1);
		markP2PRefereePlaneConnected(roomId, 'control');

		const resumedResult = p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-a', proposal: turn, nowMs: 20_000 });
		if (resumedResult.status !== 'message') throw new Error('Expected resumed Poker notary commit');
		expect(resumedResult.message).toMatchObject({
			serverStartedAtMs: initialCommit.serverStartedAtMs,
			serverDeadlineAtMs: initialCommit.serverDeadlineAtMs,
		});

		markP2PRefereePlaneDisconnected(roomId, 'control');
		vi.advanceTimersByTime(P2P_REFEREE_RECONNECT_RETENTION_MS);
		const resetResult = p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-a', proposal: turn, nowMs: 80_000 });
		expect(resetResult.status).toBe('pending');
	});

	it('keeps a committed checkpoint chain when the Control WS reconnects', () => {
		vi.useFakeTimers();
		const roomId = 'referee-retention-checkpoint';
		markP2PRefereePlaneConnected(roomId, 'control');

		p2pPhaseCheckpointCoordinator.submit({ roomId, peerId: 'peer-a', proposal: checkpoint });
		const initialCommitResult = p2pPhaseCheckpointCoordinator.submit({ roomId, peerId: 'peer-b', proposal: checkpoint });
		if (initialCommitResult.status !== 'message') throw new Error('Expected initial checkpoint commit');

		markP2PRefereePlaneDisconnected(roomId, 'control');
		vi.advanceTimersByTime(P2P_REFEREE_RECONNECT_RETENTION_MS - 1);
		markP2PRefereePlaneConnected(roomId, 'control');

		const nextCheckpoint = {
			...checkpoint,
			epoch: 2,
			fromPhase: 'poker_combat' as const,
			toPhase: 'chess' as const,
			previousCheckpointId: initialCommitResult.message.checkpointId,
			stateRoot: '2'.repeat(64),
		};
		p2pPhaseCheckpointCoordinator.submit({ roomId, peerId: 'peer-a', proposal: nextCheckpoint });
		const resumedResult = p2pPhaseCheckpointCoordinator.submit({ roomId, peerId: 'peer-b', proposal: nextCheckpoint });

		expect(resumedResult).toMatchObject({
			status: 'message',
			message: {
				type: 'phase_checkpoint_commit_v1',
				epoch: 2,
				previousCheckpointId: initialCommitResult.message.checkpointId,
			},
		});

		markP2PRefereePlaneDisconnected(roomId, 'control');
		vi.advanceTimersByTime(P2P_REFEREE_RECONNECT_RETENTION_MS);
	});

	it('does not expire referee state while the other transport plane remains live', () => {
		vi.useFakeTimers();
		const roomId = 'referee-cross-plane-retention';
		markP2PRefereePlaneConnected(roomId, 'control');
		markP2PRefereePlaneConnected(roomId, 'relay');

		p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-a', proposal: turn, nowMs: 1_000 });
		const initialCommitResult = p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-b', proposal: turn, nowMs: 1_000 });
		if (initialCommitResult.status !== 'message') throw new Error('Expected initial Poker notary commit');

		markP2PRefereePlaneDisconnected(roomId, 'relay');
		vi.advanceTimersByTime(P2P_REFEREE_RECONNECT_RETENTION_MS * 2);
		const retainedResult = p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-a', proposal: turn, nowMs: 200_000 });
		expect(retainedResult).toMatchObject({
			status: 'message',
			message: {
				serverStartedAtMs: initialCommitResult.message.serverStartedAtMs,
				serverDeadlineAtMs: initialCommitResult.message.serverDeadlineAtMs,
			},
		});

		markP2PRefereePlaneDisconnected(roomId, 'control');
		vi.advanceTimersByTime(P2P_REFEREE_RECONNECT_RETENTION_MS);
		const resetResult = p2pPokerTimeNotary.submit({ roomId, peerId: 'peer-a', proposal: turn, nowMs: 400_000 });
		expect(resetResult.status).toBe('pending');
	});
});

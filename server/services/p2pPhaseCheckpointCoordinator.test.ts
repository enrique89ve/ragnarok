import { describe, expect, it } from 'vitest';

import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	PhaseCheckpointProposalSchema,
	ZERO_PHASE_CHECKPOINT_ID,
	type PhaseCheckpointProposal,
} from '../../shared/p2p-wire/phaseCheckpoint';
import { createP2PPhaseCheckpointCoordinator } from './p2pPhaseCheckpointCoordinator';

function proposal(overrides: Partial<PhaseCheckpointProposal> = {}): PhaseCheckpointProposal {
	return PhaseCheckpointProposalSchema.parse({
		type: 'phase_checkpoint_propose_v1',
		protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
		scope: PHASE_CHECKPOINT_SCOPE,
		matchId: 'match-1',
		epoch: 1,
		fromPhase: 'chess',
		toPhase: 'poker_combat',
		previousCheckpointId: ZERO_PHASE_CHECKPOINT_ID,
		stateRoot: '1'.repeat(64),
		...overrides,
	});
}

describe('P2P phase checkpoint coordinator', () => {
	it('commits only after two distinct peers submit the same proposal', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		expect(coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() })).toEqual({ status: 'pending' });
		const result = coordinator.submit({ roomId: 'room', peerId: 'b', proposal: proposal() });
		expect(result.status).toBe('message');
		if (result.status !== 'message') return;
		expect(result.recipients).toBe('room');
		expect(result.message.type).toBe('phase_checkpoint_commit_v1');
		expect(coordinator.getStats()).toEqual({ activeRooms: 1, pendingRooms: 0, disputedRooms: 0 });
	});

	it('is idempotent for duplicate votes and committed proposal replay', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() });
		expect(coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() })).toEqual({ status: 'pending' });
		const committed = coordinator.submit({ roomId: 'room', peerId: 'b', proposal: proposal() });
		const replay = coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() });
		expect(replay).toEqual(committed.status === 'message'
			? { ...committed, recipients: 'sender' }
			: committed);
	});

	it('freezes the room when peers disagree at the same epoch', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() });
		const mismatch = coordinator.submit({
			roomId: 'room',
			peerId: 'b',
			proposal: proposal({ stateRoot: '2'.repeat(64) }),
		});
		expect(mismatch.status).toBe('message');
		if (mismatch.status !== 'message') return;
		expect(mismatch.recipients).toBe('room');
		expect(mismatch.message.type).toBe('phase_checkpoint_dispute_v1');
		expect(mismatch.message.type === 'phase_checkpoint_dispute_v1' && mismatch.message.reason).toBe('peer_mismatch');
		expect(coordinator.getStats().disputedRooms).toBe(1);
	});

	it('rejects equivocation without retaining unbounded votes', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() });
		const result = coordinator.submit({
			roomId: 'room',
			peerId: 'a',
			proposal: proposal({ stateRoot: '3'.repeat(64) }),
		});
		expect(result.status).toBe('message');
		if (result.status !== 'message' || result.message.type !== 'phase_checkpoint_dispute_v1') return;
		expect(result.message.reason).toBe('equivocation');
	});

	it('chains the next epoch to the previous committed checkpoint', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() });
		const first = coordinator.submit({ roomId: 'room', peerId: 'b', proposal: proposal() });
		if (first.status !== 'message' || first.message.type !== 'phase_checkpoint_commit_v1') {
			throw new Error('expected first checkpoint commit');
		}
		const second = proposal({
			epoch: 2,
			fromPhase: 'poker_combat',
			toPhase: 'chess',
			previousCheckpointId: first.message.checkpointId,
			stateRoot: '4'.repeat(64),
		});
		expect(coordinator.submit({ roomId: 'room', peerId: 'a', proposal: second })).toEqual({ status: 'pending' });
		const committed = coordinator.submit({ roomId: 'room', peerId: 'b', proposal: second });
		expect(committed.status === 'message' && committed.message.type).toBe('phase_checkpoint_commit_v1');
	});

	it('drops all constant-sized room state on room cleanup', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		coordinator.submit({ roomId: 'room', peerId: 'a', proposal: proposal() });
		expect(coordinator.getStats().activeRooms).toBe(1);
		coordinator.dropRoom('room');
		expect(coordinator.getStats()).toEqual({ activeRooms: 0, pendingRooms: 0, disputedRooms: 0 });
	});

	it('allows a new epoch-one session to reuse a manual room id', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		coordinator.submit({ roomId: 'manual-room', peerId: 'a', proposal: proposal() });
		coordinator.submit({ roomId: 'manual-room', peerId: 'b', proposal: proposal() });
		const nextSession = proposal({ matchId: 'match-2', stateRoot: '2'.repeat(64) });
		expect(coordinator.submit({ roomId: 'manual-room', peerId: 'a', proposal: nextSession }))
			.toEqual({ status: 'pending' });
	});

	it('keeps one constant-sized record per room across thousands of matches', () => {
		const coordinator = createP2PPhaseCheckpointCoordinator();
		for (let index = 0; index < 5_000; index++) {
			coordinator.submit({
				roomId: `room-${index}`,
				peerId: 'a',
				proposal: proposal({ matchId: `match-${index}` }),
			});
		}
		expect(coordinator.getStats()).toEqual({
			activeRooms: 5_000,
			pendingRooms: 5_000,
			disputedRooms: 0,
		});
	});
});

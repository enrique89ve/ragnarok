import { describe, expect, it } from 'vitest';

import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	PhaseCheckpointProposalSchema,
	ZERO_PHASE_CHECKPOINT_ID,
	buildPhaseCheckpointCommit,
	computePhaseCheckpointId,
	isAllowedPhaseCheckpointTransition,
	tryParsePhaseCheckpointProposal,
} from './phaseCheckpoint';

const ROOT = '1'.repeat(64);

function proposal() {
	return PhaseCheckpointProposalSchema.parse({
		type: 'phase_checkpoint_propose_v1',
		protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
		scope: PHASE_CHECKPOINT_SCOPE,
		matchId: 'match-1',
		epoch: 1,
		fromPhase: 'chess',
		toPhase: 'poker_combat',
		previousCheckpointId: ZERO_PHASE_CHECKPOINT_ID,
		stateRoot: ROOT,
	});
}

describe('phase checkpoint wire contract', () => {
	it('produces a deterministic commitment bound to every proposal field', () => {
		const input = proposal();
		const id = computePhaseCheckpointId({ roomId: 'room-1', proposal: input });
		expect(computePhaseCheckpointId({ roomId: 'room-1', proposal: input })).toBe(id);
		expect(computePhaseCheckpointId({ roomId: 'room-2', proposal: input })).not.toBe(id);
		expect(computePhaseCheckpointId({ roomId: 'room-1', proposal: { ...input, epoch: 2 } })).not.toBe(id);
		expect(computePhaseCheckpointId({ roomId: 'room-1', proposal: { ...input, stateRoot: '2'.repeat(64) } })).not.toBe(id);
	});

	it('builds a strict server commit that clients can recompute', () => {
		const input = proposal();
		const commit = buildPhaseCheckpointCommit({ roomId: 'room-1', proposal: input });
		expect(commit.checkpointId).toBe(computePhaseCheckpointId({ roomId: 'room-1', proposal: input }));
		expect(commit.epoch).toBe(1);
	});

	it('accepts only the bounded phase graph', () => {
		expect(isAllowedPhaseCheckpointTransition('chess', 'poker_combat')).toBe(true);
		expect(isAllowedPhaseCheckpointTransition('poker_combat', 'chess')).toBe(true);
		expect(isAllowedPhaseCheckpointTransition('chess', 'game_over')).toBe(true);
		expect(isAllowedPhaseCheckpointTransition('game_over', 'chess')).toBe(false);
	});

	it('rejects hostile hashes, extra keys and invalid numeric epochs', () => {
		const input = proposal();
		expect(tryParsePhaseCheckpointProposal({ ...input, stateRoot: 'ABC' })).toBeNull();
		expect(tryParsePhaseCheckpointProposal({ ...input, epoch: 1.5 })).toBeNull();
		expect(tryParsePhaseCheckpointProposal({ ...input, injected: true })).toBeNull();
	});
});

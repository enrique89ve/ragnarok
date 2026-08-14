/**
 * O(1) optimistic phase-checkpoint coordinator for the WebSocket relay.
 *
 * Memory is bounded to one committed checkpoint plus at most two pending
 * proposals per active room. No gameplay state or checkpoint history is kept.
 */

import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	PhaseCheckpointDisputeSchema,
	ZERO_PHASE_CHECKPOINT_ID,
	buildPhaseCheckpointCommit,
	isAllowedPhaseCheckpointTransition,
	samePhaseCheckpointProposal,
	type PhaseCheckpointCommit,
	type PhaseCheckpointDispute,
	type PhaseCheckpointProposal,
	type PhaseCheckpointServerMessage,
} from '../../shared/p2p-wire/phaseCheckpoint';

type PendingCheckpoint = {
	readonly epoch: number;
	readonly votes: Map<string, PhaseCheckpointProposal>;
};

type OpenRoomCheckpointState = {
	readonly status: 'open';
	readonly committed: PhaseCheckpointCommit | null;
	readonly pending: PendingCheckpoint | null;
};

type DisputedRoomCheckpointState = {
	readonly status: 'disputed';
	readonly dispute: PhaseCheckpointDispute;
};

type RoomCheckpointState = OpenRoomCheckpointState | DisputedRoomCheckpointState;

export type PhaseCheckpointCoordinatorResult =
	| { readonly status: 'pending' }
	| {
			readonly status: 'message';
			readonly recipients: 'sender' | 'room';
			readonly message: PhaseCheckpointServerMessage;
	  };

export type PhaseCheckpointCoordinator = Readonly<{
	submit: (input: {
		readonly roomId: string;
		readonly peerId: string;
		readonly proposal: PhaseCheckpointProposal;
	}) => PhaseCheckpointCoordinatorResult;
	dropRoom: (roomId: string) => void;
	getStats: () => {
		readonly activeRooms: number;
		readonly pendingRooms: number;
		readonly disputedRooms: number;
	};
}>;

function buildDispute(input: {
	readonly roomId: string;
	readonly proposal: PhaseCheckpointProposal;
	readonly reason: PhaseCheckpointDispute['reason'];
	readonly expectedEpoch?: number;
	readonly lastCommitted?: PhaseCheckpointCommit | null;
}): PhaseCheckpointDispute {
	return PhaseCheckpointDisputeSchema.parse({
		type: 'phase_checkpoint_dispute_v1',
		protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
		scope: PHASE_CHECKPOINT_SCOPE,
		roomId: input.roomId,
		matchId: input.proposal.matchId,
		epoch: input.proposal.epoch,
		reason: input.reason,
		...(input.expectedEpoch === undefined ? {} : { expectedEpoch: input.expectedEpoch }),
		...(input.lastCommitted
			? { lastCommittedCheckpointId: input.lastCommitted.checkpointId }
			: {}),
	});
}

function proposalMatchesCommit(
	proposal: PhaseCheckpointProposal,
	commit: PhaseCheckpointCommit,
): boolean {
	return proposal.matchId === commit.matchId
		&& proposal.epoch === commit.epoch
		&& proposal.fromPhase === commit.fromPhase
		&& proposal.toPhase === commit.toPhase
		&& proposal.previousCheckpointId === commit.previousCheckpointId
		&& proposal.stateRoot === commit.stateRoot;
}

function validateProposalChain(
	proposal: PhaseCheckpointProposal,
	committed: PhaseCheckpointCommit | null,
): PhaseCheckpointDispute['reason'] | null {
	if (!isAllowedPhaseCheckpointTransition(proposal.fromPhase, proposal.toPhase)) {
		return 'invalid_transition';
	}

	if (committed) {
		if (proposal.fromPhase !== committed.toPhase
			|| proposal.previousCheckpointId !== committed.checkpointId) {
			return 'chain_mismatch';
		}
		return null;
	}

	if (proposal.epoch === 1) {
		return proposal.fromPhase === 'chess'
			&& proposal.previousCheckpointId === ZERO_PHASE_CHECKPOINT_ID
			? null
			: 'chain_mismatch';
	}

	// Cold relay restart: both peers may resume at epoch >1. The relay cannot
	// reconstruct old history, but it can require a non-genesis parent and
	// compare both independently retained proposals.
	return proposal.previousCheckpointId === ZERO_PHASE_CHECKPOINT_ID
		? 'chain_mismatch'
		: null;
}

export function createP2PPhaseCheckpointCoordinator(): PhaseCheckpointCoordinator {
	const rooms = new Map<string, RoomCheckpointState>();

	function submit(input: {
		readonly roomId: string;
		readonly peerId: string;
		readonly proposal: PhaseCheckpointProposal;
	}): PhaseCheckpointCoordinatorResult {
		let current = rooms.get(input.roomId);
		const currentMatchId = current?.status === 'disputed'
			? current.dispute.matchId
			: current?.committed?.matchId ?? current?.pending?.votes.values().next().value?.matchId;
		const startsNewSession = input.proposal.epoch === 1
			&& input.proposal.fromPhase === 'chess'
			&& input.proposal.previousCheckpointId === ZERO_PHASE_CHECKPOINT_ID
			&& currentMatchId !== undefined
			&& currentMatchId !== input.proposal.matchId;
		if (startsNewSession) {
			rooms.delete(input.roomId);
			current = undefined;
		}
		if (current?.status === 'disputed') {
			return {
				status: 'message',
				recipients: 'sender',
				message: { ...current.dispute, reason: 'room_disputed' },
			};
		}

		const committed = current?.committed ?? null;
		const expectedEpoch = committed ? committed.epoch + 1 : input.proposal.epoch;

		if (committed && input.proposal.epoch <= committed.epoch) {
			return proposalMatchesCommit(input.proposal, committed)
				? { status: 'message', recipients: 'sender', message: committed }
				: {
					status: 'message',
					recipients: 'sender',
					message: buildDispute({
						roomId: input.roomId,
						proposal: input.proposal,
						reason: 'chain_mismatch',
						expectedEpoch,
						lastCommitted: committed,
					}),
				};
		}

		if (committed && input.proposal.epoch !== expectedEpoch) {
			return {
				status: 'message',
				recipients: 'sender',
				message: buildDispute({
					roomId: input.roomId,
					proposal: input.proposal,
					reason: 'epoch_gap',
					expectedEpoch,
					lastCommitted: committed,
				}),
			};
		}

		const chainFailure = validateProposalChain(input.proposal, committed);
		if (chainFailure) {
			return {
				status: 'message',
				recipients: 'sender',
				message: buildDispute({
					roomId: input.roomId,
					proposal: input.proposal,
					reason: chainFailure,
					expectedEpoch,
					lastCommitted: committed,
				}),
			};
		}

		const pending = current?.pending ?? null;
		if (pending && pending.epoch !== input.proposal.epoch) {
			return {
				status: 'message',
				recipients: 'sender',
				message: buildDispute({
					roomId: input.roomId,
					proposal: input.proposal,
					reason: 'epoch_gap',
					expectedEpoch: pending.epoch,
					lastCommitted: committed,
				}),
			};
		}

		const activePending: PendingCheckpoint = pending ?? {
			epoch: input.proposal.epoch,
			votes: new Map(),
		};
		const previousVote = activePending.votes.get(input.peerId);
		if (previousVote) {
			if (samePhaseCheckpointProposal(previousVote, input.proposal)) {
				return { status: 'pending' };
			}
			const dispute = buildDispute({
				roomId: input.roomId,
				proposal: input.proposal,
				reason: 'equivocation',
				expectedEpoch: activePending.epoch,
				lastCommitted: committed,
			});
			rooms.set(input.roomId, { status: 'disputed', dispute });
			return { status: 'message', recipients: 'room', message: dispute };
		}

		const firstVote = activePending.votes.values().next().value;
		if (firstVote && !samePhaseCheckpointProposal(firstVote, input.proposal)) {
			const dispute = buildDispute({
				roomId: input.roomId,
				proposal: input.proposal,
				reason: 'peer_mismatch',
				expectedEpoch: activePending.epoch,
				lastCommitted: committed,
			});
			rooms.set(input.roomId, { status: 'disputed', dispute });
			return { status: 'message', recipients: 'room', message: dispute };
		}

		activePending.votes.set(input.peerId, input.proposal);
		if (activePending.votes.size < 2) {
			rooms.set(input.roomId, {
				status: 'open',
				committed,
				pending: activePending,
			});
			return { status: 'pending' };
		}

		const commit = buildPhaseCheckpointCommit({
			roomId: input.roomId,
			proposal: input.proposal,
		});
		rooms.set(input.roomId, {
			status: 'open',
			committed: commit,
			pending: null,
		});
		return { status: 'message', recipients: 'room', message: commit };
	}

	function dropRoom(roomId: string): void {
		rooms.delete(roomId);
	}

	function getStats(): {
		readonly activeRooms: number;
		readonly pendingRooms: number;
		readonly disputedRooms: number;
	} {
		let pendingRooms = 0;
		let disputedRooms = 0;
		for (const state of rooms.values()) {
			if (state.status === 'disputed') disputedRooms++;
			else if (state.pending) pendingRooms++;
		}
		return { activeRooms: rooms.size, pendingRooms, disputedRooms };
	}

	return Object.freeze({ submit, dropRoom, getStats });
}

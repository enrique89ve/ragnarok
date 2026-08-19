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

export const PHASE_CHECKPOINT_MISMATCH_STRIKE_LIMIT = 3;

type OpenRoomCheckpointState = {
	readonly status: 'open';
	readonly committed: PhaseCheckpointCommit | null;
	readonly pending: PendingCheckpoint | null;
	readonly mismatchStrikes: number;
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

function roomMatchId(state: RoomCheckpointState | undefined): string | undefined {
	if (!state) return undefined;
	if (state.status === 'disputed') return state.dispute.matchId;
	return state.committed?.matchId ?? state.pending?.votes.values().next().value?.matchId;
}

function beginSubmitRoom(
	rooms: Map<string, RoomCheckpointState>,
	roomId: string,
	proposal: PhaseCheckpointProposal,
): RoomCheckpointState | undefined {
	const current = rooms.get(roomId);
	const currentMatchId = roomMatchId(current);
	const startsNewSession = proposal.epoch === 1
		&& proposal.fromPhase === 'chess'
		&& proposal.previousCheckpointId === ZERO_PHASE_CHECKPOINT_ID
		&& currentMatchId !== undefined
		&& currentMatchId !== proposal.matchId;
	if (startsNewSession) {
		rooms.delete(roomId);
		return undefined;
	}
	return current;
}

function rejectStaleProposal(
	roomId: string,
	proposal: PhaseCheckpointProposal,
	committed: PhaseCheckpointCommit | null,
	pending: PendingCheckpoint | null,
): PhaseCheckpointCoordinatorResult | null {
	const expectedEpoch = committed ? committed.epoch + 1 : proposal.epoch;
	if (committed && proposal.epoch <= committed.epoch) {
		return proposalMatchesCommit(proposal, committed)
			? { status: 'message', recipients: 'sender', message: committed }
			: {
				status: 'message',
				recipients: 'sender',
				message: buildDispute({
					roomId,
					proposal,
					reason: 'chain_mismatch',
					expectedEpoch,
					lastCommitted: committed,
				}),
			};
	}
	if (committed && proposal.epoch !== expectedEpoch) {
		return {
			status: 'message',
			recipients: 'sender',
			message: buildDispute({
				roomId,
				proposal,
				reason: 'epoch_gap',
				expectedEpoch,
				lastCommitted: committed,
			}),
		};
	}
	const chainFailure = validateProposalChain(proposal, committed);
	if (chainFailure) {
		return {
			status: 'message',
			recipients: 'sender',
			message: buildDispute({
				roomId,
				proposal,
				reason: chainFailure,
				expectedEpoch,
				lastCommitted: committed,
			}),
		};
	}
	if (pending && pending.epoch !== proposal.epoch) {
		return {
			status: 'message',
			recipients: 'sender',
			message: buildDispute({
				roomId,
				proposal,
				reason: 'epoch_gap',
				expectedEpoch: pending.epoch,
				lastCommitted: committed,
			}),
		};
	}
	return null;
}

function applyPeerVote(input: {
	readonly rooms: Map<string, RoomCheckpointState>;
	readonly roomId: string;
	readonly peerId: string;
	readonly proposal: PhaseCheckpointProposal;
	readonly committed: PhaseCheckpointCommit | null;
	readonly pending: PendingCheckpoint | null;
	readonly mismatchStrikes: number;
}): PhaseCheckpointCoordinatorResult {
	const activePending: PendingCheckpoint = input.pending ?? {
		epoch: input.proposal.epoch,
		votes: new Map(),
	};
	const previousVote = activePending.votes.get(input.peerId);
	if (previousVote) {
		if (samePhaseCheckpointProposal(previousVote, input.proposal)) {
			return { status: 'pending' };
		}
		return {
			status: 'message',
			recipients: 'sender',
			message: buildDispute({
				roomId: input.roomId,
				proposal: input.proposal,
				reason: 'equivocation',
				expectedEpoch: activePending.epoch,
				lastCommitted: input.committed,
			}),
		};
	}

	const firstVote = activePending.votes.values().next().value;
	if (firstVote && !samePhaseCheckpointProposal(firstVote, input.proposal)) {
		const strikes = input.mismatchStrikes + 1;
		const dispute = buildDispute({
			roomId: input.roomId,
			proposal: input.proposal,
			reason: 'peer_mismatch',
			expectedEpoch: activePending.epoch,
			lastCommitted: input.committed,
		});
		if (strikes >= PHASE_CHECKPOINT_MISMATCH_STRIKE_LIMIT) {
			input.rooms.set(input.roomId, { status: 'disputed', dispute });
			return { status: 'message', recipients: 'room', message: dispute };
		}
		input.rooms.set(input.roomId, {
			status: 'open',
			committed: input.committed,
			pending: null,
			mismatchStrikes: strikes,
		});
		return { status: 'message', recipients: 'room', message: dispute };
	}

	activePending.votes.set(input.peerId, input.proposal);
	if (activePending.votes.size < 2) {
		input.rooms.set(input.roomId, {
			status: 'open',
			committed: input.committed,
			pending: activePending,
			mismatchStrikes: input.mismatchStrikes,
		});
		return { status: 'pending' };
	}

	const commit = buildPhaseCheckpointCommit({
		roomId: input.roomId,
		proposal: input.proposal,
	});
	input.rooms.set(input.roomId, {
		status: 'open',
		committed: commit,
		pending: null,
		mismatchStrikes: 0,
	});
	return { status: 'message', recipients: 'room', message: commit };
}

export function createP2PPhaseCheckpointCoordinator(): PhaseCheckpointCoordinator {
	const rooms = new Map<string, RoomCheckpointState>();

	function submit(input: {
		readonly roomId: string;
		readonly peerId: string;
		readonly proposal: PhaseCheckpointProposal;
	}): PhaseCheckpointCoordinatorResult {
		const current = beginSubmitRoom(rooms, input.roomId, input.proposal);
		if (current && current.status === 'disputed') {
			return {
				status: 'message',
				recipients: 'sender',
				message: { ...current.dispute, reason: 'room_disputed' },
			};
		}

		const committed = current?.committed ?? null;
		const stale = rejectStaleProposal(input.roomId, input.proposal, committed, current?.pending ?? null);
		if (stale) return stale;

		return applyPeerVote({
			rooms,
			roomId: input.roomId,
			peerId: input.peerId,
			proposal: input.proposal,
			committed,
			pending: current?.pending ?? null,
			mismatchStrikes: current?.mismatchStrikes ?? 0,
		});
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

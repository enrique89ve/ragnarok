/**
 * O(1) optimistic poker turn-clock notary for the WebSocket relay.
 *
 * Memory is bounded to the previous committed turn plus the current
 * pending-or-committed turn (at most two votes) per room. No gameplay
 * state or turn history is kept. Client clocks never set the deadline.
 */

import { DEFAULT_POKER_TURN_DURATION_MS } from '../../shared/p2p-wire/pokerTurnClock';
import {
	POKER_TIME_NOTARY_MISMATCH_STRIKE_LIMIT,
	buildPokerTurnNotaryCommit,
	buildPokerTurnNotaryDispute,
	pokerTurnClockIdentityFromProposal,
	samePokerTurnClockIdentity,
	type PokerActionTimeGate,
	type PokerTurnClockIdentity,
	type PokerTurnClockProposal,
	type PokerTurnNotaryDispute,
	type PokerTurnNotaryServerMessage,
} from '../../shared/p2p-wire/pokerTimeNotary';

type NotarizedTurn = {
	readonly identity: PokerTurnClockIdentity;
	readonly startedAtServerMs: number;
	readonly deadlineAtServerMs: number;
	readonly votes: Map<string, PokerTurnClockIdentity>;
	readonly status: 'pending' | 'committed';
};

type OpenRoomNotaryState = {
	readonly status: 'open';
	readonly previous: NotarizedTurn | null;
	readonly current: NotarizedTurn | null;
	readonly mismatchStrikes: number;
};

type DisputedRoomNotaryState = {
	readonly status: 'disputed';
	readonly dispute: PokerTurnNotaryDispute;
};

type RoomNotaryState = OpenRoomNotaryState | DisputedRoomNotaryState;

export type PokerTimeNotarySubmitResult =
	| { readonly status: 'pending' }
	| {
			readonly status: 'message';
			readonly recipients: 'sender' | 'room';
			readonly message: PokerTurnNotaryServerMessage;
	  };

export type PokerTimeNotaryGateReason =
	| 'missing_notary'
	| 'notary_pending'
	| 'stale_turn'
	| 'late_player_action'
	| 'premature_timeout'
	| 'room_disputed';

export type PokerTimeNotaryGateResult =
	| { readonly status: 'allow' }
	| { readonly status: 'drop'; readonly reason: PokerTimeNotaryGateReason };

export type PokerTimeNotaryCoordinator = Readonly<{
	submit: (input: {
		readonly roomId: string;
		readonly peerId: string;
		readonly proposal: PokerTurnClockProposal;
		readonly nowMs?: number;
	}) => PokerTimeNotarySubmitResult;
	gatePokerAction: (input: {
		readonly roomId: string;
		readonly action: PokerActionTimeGate;
		readonly receivedAtMs: number;
	}) => PokerTimeNotaryGateResult;
	dropRoom: (roomId: string) => void;
	getStats: () => {
		readonly activeRooms: number;
		readonly pendingRooms: number;
		readonly disputedRooms: number;
	};
}>;

function committedCopy(turn: NotarizedTurn): NotarizedTurn {
	return {
		identity: turn.identity,
		startedAtServerMs: turn.startedAtServerMs,
		deadlineAtServerMs: turn.deadlineAtServerMs,
		votes: new Map(),
		status: 'committed',
	};
}

function startPendingTurn(
	identity: PokerTurnClockIdentity,
	peerId: string,
	nowMs: number,
): NotarizedTurn {
	return {
		identity,
		startedAtServerMs: nowMs,
		deadlineAtServerMs: nowMs + DEFAULT_POKER_TURN_DURATION_MS,
		votes: new Map([[peerId, identity]]),
		status: 'pending',
	};
}

function commitMessage(
	roomId: string,
	turn: NotarizedTurn,
	nowMs: number,
): PokerTurnNotaryServerMessage {
	return buildPokerTurnNotaryCommit({
		roomId,
		identity: turn.identity,
		serverStartedAtMs: turn.startedAtServerMs,
		serverDeadlineAtMs: turn.deadlineAtServerMs,
		nowMs,
	});
}

function openRoom(
	previous: NotarizedTurn | null,
	current: NotarizedTurn | null,
	mismatchStrikes: number,
): OpenRoomNotaryState {
	return { status: 'open', previous, current, mismatchStrikes };
}

export function createP2PPokerTimeNotary(): PokerTimeNotaryCoordinator {
	const rooms = new Map<string, RoomNotaryState>();

	function freezeOrMismatch(
		roomId: string,
		room: OpenRoomNotaryState,
		turnId: string,
	): PokerTimeNotarySubmitResult {
		const strikes = room.mismatchStrikes + 1;
		const dispute = buildPokerTurnNotaryDispute({
			roomId,
			turnId,
			reason: 'peer_mismatch',
		});
		if (strikes >= POKER_TIME_NOTARY_MISMATCH_STRIKE_LIMIT) {
			rooms.set(roomId, { status: 'disputed', dispute });
			return { status: 'message', recipients: 'room', message: dispute };
		}
		const keptCurrent = room.current?.status === 'committed'
			? committedCopy(room.current)
			: null;
		rooms.set(roomId, openRoom(room.previous, keptCurrent, strikes));
		return { status: 'message', recipients: 'room', message: dispute };
	}

	function applyVote(
		roomId: string,
		room: OpenRoomNotaryState,
		peerId: string,
		identity: PokerTurnClockIdentity,
		nowMs: number,
	): PokerTimeNotarySubmitResult {
		const current = room.current;
		if (!current) return { status: 'pending' };

		const previousVote = current.votes.get(peerId);
		if (previousVote) {
			if (samePokerTurnClockIdentity(previousVote, identity)) {
				return current.status === 'committed'
					? { status: 'message', recipients: 'sender', message: commitMessage(roomId, current, nowMs) }
					: { status: 'pending' };
			}
			return {
				status: 'message',
				recipients: 'sender',
				message: buildPokerTurnNotaryDispute({
					roomId,
					turnId: current.identity.turnId,
					reason: 'equivocation',
				}),
			};
		}

		if (!samePokerTurnClockIdentity(current.identity, identity)) {
			return freezeOrMismatch(roomId, room, identity.turnId);
		}

		const votes = new Map(current.votes);
		votes.set(peerId, identity);
		if (votes.size < 2) {
			rooms.set(roomId, openRoom(room.previous, { ...current, votes }, room.mismatchStrikes));
			return { status: 'pending' };
		}

		const committed: NotarizedTurn = { ...current, votes, status: 'committed' };
		rooms.set(roomId, openRoom(room.previous, committed, 0));
		return {
			status: 'message',
			recipients: 'room',
			message: commitMessage(roomId, committed, nowMs),
		};
	}

	function submit(input: {
		readonly roomId: string;
		readonly peerId: string;
		readonly proposal: PokerTurnClockProposal;
		readonly nowMs?: number;
	}): PokerTimeNotarySubmitResult {
		const identity = pokerTurnClockIdentityFromProposal(input.proposal);
		if (!identity) {
			return {
				status: 'message',
				recipients: 'sender',
				message: buildPokerTurnNotaryDispute({
					roomId: input.roomId,
					turnId: input.proposal.turnId,
					reason: 'invalid_identity',
				}),
			};
		}

		const nowMs = input.nowMs ?? Date.now();
		const existing = rooms.get(input.roomId);
		if (existing?.status === 'disputed') {
			return {
				status: 'message',
				recipients: 'sender',
				message: { ...existing.dispute, reason: 'room_disputed' },
			};
		}

		const room = existing ?? openRoom(null, null, 0);
		if (room.previous && samePokerTurnClockIdentity(room.previous.identity, identity)) {
			return {
				status: 'message',
				recipients: 'sender',
				message: commitMessage(input.roomId, room.previous, nowMs),
			};
		}

		if (!room.current) {
			rooms.set(input.roomId, openRoom(room.previous, startPendingTurn(identity, input.peerId, nowMs), room.mismatchStrikes));
			return { status: 'pending' };
		}

		if (room.current.status === 'pending') {
			const previousVote = room.current.votes.get(input.peerId);
			if (previousVote && !samePokerTurnClockIdentity(previousVote, identity)) {
				return {
					status: 'message',
					recipients: 'sender',
					message: buildPokerTurnNotaryDispute({
						roomId: input.roomId,
						turnId: room.current.identity.turnId,
						reason: 'equivocation',
					}),
				};
			}
		}

		if (samePokerTurnClockIdentity(room.current.identity, identity)) {
			return applyVote(input.roomId, room, input.peerId, identity, nowMs);
		}

		if (room.current.status === 'pending') {
			return freezeOrMismatch(input.roomId, room, identity.turnId);
		}

		rooms.set(
			input.roomId,
			openRoom(
				committedCopy(room.current),
				startPendingTurn(identity, input.peerId, nowMs),
				room.mismatchStrikes,
			),
		);
		return { status: 'pending' };
	}

	function gatePokerAction(input: {
		readonly roomId: string;
		readonly action: PokerActionTimeGate;
		readonly receivedAtMs: number;
	}): PokerTimeNotaryGateResult {
		const state = rooms.get(input.roomId);
		if (!state) return { status: 'drop', reason: 'missing_notary' };
		if (state.status === 'disputed') return { status: 'drop', reason: 'room_disputed' };

		const turn = state.current;
		if (!turn) return { status: 'drop', reason: 'missing_notary' };
		if (turn.status !== 'committed') return { status: 'drop', reason: 'notary_pending' };
		if (input.action.turnId !== turn.identity.turnId) {
			return { status: 'drop', reason: 'stale_turn' };
		}

		if (input.action.origin === 'player') {
			return input.receivedAtMs < turn.deadlineAtServerMs
				? { status: 'allow' }
				: { status: 'drop', reason: 'late_player_action' };
		}
		return input.receivedAtMs >= turn.deadlineAtServerMs
			? { status: 'allow' }
			: { status: 'drop', reason: 'premature_timeout' };
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
			if (state.status === 'disputed') disputedRooms += 1;
			else if (state.current?.status === 'pending') pendingRooms += 1;
		}
		return { activeRooms: rooms.size, pendingRooms, disputedRooms };
	}

	return Object.freeze({ submit, gatePokerAction, dropRoom, getStats });
}

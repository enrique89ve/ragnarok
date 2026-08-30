/**
 * Deterministic competitive lifecycle for a two-peer match.
 *
 * Transport state is deliberately absent from the competitive result. The
 * transport may report that a participant is absent, but only a canonical
 * action, an explicit leave, a reconnect expiry, or a normal game result can
 * change the competitive phase.
 */

export type P2PCompetitionPhase = 'pre_battle' | 'battle' | 'resolved' | 'cancelled';
export type P2PCompetitionAbandonmentReason = 'explicit_leave' | 'reconnect_expired';

export type P2PCompetitionAcceptedAction = {
	readonly actionId: string;
	readonly actorId: string;
	/** Monotonic order in the canonical game history. */
	readonly canonicalOrder: number;
};

export type P2PCompetitionResult =
	| {
			readonly kind: 'normal';
			readonly winnerId: string | null;
			readonly loserId: string | null;
			readonly eventId: string;
			readonly canonicalOrder: number;
		}
	| {
			readonly kind: 'technical_abandonment';
			readonly winnerId: string;
			readonly loserId: string;
			readonly reason: P2PCompetitionAbandonmentReason;
			readonly eventId: string;
			readonly canonicalOrder: number;
		};

export type P2PCompetitionState = {
	readonly matchId: string;
	readonly playerA: string;
	readonly playerB: string;
	readonly phase: P2PCompetitionPhase;
	readonly absentParticipantId: string | null;
	readonly firstAcceptedAction: P2PCompetitionAcceptedAction | null;
	/** Command IDs already accepted; prevents replay with a newer UI order. */
	readonly acceptedActionIds: readonly string[];
	readonly lastCanonicalOrder: number;
	readonly terminalEventId: string | null;
	readonly result: P2PCompetitionResult | null;
};

export type P2PCompetitionEvent =
	| {
			type: 'action_accepted';
			actionId: string;
			actorId: string;
			canonicalOrder: number;
		}
	| {
			type: 'commitment_restored';
			/** Monotonic order proven by a sealed local canonical snapshot. */
			canonicalOrder: number;
		}
	| {
			type: 'disconnect_detected';
			participantId: string;
		}
	| {
			type: 'reconnect_restored';
			participantId: string;
		}
	| {
			type: 'reconnect_expired';
			participantId: string;
			eventId: string;
		}
	| {
			type: 'leave_requested';
			participantId: string;
			eventId: string;
		}
	| {
			type: 'normal_result';
			winnerId: string | null;
			loserId: string | null;
			eventId: string;
			canonicalOrder: number;
		};

function assertParticipantId(value: string, label: string): void {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${label} must be a non-empty participant id`);
	}
}

function isParticipant(state: P2PCompetitionState, participantId: string): boolean {
	return participantId === state.playerA || participantId === state.playerB;
}

function otherParticipant(state: P2PCompetitionState, participantId: string): string {
	return participantId === state.playerA ? state.playerB : state.playerA;
}

function isPositiveInteger(value: number): boolean {
	return Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function isTerminal(state: P2PCompetitionState): boolean {
	return state.phase === 'resolved' || state.phase === 'cancelled';
}

function terminalCancel(state: P2PCompetitionState, eventId: string): P2PCompetitionState {
	return {
		...state,
		phase: 'cancelled',
		absentParticipantId: null,
		terminalEventId: eventId,
		result: null,
	};
}

function terminalResult(state: P2PCompetitionState, result: P2PCompetitionResult): P2PCompetitionState {
	return {
		...state,
		phase: 'resolved',
		absentParticipantId: null,
		terminalEventId: result.eventId,
		result,
	};
}

export function createP2PCompetitionState(input: {
	readonly matchId: string;
	readonly playerA: string;
	readonly playerB: string;
}): P2PCompetitionState {
	assertParticipantId(input.matchId, 'matchId');
	assertParticipantId(input.playerA, 'playerA');
	assertParticipantId(input.playerB, 'playerB');
	if (input.playerA === input.playerB) throw new Error('playerA and playerB must differ');
	const [playerA, playerB] = input.playerA < input.playerB
		? [input.playerA, input.playerB]
		: [input.playerB, input.playerA];
	return {
		matchId: input.matchId,
		playerA,
		playerB,
		phase: 'pre_battle',
		absentParticipantId: null,
		firstAcceptedAction: null,
		acceptedActionIds: [],
		lastCanonicalOrder: 0,
		terminalEventId: null,
		result: null,
	};
}

export function bindP2PCompetitionMatchId(
	state: P2PCompetitionState,
	matchId: string,
): P2PCompetitionState {
	assertParticipantId(matchId, 'matchId');
	if (state.matchId === matchId) return state;
	return { ...state, matchId };
}

/**
 * Apply one already ordered lifecycle event. Terminal states are immutable:
 * late transport events, duplicate results, and reconnect callbacks cannot
 * rewrite a resolved or cancelled match.
 */
export function reduceP2PCompetitionLifecycle(
	state: P2PCompetitionState,
	event: P2PCompetitionEvent,
): P2PCompetitionState {
	if (isTerminal(state)) return state;

	switch (event.type) {
		case 'action_accepted': {
			if (!isParticipant(state, event.actorId) || !isNonEmptyString(event.actionId) || !isPositiveInteger(event.canonicalOrder)) {
				return state;
			}
			if (state.acceptedActionIds.includes(event.actionId) || event.canonicalOrder <= state.lastCanonicalOrder) return state;
			return {
				...state,
				phase: state.phase === 'pre_battle' ? 'battle' : state.phase,
				firstAcceptedAction: state.firstAcceptedAction ?? {
					actionId: event.actionId,
					actorId: event.actorId,
					canonicalOrder: event.canonicalOrder,
				},
				acceptedActionIds: [...state.acceptedActionIds, event.actionId],
				lastCanonicalOrder: event.canonicalOrder,
			};
		}

		case 'commitment_restored':
			if (!isPositiveInteger(event.canonicalOrder) || event.canonicalOrder < state.lastCanonicalOrder) return state;
			return {
				...state,
				phase: 'battle',
				lastCanonicalOrder: event.canonicalOrder,
			};

		case 'disconnect_detected':
			if (!isParticipant(state, event.participantId)) return state;
			if (state.absentParticipantId === event.participantId) return state;
			return { ...state, absentParticipantId: event.participantId };

		case 'reconnect_restored':
			if (state.absentParticipantId !== event.participantId) return state;
			return { ...state, absentParticipantId: null };

		case 'reconnect_expired':
			if (!isParticipant(state, event.participantId)) return state;
			if (state.absentParticipantId !== event.participantId) return state;
			if (!isNonEmptyString(event.eventId)) return state;
			if (state.phase === 'pre_battle') return terminalCancel(state, event.eventId);
			return terminalResult(state, {
				kind: 'technical_abandonment',
				winnerId: otherParticipant(state, event.participantId),
				loserId: event.participantId,
				reason: 'reconnect_expired',
				eventId: event.eventId,
				canonicalOrder: state.lastCanonicalOrder,
			});

		case 'leave_requested':
			if (!isParticipant(state, event.participantId)) return state;
			if (!isNonEmptyString(event.eventId)) return state;
			if (state.phase === 'pre_battle') return terminalCancel(state, event.eventId);
			return terminalResult(state, {
				kind: 'technical_abandonment',
				winnerId: otherParticipant(state, event.participantId),
				loserId: event.participantId,
				reason: 'explicit_leave',
				eventId: event.eventId,
				canonicalOrder: state.lastCanonicalOrder,
			});

		case 'normal_result': {
			if (!isNonEmptyString(event.eventId) || !isPositiveInteger(event.canonicalOrder) || event.canonicalOrder < state.lastCanonicalOrder) return state;
			if (event.winnerId === null || event.loserId === null) {
				if (event.winnerId !== null || event.loserId !== null) return state;
			} else if (
				!isParticipant(state, event.winnerId)
				|| !isParticipant(state, event.loserId)
				|| event.winnerId === event.loserId
			) {
				return state;
			}
			if (state.phase !== 'battle') return state;
			return terminalResult(state, {
				kind: 'normal',
				winnerId: event.winnerId,
				loserId: event.loserId,
				eventId: event.eventId,
				canonicalOrder: event.canonicalOrder,
			});
		}
	}
}

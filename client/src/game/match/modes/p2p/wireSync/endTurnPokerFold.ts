import { CombatPhase, type PokerCombatState } from '../../../../types/PokerCombatTypes';

export type EndTurnPokerFoldSide = 'player' | 'opponent';

export type EndTurnPokerFoldPlan =
	| { readonly status: 'not_required' }
	| { readonly status: 'required'; readonly playerId: string };

/**
 * End Turn is a cross-mode canonical action: the cards command advances the
 * card turn and, while a Poker decision window is live, the same actor folds.
 * Keep the eligibility rule in one pure seam so local and remote paths cannot
 * silently drift (the previous remote path omitted the Poker fold entirely).
 */
export function planEndTurnPokerFold(input: {
	readonly isActive: boolean;
	readonly combatState: PokerCombatState | null;
	readonly isTransitioningHand: boolean;
	readonly side: EndTurnPokerFoldSide;
}): EndTurnPokerFoldPlan {
	const combatState = input.combatState;
	if (
		!input.isActive
		|| !combatState
		|| combatState.phase === CombatPhase.MULLIGAN
		|| combatState.phase === CombatPhase.RESOLUTION
		|| input.isTransitioningHand
		|| !!combatState.foldWinner
	) {
		return { status: 'not_required' };
	}

	const actor = input.side === 'player' ? combatState.player : combatState.opponent;
	// Poker's BRACE is only legal as an answer to an open wager. End Turn is
	// still a valid cards action when the local wall clock has crossed the
	// deadline. End Turn is a signed cards command without a server time-gate;
	// keep this planner wall-clock-free and let the shared canonical timestamp
	// below make both peers evaluate the Poker half identically.
	if (
		combatState.activePlayerId !== actor.playerId
		|| actor.isReady
		|| combatState.currentBet <= actor.hpCommitted
	) {
		return { status: 'not_required' };
	}

	return {
		status: 'required',
		playerId: input.side === 'player'
			? combatState.player.playerId
			: combatState.opponent.playerId,
	};
}

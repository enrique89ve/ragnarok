/**
 * BettingEngine for AssemblyScript.
 * Port of client/src/game/combat/modules/BettingEngine.ts
 * Pure state machine, fully deterministic.
 */

import {
	BettingState,
	ACTION_ATTACK,
	ACTION_COUNTER_ATTACK,
	ACTION_ENGAGE,
	ACTION_BRACE,
	ACTION_DEFEND,
} from '../types/PokerTypes';

// Blind constants (HP)
export const SMALL_BLIND: i32 = 5;
export const BIG_BLIND: i32 = 10;
export const ANTE_X10: i32 = 5; // 0.5 HP × 10 for integer math

export class BettingResult {
	state: BettingState;
	isRoundComplete: bool;
	foldWinner: i32; // -1=none, 0=player won, 1=opponent won

	constructor(state: BettingState) {
		this.state = state;
		this.isRoundComplete = false;
		this.foldWinner = -1;
	}
}

/** Initialize betting state with blinds posted */
export function initializeBettingState(): BettingState {
	const state = new BettingState();
	state.pot = SMALL_BLIND + BIG_BLIND + 1; // SB + BB + 2×ante(0.5 rounded)
	state.playerBet = SMALL_BLIND;  // SB posts small blind
	state.opponentBet = BIG_BLIND;  // BB posts big blind
	state.minBet = BIG_BLIND;       // Min bet = big blind (10 HP)
	state.lastAggressor = -1;
	state.roundComplete = false;
	state.playerActed = false;
	state.opponentActed = false;
	return state;
}

/** Reset for new betting round (keep pot, reset per-round state) */
export function resetForNewRound(state: BettingState): BettingState {
	const newState = new BettingState();
	newState.pot = state.pot;
	newState.playerBet = 0;
	newState.opponentBet = 0;
	newState.minBet = BIG_BLIND;
	newState.lastAggressor = -1;
	newState.roundComplete = false;
	newState.playerActed = false;
	newState.opponentActed = false;
	return newState;
}

/** Calculate how much a player needs to call */
export function calculateCallAmount(state: BettingState, isPlayer: bool): i32 {
	if (isPlayer) {
		return state.opponentBet > state.playerBet
			? state.opponentBet - state.playerBet
			: 0;
	} else {
		return state.playerBet > state.opponentBet
			? state.playerBet - state.opponentBet
			: 0;
	}
}

/** Calculate minimum raise amount */
export function calculateMinRaise(state: BettingState): i32 {
	const currentMax = state.playerBet > state.opponentBet ? state.playerBet : state.opponentBet;
	return currentMax + state.minBet;
}

/** Check if player can afford a bet */
export function canAffordBet(hp: i32, amount: i32): bool {
	return hp >= amount;
}

/**
 * Process a betting action.
 * actor: 0=player, 1=opponent
 * action: ACTION_* constant
 * amount: HP to commit (for ATTACK/COUNTER_ATTACK)
 * actorHp: acting player's current HP
 */
export function processBettingAction(
	state: BettingState,
	actor: i32,
	action: i32,
	amount: i32,
	actorHp: i32
): BettingResult {
	const newState = new BettingState();
	newState.pot = state.pot;
	newState.playerBet = state.playerBet;
	newState.opponentBet = state.opponentBet;
	newState.minBet = state.minBet;
	newState.lastAggressor = state.lastAggressor;
	newState.roundComplete = state.roundComplete;
	newState.playerActed = state.playerActed;
	newState.opponentActed = state.opponentActed;

	const result = new BettingResult(newState);
	const isPlayer = actor == 0;

	if (action == ACTION_BRACE) {
		// Fold — opponent wins
		result.foldWinner = isPlayer ? 1 : 0;
		newState.roundComplete = true;
		result.isRoundComplete = true;
		return result;
	}

	if (action == ACTION_DEFEND) {
		// Check — only valid if no bet to call
		const callAmt = calculateCallAmount(state, isPlayer);
		if (callAmt > 0) {
			// Can't check when there's a bet — treat as call
			return processBettingAction(state, actor, ACTION_ENGAGE, 0, actorHp);
		}
		if (isPlayer) newState.playerActed = true;
		else newState.opponentActed = true;

		// Round complete if both have acted and bets are equal
		if (newState.playerActed && newState.opponentActed
			&& newState.playerBet == newState.opponentBet) {
			newState.roundComplete = true;
			result.isRoundComplete = true;
		}
		return result;
	}

	if (action == ACTION_ENGAGE) {
		// Call — match opponent's bet
		const callAmt = calculateCallAmount(state, isPlayer);
		if (isPlayer) {
			newState.playerBet += callAmt;
		} else {
			newState.opponentBet += callAmt;
		}
		newState.pot += callAmt;
		if (isPlayer) newState.playerActed = true;
		else newState.opponentActed = true;

		// Round complete after a call (bets are now equal and both acted)
		if (newState.playerBet == newState.opponentBet
			&& newState.playerActed && newState.opponentActed) {
			newState.roundComplete = true;
			result.isRoundComplete = true;
		}
		return result;
	}

	if (action == ACTION_ATTACK || action == ACTION_COUNTER_ATTACK) {
		// Bet or raise
		const prevBet = isPlayer ? state.playerBet : state.opponentBet;
		const newBet = amount > prevBet ? amount : prevBet + state.minBet;
		const betIncrease = newBet - prevBet;

		if (!canAffordBet(actorHp, betIncrease)) {
			// All-in: bet whatever they have left
			if (isPlayer) {
				newState.playerBet += actorHp;
				newState.pot += actorHp;
			} else {
				newState.opponentBet += actorHp;
				newState.pot += actorHp;
			}
		} else {
			if (isPlayer) {
				newState.playerBet = newBet;
			} else {
				newState.opponentBet = newBet;
			}
			newState.pot += betIncrease;
		}

		newState.lastAggressor = actor;
		if (isPlayer) {
			newState.playerActed = true;
			newState.opponentActed = false; // Opponent must respond
		} else {
			newState.opponentActed = true;
			newState.playerActed = false; // Player must respond
		}
		return result;
	}

	return result;
}

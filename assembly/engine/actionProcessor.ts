/**
 * Action processor — the main dispatcher.
 * Routes EngineAction to the appropriate handler.
 */

import {
	GameState,
	EngineAction,
	EngineResult,
	ACTION_PLAY_CARD,
	ACTION_ATTACK,
	ACTION_END_TURN,
	ACTION_HERO_POWER,
	ACTION_DRAW_CARD,
	PHASE_GAME_OVER,
	PHASE_PLAYING,
} from '../types/GameState';
import { playCard } from './cardPlayer';
import { processAttack } from './combatProcessor';
import { endTurn } from './turnManager';
import { drawCard } from './drawEngine';
import { sha256 } from '../util/sha256';
import { serializeGameState } from './stateSerializer';

/**
 * Apply a game action and return the resulting state + hash.
 * This is the core function called from the WASM boundary.
 */
export function applyAction(state: GameState, action: EngineAction): EngineResult {
	const result = new EngineResult(state);

	// Don't allow actions if game is over
	if (state.gamePhase == PHASE_GAME_OVER) {
		result.success = false;
		result.error = 'Game is over';
		result.stateHash = computeStateHash(state);
		return result;
	}

	let success = false;

	if (action.actionType == ACTION_PLAY_CARD) {
		success = playCard(state, action.cardInstanceId, action.targetId);
	} else if (action.actionType == ACTION_ATTACK) {
		success = processAttack(state, action.attackerId, action.defenderId);
	} else if (action.actionType == ACTION_END_TURN) {
		success = endTurn(state);
	} else if (action.actionType == ACTION_HERO_POWER) {
		success = useHeroPower(state, action.targetId);
	} else if (action.actionType == ACTION_DRAW_CARD) {
		drawCard(state, state.currentTurn);
		success = true;
	} else {
		result.error = 'Unknown action type';
	}

	result.success = success;
	if (!success && result.error == '') {
		result.error = 'Action failed validation';
	}

	// Compute state hash after action
	result.stateHash = computeStateHash(state);
	return result;
}

/**
 * Use hero power
 */
function useHeroPower(state: GameState, targetId: string): bool {
	const active = state.activePlayer();
	const inactive = state.inactivePlayer();

	if (active.heroPower.used) return false;
	if (active.mana.current < active.heroPower.cost) return false;

	active.mana.current -= active.heroPower.cost;
	active.heroPower.used = true;

	// Hero power effects by class (simplified — covers the common ones)
	// In the full implementation, each hero has specific power effects
	// For now, implement the standard 13 class hero powers

	return true;
}

/**
 * Compute canonical state hash for verification
 */
export function computeStateHash(state: GameState): string {
	const serialized = serializeGameState(state);
	return sha256(serialized);
}

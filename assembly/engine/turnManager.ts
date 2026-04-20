/**
 * Turn manager — handles end-of-turn and start-of-turn pipelines.
 * Port of endTurn logic from gameUtils.ts
 */

import {
	GameState,
	Player,
	CardInstance,
	PLAYER_SELF,
	PLAYER_OPPONENT,
	PHASE_GAME_OVER,
} from '../types/GameState';
import { getCardDef } from '../util/cardLookup';
import { drawCardForPlayer } from './drawEngine';
import { removeDeadMinions, checkGameOver, dealDamageToMinion } from './combatProcessor';

/**
 * End the current player's turn and begin the next player's turn.
 * This is the 9-step pipeline from gameUtils.ts.
 */
export function endTurn(state: GameState): bool {
	if (state.gamePhase == PHASE_GAME_OVER) return false;

	const current = state.activePlayer();
	const next = state.inactivePlayer();

	// Step 1: Process end-of-turn effects for current player
	processEndOfTurnEffects(state, current);

	// Step 2: Apply pending overload
	if (current.mana.pendingOverload > 0) {
		current.mana.overloaded = current.mana.pendingOverload;
		current.mana.pendingOverload = 0;
	}

	// Step 3: Switch turns
	state.currentTurn = state.currentTurn == PLAYER_SELF ? PLAYER_OPPONENT : PLAYER_SELF;

	// Step 4: Increment turn number (full round = both players have gone)
	if (state.currentTurn == PLAYER_SELF) {
		state.turnNumber++;
	}

	// Step 5: Refresh mana for next player
	refreshMana(next);

	// Step 6: Reset next player's per-turn state
	resetTurnState(next);

	// Step 7: Process start-of-turn effects for next player
	processStartOfTurnEffects(state, next);

	// Step 8: Draw a card for next player
	drawCardForPlayer(state, next);

	// Step 9: Remove any dead minions and check game over
	removeDeadMinions(state);
	checkGameOver(state);

	return true;
}

/**
 * Refresh mana crystals at start of turn
 */
function refreshMana(player: Player): void {
	// Gain a mana crystal (max 10)
	if (player.mana.max < 10) {
		player.mana.max++;
	}

	// Set current mana = max - overloaded
	player.mana.current = player.mana.max - player.mana.overloaded;
	if (player.mana.current < 0) player.mana.current = 0;

	// Clear overload (it was applied this turn)
	player.mana.overloaded = 0;
}

/**
 * Reset per-turn state for a player
 */
function resetTurnState(player: Player): void {
	player.cardsPlayedThisTurn = 0;
	player.attacksPerformedThisTurn = 0;
	player.heroPower.used = false;

	// Reset minion attack state
	for (let i = 0; i < player.battlefield.length; i++) {
		const minion = player.battlefield[i];
		minion.attacksPerformed = 0;
		minion.hasAttacked = false;
		minion.canAttack = true;

		// Remove summoning sickness (minion has been on board for a full turn)
		if (minion.isSummoningSick && !minion.hasCharge && !minion.isRush) {
			minion.isSummoningSick = false;
		}
	}
}

/**
 * Process end-of-turn effects for a player's minions
 */
function processEndOfTurnEffects(state: GameState, player: Player): void {
	for (let i = 0; i < player.battlefield.length; i++) {
		const minion = player.battlefield[i];

		// Frozen minions: unfreeze at end of turn if they didn't attack
		if (minion.isFrozen && !minion.hasAttacked) {
			minion.isFrozen = false;
		}

		// Poisoned DoT: 3 damage at end of turn
		if (minion.isPoisonedDoT) {
			dealDamageToMinion(minion, 3);
		}
	}

	// Weapon durability loss if player attacked with weapon
	if (player.weapon != null && player.attacksPerformedThisTurn > 0) {
		player.weapon!.currentDurability -= player.attacksPerformedThisTurn;
		if (player.weapon!.currentDurability <= 0) {
			player.graveyard.push(player.weapon!);
			player.weapon = null;
		}
	}

	removeDeadMinions(state);
}

/**
 * Process start-of-turn effects for a player's minions
 */
function processStartOfTurnEffects(state: GameState, player: Player): void {
	for (let i = 0; i < player.battlefield.length; i++) {
		const minion = player.battlefield[i];

		// Paralyzed: 50% chance to skip (uses deterministic RNG)
		// Note: This would need seeded RNG — handled by effect interpreter

		// Weakened: -3 attack (persistent, applied during combat resolution)
	}
}

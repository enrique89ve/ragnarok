/**
 * Combat processor — handles attack resolution.
 * Port of processAttack from gameUtils.ts
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
import { SeededRng } from '../util/seededRng';

/** Maximum attacks per turn (normal=1, windfury=2, mega_windfury=4) */
function getMaxAttacks(instance: CardInstance): i32 {
	if (instance.hasMegaWindfury) return 4;
	if (instance.hasWindfury) return 2;
	return 1;
}

/**
 * Check if a minion can legally attack
 */
export function canMinionAttack(attacker: CardInstance, player: Player): bool {
	if (attacker.isFrozen) return false;
	if (attacker.isSummoningSick && !attacker.hasCharge && !attacker.isRush) return false;
	if (attacker.currentAttack <= 0) return false;
	if (attacker.attacksPerformed >= getMaxAttacks(attacker)) return false;
	return true;
}

/**
 * Check if a target is valid (respects taunt)
 */
export function isValidTarget(
	defender: CardInstance | null,
	targetIsHero: bool,
	opponent: Player,
	attacker: CardInstance
): bool {
	// Check if opponent has taunt minions
	let hasTaunt = false;
	for (let i = 0; i < opponent.battlefield.length; i++) {
		if (opponent.battlefield[i].isTaunt && !opponent.battlefield[i].isStealth) {
			hasTaunt = true;
			break;
		}
	}

	if (hasTaunt) {
		// Must attack a taunt minion
		if (targetIsHero) return false;
		if (defender != null && !defender!.isTaunt) return false;
	}

	// Rush minions can only attack minions on the turn they were summoned
	if (attacker.isRush && attacker.isSummoningSick) {
		if (targetIsHero) return false;
	}

	return true;
}

/**
 * Deal damage to a minion, accounting for divine shield and status effects
 */
export function dealDamageToMinion(target: CardInstance, amount: i32): i32 {
	if (amount <= 0) return 0;

	// Vulnerability: +3 damage taken
	let effectiveAmount = amount;
	if (target.isVulnerable) effectiveAmount += 3;
	// Bleeding: +3 damage taken
	if (target.isBleeding) effectiveAmount += 3;

	if (target.hasDivineShield) {
		target.hasDivineShield = false;
		return 0;
	}

	target.currentHealth -= effectiveAmount;
	return effectiveAmount;
}

/**
 * Deal damage to a hero, reducing armor first
 */
export function dealDamageToHero(player: Player, amount: i32): i32 {
	if (amount <= 0) return 0;

	let remaining = amount;
	if (player.heroArmor > 0) {
		if (player.heroArmor >= remaining) {
			player.heroArmor -= remaining;
			return 0;
		}
		remaining -= player.heroArmor;
		player.heroArmor = 0;
	}

	player.heroHealth -= remaining;
	player.health -= remaining;
	return remaining;
}

/**
 * Remove dead minions from both players' battlefields.
 * Returns arrays of dead minion instances for deathrattle processing.
 */
export function removeDeadMinions(state: GameState): CardInstance[] {
	const dead: CardInstance[] = [];

	// Check player battlefield
	let i = state.player.battlefield.length - 1;
	while (i >= 0) {
		if (state.player.battlefield[i].currentHealth <= 0) {
			const removed = state.player.battlefield.splice(i, 1);
			dead.push(removed[0]);
			state.player.graveyard.push(removed[0]);
		}
		i--;
	}

	// Check opponent battlefield
	i = state.opponent.battlefield.length - 1;
	while (i >= 0) {
		if (state.opponent.battlefield[i].currentHealth <= 0) {
			const removed = state.opponent.battlefield.splice(i, 1);
			dead.push(removed[0]);
			state.opponent.graveyard.push(removed[0]);
		}
		i--;
	}

	return dead;
}

/**
 * Check if the game is over (either player at 0 or less health)
 */
export function checkGameOver(state: GameState): void {
	if (state.player.heroHealth <= 0 && state.opponent.heroHealth <= 0) {
		// Both dead — it's a draw, but opponent wins (attacker disadvantage)
		state.gamePhase = PHASE_GAME_OVER;
		state.winner = PLAYER_OPPONENT;
	} else if (state.player.heroHealth <= 0) {
		state.gamePhase = PHASE_GAME_OVER;
		state.winner = PLAYER_OPPONENT;
	} else if (state.opponent.heroHealth <= 0) {
		state.gamePhase = PHASE_GAME_OVER;
		state.winner = PLAYER_SELF;
	}
}

/**
 * Process an attack from one minion to another minion or hero.
 * This is the main combat resolution function.
 */
export function processAttack(
	state: GameState,
	attackerInstanceId: string,
	defenderInstanceId: string
): bool {
	const active = state.activePlayer();
	const inactive = state.inactivePlayer();

	// Find attacker on active player's battlefield
	let attacker: CardInstance | null = null;
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == attackerInstanceId) {
			attacker = active.battlefield[i];
			break;
		}
	}
	if (attacker == null) return false;
	if (!canMinionAttack(attacker!, active)) return false;

	// Determine if targeting hero or a minion
	const targetIsHero = defenderInstanceId == 'hero' || defenderInstanceId == '';
	let defender: CardInstance | null = null;

	if (!targetIsHero) {
		for (let i = 0; i < inactive.battlefield.length; i++) {
			if (inactive.battlefield[i].instanceId == defenderInstanceId) {
				defender = inactive.battlefield[i];
				break;
			}
		}
		if (defender == null) return false;
	}

	if (!isValidTarget(defender, targetIsHero, inactive, attacker!)) return false;

	// Weakened: -3 attack
	let attackerDamage = attacker!.currentAttack;
	if (attacker!.isWeakened) attackerDamage -= 3;
	if (attackerDamage < 0) attackerDamage = 0;

	if (targetIsHero) {
		// Attack hero
		dealDamageToHero(inactive, attackerDamage);

		// Lifesteal: heal attacking player's hero
		if (attacker!.hasLifesteal) {
			active.heroHealth += attackerDamage;
			active.health += attackerDamage;
			if (active.heroHealth > active.maxHealth) {
				active.heroHealth = active.maxHealth;
				active.health = active.maxHealth;
			}
		}
	} else {
		// Minion vs minion combat
		const defenderDamage = defender!.currentAttack;

		dealDamageToMinion(defender!, attackerDamage);
		dealDamageToMinion(attacker!, defenderDamage);

		// Poisonous: instant kill
		if (attacker!.hasPoisonous && defender!.currentHealth > 0) {
			defender!.currentHealth = 0;
		}
		if (defender != null && defender!.hasPoisonous && attacker!.currentHealth > 0) {
			attacker!.currentHealth = 0;
		}

		// Lifesteal
		if (attacker!.hasLifesteal) {
			active.heroHealth += attackerDamage;
			active.health += attackerDamage;
			if (active.heroHealth > active.maxHealth) {
				active.heroHealth = active.maxHealth;
				active.health = active.maxHealth;
			}
		}
	}

	// Mark attack performed
	attacker!.attacksPerformed++;
	attacker!.hasAttacked = true;
	if (attacker!.attacksPerformed >= getMaxAttacks(attacker!)) {
		attacker!.canAttack = false;
	}

	// Stealth is lost after attacking
	if (attacker!.isStealth) attacker!.isStealth = false;

	// Remove dead minions
	removeDeadMinions(state);

	// Check game over
	checkGameOver(state);

	return true;
}

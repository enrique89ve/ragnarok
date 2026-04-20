/**
 * Parameterized effect interpreter.
 * Dispatches effect definitions to pattern functions.
 * Covers all 182 handlers through ~20 generic patterns.
 */

import {
	GameState,
	Player,
	CardInstance,
	EffectDef,
	PLAYER_SELF,
} from '../types/GameState';
import { getCardDef } from '../util/cardLookup';
import {
	dealDamageToMinion,
	dealDamageToHero,
	removeDeadMinions,
} from '../engine/combatProcessor';
import { drawCardForPlayer } from '../engine/drawEngine';
import { SeededRng } from '../util/seededRng';

/**
 * Execute an effect based on its pattern type.
 * This is the main dispatcher that replaces 182 individual handler files.
 */
export function executeEffect(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	source: CardInstance,
	targetId: string
): void {
	const pattern = effect.pattern;

	if (pattern == 'damage') applyDamage(state, active, inactive, effect, targetId);
	else if (pattern == 'aoe_damage') applyAoeDamage(state, active, inactive, effect);
	else if (pattern == 'heal') applyHeal(state, active, inactive, effect, targetId);
	else if (pattern == 'buff') applyBuff(state, active, inactive, effect, targetId);
	else if (pattern == 'buff_adjacent') applyBuffAdjacent(state, active, effect, source);
	else if (pattern == 'draw') applyDraw(state, active, effect);
	else if (pattern == 'summon') applySummon(state, active, effect);
	else if (pattern == 'destroy') applyDestroy(state, active, inactive, effect, targetId);
	else if (pattern == 'transform') applyTransform(state, active, inactive, effect, targetId);
	else if (pattern == 'gain_armor') applyGainArmor(active, effect);
	else if (pattern == 'grant_keyword') applyGrantKeyword(state, active, inactive, effect, targetId);
	else if (pattern == 'set_stats') applySetStats(state, active, inactive, effect, targetId);
	else if (pattern == 'freeze') applyFreeze(state, active, inactive, effect, targetId);
	else if (pattern == 'silence') applySilence(state, active, inactive, effect, targetId);
	else if (pattern == 'modify_mana') applyModifyMana(active, effect);
	else if (pattern == 'return_to_hand') applyReturnToHand(state, active, inactive, effect, targetId);
	else if (pattern == 'copy_to_hand') applyCopyToHand(state, active, inactive, effect, targetId);
	else if (pattern == 'damage_all') applyDamageAll(state, effect);
	else if (pattern == 'random_damage') applyRandomDamage(state, active, inactive, effect);
	else if (pattern == 'conditional') applyConditional(state, active, inactive, effect, source, targetId);
	// Unknown patterns are silently ignored (forward-compatible)
}

// ============================================================
// Pattern implementations
// ============================================================

/** Deal damage to a specific target */
function applyDamage(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const amount = effect.value;

	if (effect.targetType == 'hero' || targetId == 'hero') {
		dealDamageToHero(inactive, amount);
		return;
	}

	// Find target minion on opponent's battlefield
	for (let i = 0; i < inactive.battlefield.length; i++) {
		if (inactive.battlefield[i].instanceId == targetId) {
			dealDamageToMinion(inactive.battlefield[i], amount);
			return;
		}
	}
	// Also check friendly battlefield (for self-damage effects)
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == targetId) {
			dealDamageToMinion(active.battlefield[i], amount);
			return;
		}
	}
}

/** Deal damage to all enemy minions (AoE) */
function applyAoeDamage(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef
): void {
	const amount = effect.value;

	if (effect.targetType == 'all_minions') {
		// Damage ALL minions (both sides)
		for (let i = 0; i < active.battlefield.length; i++) {
			dealDamageToMinion(active.battlefield[i], amount);
		}
		for (let i = 0; i < inactive.battlefield.length; i++) {
			dealDamageToMinion(inactive.battlefield[i], amount);
		}
	} else {
		// Damage opponent's minions only
		for (let i = 0; i < inactive.battlefield.length; i++) {
			dealDamageToMinion(inactive.battlefield[i], amount);
		}
	}
}

/** Heal a target */
function applyHeal(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const amount = effect.value;

	if (effect.targetType == 'hero' || targetId == 'hero' || targetId == '') {
		// Heal friendly hero
		active.heroHealth += amount;
		active.health += amount;
		if (active.heroHealth > active.maxHealth) {
			active.heroHealth = active.maxHealth;
			active.health = active.maxHealth;
		}
		return;
	}

	// Heal a minion
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == targetId) {
			active.battlefield[i].currentHealth += amount;
			if (active.battlefield[i].currentHealth > active.battlefield[i].maxHealth) {
				active.battlefield[i].currentHealth = active.battlefield[i].maxHealth;
			}
			return;
		}
	}
}

/** Buff a target minion's stats */
function applyBuff(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const attackBuff = effect.value;
	const healthBuff = effect.value2;

	if (effect.targetType == 'all_friendly') {
		// Buff all friendly minions
		for (let i = 0; i < active.battlefield.length; i++) {
			active.battlefield[i].currentAttack += attackBuff;
			active.battlefield[i].currentHealth += healthBuff;
			active.battlefield[i].maxHealth += healthBuff;
		}
		return;
	}

	// Buff specific target
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == targetId) {
			active.battlefield[i].currentAttack += attackBuff;
			active.battlefield[i].currentHealth += healthBuff;
			active.battlefield[i].maxHealth += healthBuff;
			return;
		}
	}
}

/** Buff minions adjacent to the source */
function applyBuffAdjacent(
	state: GameState,
	active: Player,
	effect: EffectDef,
	source: CardInstance
): void {
	let sourceIndex: i32 = -1;
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == source.instanceId) {
			sourceIndex = i;
			break;
		}
	}
	if (sourceIndex == -1) return;

	if (sourceIndex > 0) {
		active.battlefield[sourceIndex - 1].currentAttack += effect.value;
		active.battlefield[sourceIndex - 1].currentHealth += effect.value2;
		active.battlefield[sourceIndex - 1].maxHealth += effect.value2;
	}
	if (sourceIndex < active.battlefield.length - 1) {
		active.battlefield[sourceIndex + 1].currentAttack += effect.value;
		active.battlefield[sourceIndex + 1].currentHealth += effect.value2;
		active.battlefield[sourceIndex + 1].maxHealth += effect.value2;
	}
}

/** Draw cards */
function applyDraw(state: GameState, active: Player, effect: EffectDef): void {
	const count = effect.value > 0 ? effect.value : 1;
	for (let i: i32 = 0; i < count; i++) {
		drawCardForPlayer(state, active);
	}
}

/** Summon token minions */
function applySummon(state: GameState, active: Player, effect: EffectDef): void {
	const cardId = effect.cardId;
	const count = effect.count > 0 ? effect.count : 1;
	const cardDef = getCardDef(cardId);

	for (let i: i32 = 0; i < count; i++) {
		if (active.battlefield.length >= 5) break; // Max battlefield

		const instance = new CardInstance(state.nextInstanceId(), cardId);
		if (cardDef != null) {
			instance.currentAttack = cardDef.attack;
			instance.currentHealth = cardDef.health;
			instance.maxHealth = cardDef.health;
			instance.isPlayerOwned = active.id == 0;

			// Apply keywords
			for (let k = 0; k < cardDef.keywords.length; k++) {
				const kw = cardDef.keywords[k];
				if (kw == 'taunt') instance.isTaunt = true;
				else if (kw == 'charge') {
					instance.hasCharge = true;
					instance.isSummoningSick = false;
					instance.canAttack = true;
				}
				else if (kw == 'rush') {
					instance.isRush = true;
					instance.isSummoningSick = false;
					instance.canAttack = true;
				}
				else if (kw == 'divine_shield') instance.hasDivineShield = true;
				else if (kw == 'stealth') instance.isStealth = true;
				else if (kw == 'windfury') instance.hasWindfury = true;
				else if (kw == 'lifesteal') instance.hasLifesteal = true;
				else if (kw == 'poisonous') instance.hasPoisonous = true;
			}
		}

		instance.isSummoningSick = true;
		active.battlefield.push(instance);
	}
}

/** Destroy a target minion */
function applyDestroy(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	// Check opponent's battlefield
	for (let i = 0; i < inactive.battlefield.length; i++) {
		if (inactive.battlefield[i].instanceId == targetId) {
			inactive.battlefield[i].currentHealth = 0;
			return;
		}
	}
	// Check friendly battlefield
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == targetId) {
			active.battlefield[i].currentHealth = 0;
			return;
		}
	}
}

/** Transform a minion into a different card */
function applyTransform(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const newCardId = effect.cardId;
	const newDef = getCardDef(newCardId);
	if (newDef == null) return;

	// Find target on either battlefield
	const battlefields: Player[] = [active, inactive];
	for (let b = 0; b < battlefields.length; b++) {
		const bf = battlefields[b].battlefield;
		for (let i = 0; i < bf.length; i++) {
			if (bf[i].instanceId == targetId) {
				// Replace with new card
				const newInstance = new CardInstance(state.nextInstanceId(), newCardId);
				newInstance.currentAttack = newDef.attack;
				newInstance.currentHealth = newDef.health;
				newInstance.maxHealth = newDef.health;
				newInstance.isPlayerOwned = bf[i].isPlayerOwned;
				newInstance.isSummoningSick = true;
				bf[i] = newInstance;
				return;
			}
		}
	}
}

/** Gain armor for hero */
function applyGainArmor(active: Player, effect: EffectDef): void {
	active.heroArmor += effect.value;
}

/** Grant a keyword to a target minion */
function applyGrantKeyword(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const keywords = effect.keywords;

	for (let b = 0; b < active.battlefield.length; b++) {
		if (active.battlefield[b].instanceId == targetId) {
			applyKeywords(active.battlefield[b], keywords);
			return;
		}
	}
}

function applyKeywords(minion: CardInstance, keywords: string[]): void {
	for (let i = 0; i < keywords.length; i++) {
		const kw = keywords[i];
		if (kw == 'taunt') minion.isTaunt = true;
		else if (kw == 'divine_shield') minion.hasDivineShield = true;
		else if (kw == 'stealth') minion.isStealth = true;
		else if (kw == 'windfury') minion.hasWindfury = true;
		else if (kw == 'lifesteal') minion.hasLifesteal = true;
		else if (kw == 'poisonous') minion.hasPoisonous = true;
		else if (kw == 'charge') {
			minion.hasCharge = true;
			minion.isSummoningSick = false;
			minion.canAttack = true;
		}
		else if (kw == 'rush') {
			minion.isRush = true;
			minion.isSummoningSick = false;
			minion.canAttack = true;
		}
	}
}

/** Set stats of a target minion */
function applySetStats(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	for (let i = 0; i < active.battlefield.length; i++) {
		if (active.battlefield[i].instanceId == targetId) {
			active.battlefield[i].currentAttack = effect.value;
			active.battlefield[i].currentHealth = effect.value2;
			active.battlefield[i].maxHealth = effect.value2;
			return;
		}
	}
	for (let i = 0; i < inactive.battlefield.length; i++) {
		if (inactive.battlefield[i].instanceId == targetId) {
			inactive.battlefield[i].currentAttack = effect.value;
			inactive.battlefield[i].currentHealth = effect.value2;
			inactive.battlefield[i].maxHealth = effect.value2;
			return;
		}
	}
}

/** Freeze a target */
function applyFreeze(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	if (effect.targetType == 'all_enemy') {
		for (let i = 0; i < inactive.battlefield.length; i++) {
			inactive.battlefield[i].isFrozen = true;
		}
		return;
	}

	for (let i = 0; i < inactive.battlefield.length; i++) {
		if (inactive.battlefield[i].instanceId == targetId) {
			inactive.battlefield[i].isFrozen = true;
			return;
		}
	}
}

/** Silence a minion (remove all effects) */
function applySilence(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const battlefields: Player[] = [active, inactive];
	for (let b = 0; b < battlefields.length; b++) {
		const bf = battlefields[b].battlefield;
		for (let i = 0; i < bf.length; i++) {
			if (bf[i].instanceId == targetId) {
				const m = bf[i];
				m.silenced = true;
				m.isTaunt = false;
				m.hasDivineShield = false;
				m.isStealth = false;
				m.hasWindfury = false;
				m.hasMegaWindfury = false;
				m.hasLifesteal = false;
				m.hasPoisonous = false;
				m.hasCharge = false;
				m.isRush = false;
				m.isFrozen = false;
				m.isPoisonedDoT = false;
				m.isBleeding = false;
				m.isParalyzed = false;
				m.isWeakened = false;
				m.isVulnerable = false;
				m.isMarked = false;
				return;
			}
		}
	}
}

/** Modify mana crystals */
function applyModifyMana(active: Player, effect: EffectDef): void {
	if (effect.targetType == 'gain') {
		active.mana.current += effect.value;
		if (active.mana.current > active.mana.max) {
			active.mana.current = active.mana.max;
		}
	} else if (effect.targetType == 'gain_max') {
		active.mana.max += effect.value;
		if (active.mana.max > 10) active.mana.max = 10;
		active.mana.current += effect.value;
	} else if (effect.targetType == 'set') {
		active.mana.current = effect.value;
	}
}

/** Return a minion to its owner's hand */
function applyReturnToHand(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	const battlefields: Player[] = [active, inactive];
	for (let b = 0; b < battlefields.length; b++) {
		const owner = battlefields[b];
		for (let i = 0; i < owner.battlefield.length; i++) {
			if (owner.battlefield[i].instanceId == targetId) {
				if (owner.hand.length < 7) {
					owner.hand.push(owner.battlefield[i]);
				}
				owner.battlefield.splice(i, 1);
				return;
			}
		}
	}
}

/** Copy a minion to hand */
function applyCopyToHand(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	targetId: string
): void {
	if (active.hand.length >= 7) return;

	const battlefields: Player[] = [active, inactive];
	for (let b = 0; b < battlefields.length; b++) {
		for (let i = 0; i < battlefields[b].battlefield.length; i++) {
			if (battlefields[b].battlefield[i].instanceId == targetId) {
				const original = battlefields[b].battlefield[i];
				const copy = new CardInstance(state.nextInstanceId(), original.cardId);
				const cardDef = getCardDef(original.cardId);
				if (cardDef != null) {
					copy.currentAttack = cardDef.attack;
					copy.currentHealth = cardDef.health;
					copy.maxHealth = cardDef.health;
				}
				copy.isPlayerOwned = active.id == 0;
				active.hand.push(copy);
				return;
			}
		}
	}
}

/** Damage all minions and heroes */
function applyDamageAll(state: GameState, effect: EffectDef): void {
	const amount = effect.value;
	for (let i = 0; i < state.player.battlefield.length; i++) {
		dealDamageToMinion(state.player.battlefield[i], amount);
	}
	for (let i = 0; i < state.opponent.battlefield.length; i++) {
		dealDamageToMinion(state.opponent.battlefield[i], amount);
	}
	dealDamageToHero(state.player, amount);
	dealDamageToHero(state.opponent, amount);
}

/** Deal damage to a random enemy minion */
function applyRandomDamage(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef
): void {
	if (inactive.battlefield.length == 0) return;

	// Use seeded RNG from state
	const rng = new SeededRng(state.rngState);
	const targetIndex = rng.nextInt(inactive.battlefield.length);
	state.rngState = rng.getState();

	dealDamageToMinion(inactive.battlefield[targetIndex], effect.value);
}

/** Conditional effect: check condition, then apply sub-effect */
function applyConditional(
	state: GameState,
	active: Player,
	inactive: Player,
	effect: EffectDef,
	source: CardInstance,
	targetId: string
): void {
	let conditionMet = false;

	if (effect.condition == 'combo') {
		conditionMet = active.cardsPlayedThisTurn >= 2;
	} else if (effect.condition == 'if_damaged') {
		conditionMet = active.heroHealth < active.maxHealth;
	} else if (effect.condition == 'if_hand_empty') {
		conditionMet = active.hand.length == 0;
	} else if (effect.condition == 'if_board_empty') {
		conditionMet = active.battlefield.length == 0;
	}

	// If condition met, apply as a regular effect with the sub-pattern
	// The condition field becomes 'none' to prevent infinite recursion
	if (conditionMet) {
		const subEffect = new EffectDef();
		subEffect.pattern = effect.targetType; // targetType doubles as sub-pattern for conditionals
		subEffect.value = effect.value;
		subEffect.value2 = effect.value2;
		subEffect.targetType = 'enemy_minion';
		subEffect.condition = 'none';
		subEffect.keywords = effect.keywords;
		subEffect.cardId = effect.cardId;
		subEffect.count = effect.count;
		executeEffect(state, active, inactive, subEffect, source, targetId);
	}
}

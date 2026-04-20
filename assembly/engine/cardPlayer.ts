/**
 * Card player — handles playing cards from hand.
 * Port of playCard logic from gameUtils.ts
 */

import {
	GameState,
	Player,
	CardInstance,
	CardDef,
	PLAYER_SELF,
	CARD_TYPE_MINION,
	CARD_TYPE_SPELL,
	CARD_TYPE_WEAPON,
	CARD_TYPE_SECRET,
	CARD_TYPE_ARTIFACT,
	CARD_TYPE_ARMOR,
} from '../types/GameState';
import { getCardDef } from '../util/cardLookup';
import { executeEffect } from '../effects/effectInterpreter';
import { removeDeadMinions, checkGameOver } from './combatProcessor';

/** Maximum minions on battlefield */
export const MAX_BATTLEFIELD: i32 = 5;

/**
 * Play a card from hand.
 * Validates mana cost, removes from hand, applies effect.
 * Returns true if successful.
 */
export function playCard(
	state: GameState,
	cardInstanceId: string,
	targetId: string
): bool {
	const active = state.activePlayer();
	const inactive = state.inactivePlayer();

	// Find card in hand
	let cardIndex: i32 = -1;
	for (let i = 0; i < active.hand.length; i++) {
		if (active.hand[i].instanceId == cardInstanceId) {
			cardIndex = i;
			break;
		}
	}
	if (cardIndex == -1) return false;

	const cardInstance = active.hand[cardIndex];
	const cardDef = getCardDef(cardInstance.cardId);
	if (cardDef == null) return false;

	// Check mana cost
	if (active.mana.current < cardDef.manaCost) return false;

	// Type-specific validation
	if (cardDef.cardType == CARD_TYPE_MINION) {
		if (active.battlefield.length >= MAX_BATTLEFIELD) return false;
	}

	// Deduct mana
	active.mana.current -= cardDef.manaCost;

	// Remove from hand
	active.hand.splice(cardIndex, 1);

	// Apply overload
	if (cardDef.overload > 0) {
		active.mana.pendingOverload += cardDef.overload;
	}

	// Type-specific placement
	if (cardDef.cardType == CARD_TYPE_MINION) {
		playMinion(state, active, inactive, cardInstance, cardDef, targetId);
	} else if (cardDef.cardType == CARD_TYPE_SPELL) {
		playSpell(state, active, inactive, cardInstance, cardDef, targetId);
	} else if (cardDef.cardType == CARD_TYPE_WEAPON) {
		equipWeapon(active, cardInstance, cardDef);
	} else if (cardDef.cardType == CARD_TYPE_SECRET) {
		active.secrets.push(cardInstance);
	} else if (cardDef.cardType == CARD_TYPE_ARTIFACT) {
		active.artifact = cardInstance;
	} else if (cardDef.cardType == CARD_TYPE_ARMOR) {
		// Armor equip handled by armor system
	}

	// Track cards played this turn (for Combo mechanic)
	active.cardsPlayedThisTurn++;

	// Execute combo effect if applicable
	if (active.cardsPlayedThisTurn >= 2 && cardDef.combo != null) {
		executeEffect(state, active, inactive, cardDef.combo!, cardInstance, targetId);
	}

	// Remove dead minions after all effects
	removeDeadMinions(state);
	checkGameOver(state);

	return true;
}

/**
 * Place a minion on the battlefield and trigger battlecry
 */
function playMinion(
	state: GameState,
	active: Player,
	inactive: Player,
	instance: CardInstance,
	cardDef: CardDef,
	targetId: string
): void {
	// Set summoning sickness (unless charge/rush)
	if (!instance.hasCharge) {
		instance.isSummoningSick = true;
		instance.canAttack = instance.isRush; // Rush can attack minions
	} else {
		instance.isSummoningSick = false;
		instance.canAttack = true;
	}

	// Place on battlefield
	active.battlefield.push(instance);

	// Trigger battlecry
	if (cardDef.battlecry != null) {
		executeEffect(state, active, inactive, cardDef.battlecry!, instance, targetId);
	}
}

/**
 * Cast a spell and trigger its effect
 */
function playSpell(
	state: GameState,
	active: Player,
	inactive: Player,
	instance: CardInstance,
	cardDef: CardDef,
	targetId: string
): void {
	if (cardDef.spellEffect != null) {
		executeEffect(state, active, inactive, cardDef.spellEffect!, instance, targetId);
	}
	// Spell goes to graveyard after casting
	active.graveyard.push(instance);
}

/**
 * Equip a weapon (replaces existing weapon)
 */
function equipWeapon(active: Player, instance: CardInstance, cardDef: CardDef): void {
	// Destroy existing weapon
	if (active.weapon != null) {
		active.graveyard.push(active.weapon!);
	}

	instance.currentDurability = cardDef.health; // health = durability for weapons
	instance.currentAttack = cardDef.attack;
	active.weapon = instance;
}

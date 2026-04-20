/**
 * Draw engine — handles card drawing.
 * Port of drawCard logic from gameUtils.ts
 */

import {
	GameState,
	Player,
	CardInstance,
	PLAYER_SELF,
} from '../types/GameState';
import { getCardDef } from '../util/cardLookup';

/** Maximum hand size */
export const MAX_HAND_SIZE: i32 = 7;

/**
 * Draw a card for the specified player.
 * If deck is empty, nothing happens (no fatigue damage).
 * If hand is full (7), the card is discarded.
 */
export function drawCard(state: GameState, playerId: i32): void {
	const player = playerId == PLAYER_SELF ? state.player : state.opponent;
	drawCardForPlayer(state, player);
}

export function drawCardForPlayer(state: GameState, player: Player): void {
	if (player.deck.length == 0) {
		return;
	}

	if (player.hand.length >= MAX_HAND_SIZE) {
		return;
	}

	// Pop top card from deck
	const cardId = player.deck.shift();

	// Create card instance
	const cardDef = getCardDef(cardId);
	const instance = new CardInstance(state.nextInstanceId(), cardId);

	if (cardDef != null) {
		instance.currentAttack = cardDef.attack;
		instance.currentHealth = cardDef.health;
		instance.maxHealth = cardDef.health;
		instance.currentDurability = cardDef.health; // For weapons
		instance.isPlayerOwned = player.id == PLAYER_SELF;

		// Apply keywords from card def
		applyKeywordsFromDef(instance, cardDef.keywords);
	}

	player.hand.push(instance);
}

/**
 * Draw multiple cards for a player
 */
export function drawCards(state: GameState, player: Player, count: i32): void {
	for (let i: i32 = 0; i < count; i++) {
		drawCardForPlayer(state, player);
	}
}

/**
 * Apply keyword flags from a card definition's keyword list
 */
function applyKeywordsFromDef(instance: CardInstance, keywords: string[]): void {
	for (let i = 0; i < keywords.length; i++) {
		const kw = keywords[i];
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
		else if (kw == 'mega_windfury') instance.hasMegaWindfury = true;
		else if (kw == 'lifesteal') instance.hasLifesteal = true;
		else if (kw == 'poisonous') instance.hasPoisonous = true;
	}
}

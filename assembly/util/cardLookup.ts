/**
 * Card database lookup.
 * Card definitions are loaded from JSON at startup via loadCardData().
 * This module provides O(1) lookup by card ID.
 */

import { CardDef, EffectDef } from '../types/GameState';

const cardRegistry = new Map<i32, CardDef>();

/** Clear all loaded card data */
export function clearCardData(): void {
	cardRegistry.clear();
}

/** Register a single card definition */
export function registerCard(card: CardDef): void {
	cardRegistry.set(card.id, card);
}

/** Look up a card by ID. Returns null if not found. */
export function getCardDef(cardId: i32): CardDef | null {
	return cardRegistry.has(cardId) ? cardRegistry.get(cardId) : null;
}

/** Get total number of registered cards */
export function getCardCount(): i32 {
	return cardRegistry.size;
}

/** Check if a keyword exists on a card definition */
export function cardHasKeyword(cardId: i32, keyword: string): bool {
	const card = getCardDef(cardId);
	if (card == null) return false;
	for (let i = 0; i < card.keywords.length; i++) {
		if (card.keywords[i] == keyword) return true;
	}
	return false;
}

/**
 * Parse card data JSON and populate the registry.
 * Expected format: array of card objects.
 *
 * NOTE: Full JSON parsing in AS is limited. This uses a simplified
 * approach — the TypeScript bridge pre-processes the JSON into a
 * flat binary format that's easier to parse in WASM.
 *
 * For the initial implementation, card data is passed as a JSON string
 * and parsed with AS-JSON or a custom parser.
 */
export function loadCardDataFromJson(json: string): i32 {
	// This will be implemented with a JSON parsing library or
	// the TypeScript bridge will call registerCard() individually
	// via exported helper functions.
	return 0;
}

// Helper exports for the TypeScript bridge to call per-card
let pendingCard: CardDef | null = null;

export function beginCard(id: i32, name: string, cardType: i32, manaCost: i32): void {
	const card = new CardDef();
	card.id = id;
	card.name = name;
	card.cardType = cardType;
	card.manaCost = manaCost;
	pendingCard = card;
}

export function setCardStats(attack: i32, health: i32, heroClass: i32, overload: i32, spellDamage: i32): void {
	if (pendingCard != null) {
		pendingCard!.attack = attack;
		pendingCard!.health = health;
		pendingCard!.heroClass = heroClass;
		pendingCard!.overload = overload;
		pendingCard!.spellDamage = spellDamage;
	}
}

export function setCardMeta(rarity: string, race: string, heroId: string, armorSlot: string): void {
	if (pendingCard != null) {
		pendingCard!.rarity = rarity;
		pendingCard!.race = race;
		pendingCard!.heroId = heroId;
		pendingCard!.armorSlot = armorSlot;
	}
}

export function addCardKeyword(keyword: string): void {
	if (pendingCard != null) {
		pendingCard!.keywords.push(keyword);
	}
}

export function setCardBattlecry(pattern: string, value: i32, value2: i32, targetType: string, condition: string, cardId: i32, count: i32): void {
	if (pendingCard != null) {
		const effect = new EffectDef();
		effect.pattern = pattern;
		effect.value = value;
		effect.value2 = value2;
		effect.targetType = targetType;
		effect.condition = condition;
		effect.cardId = cardId;
		effect.count = count;
		pendingCard!.battlecry = effect;
	}
}

export function setCardDeathrattle(pattern: string, value: i32, value2: i32, targetType: string, condition: string, cardId: i32, count: i32): void {
	if (pendingCard != null) {
		const effect = new EffectDef();
		effect.pattern = pattern;
		effect.value = value;
		effect.value2 = value2;
		effect.targetType = targetType;
		effect.condition = condition;
		effect.cardId = cardId;
		effect.count = count;
		pendingCard!.deathrattle = effect;
	}
}

export function setCardSpellEffect(pattern: string, value: i32, value2: i32, targetType: string, condition: string, cardId: i32, count: i32): void {
	if (pendingCard != null) {
		const effect = new EffectDef();
		effect.pattern = pattern;
		effect.value = value;
		effect.value2 = value2;
		effect.targetType = targetType;
		effect.condition = condition;
		effect.cardId = cardId;
		effect.count = count;
		pendingCard!.spellEffect = effect;
	}
}

export function commitCard(): void {
	if (pendingCard != null) {
		registerCard(pendingCard!);
		pendingCard = null;
	}
}

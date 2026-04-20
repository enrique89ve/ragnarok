/**
 * cardDataExporter.ts — Export card definitions to WASM
 *
 * Strips the full card registry to game-mechanical fields only
 * (no descriptions, flavor text, art URLs) and loads them into
 * the WASM module via the per-card loading API.
 */

import type { CardData, BattlecryEffect, DeathrattleEffect, SpellEffect } from '../types';

const CARD_TYPE_MAP: Record<string, number> = {
	minion: 0, spell: 1, weapon: 2, hero: 3,
	secret: 4, location: 5, poker_spell: 6, artifact: 7, armor: 8,
};

const HERO_CLASS_MAP: Record<string, number> = {
	neutral: 0, druid: 1, hunter: 2, mage: 3, paladin: 4,
	priest: 5, rogue: 6, shaman: 7, warlock: 8, warrior: 9,
	necromancer: 10, berserker: 11, deathknight: 12,
	Neutral: 0, Druid: 1, Hunter: 2, Mage: 3, Paladin: 4,
	Priest: 5, Rogue: 6, Shaman: 7, Warlock: 8, Warrior: 9,
	Necromancer: 10, Berserker: 11, DeathKnight: 12,
};

function mapEffectToPattern(effect: BattlecryEffect | DeathrattleEffect | SpellEffect | undefined): {
	pattern: string; value: number; value2: number;
	targetType: string; condition: string; cardId: number; count: number;
} | null {
	if (!effect || !effect.type) return null;
	return {
		pattern: effect.type ?? '',
		value: typeof effect.value === 'number' ? effect.value : 0,
		value2: ('value2' in effect && typeof effect.value2 === 'number') ? effect.value2 : 0,
		targetType: effect.targetType ?? 'none',
		condition: ('condition' in effect && typeof effect.condition === 'string') ? effect.condition : '',
		cardId: ('cardId' in effect && typeof effect.cardId === 'number') ? effect.cardId : 0,
		count: ('count' in effect && typeof effect.count === 'number') ? effect.count : 1,
	};
}

export interface WasmCardLoader {
	beginCard(id: number, name: string, cardType: number, manaCost: number): void;
	setCardStats(attack: number, health: number, heroClass: number, overload: number, spellDamage: number): void;
	setCardMeta(rarity: string, race: string, heroId: string, armorSlot: string): void;
	addCardKeyword(keyword: string): void;
	setCardBattlecry(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
	setCardDeathrattle(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
	setCardSpellEffect(pattern: string, value: number, value2: number, targetType: string, condition: string, cardId: number, count: number): void;
	commitCard(): void;
	clearCardData(): void;
	getCardCount(): number;
}

export function exportCardDataToWasm(cards: CardData[], loader: WasmCardLoader): number {
	loader.clearCardData();

	for (const card of cards) {
		const id = typeof card.id === 'number' ? card.id : parseInt(String(card.id), 10);
		if (isNaN(id)) continue;

		const cardType = CARD_TYPE_MAP[card.type] ?? 0;
		const manaCost = card.manaCost ?? 0;

		loader.beginCard(id, card.name, cardType, manaCost);

		const attack = ('attack' in card && typeof card.attack === 'number') ? card.attack : 0;
		const health = ('health' in card && typeof card.health === 'number') ? card.health :
			('durability' in card && typeof card.durability === 'number') ? card.durability : 0;
		const heroClass = HERO_CLASS_MAP[card.heroClass ?? card.class ?? 'neutral'] ?? 0;
		const overload = ('overload' in card && card.overload && typeof card.overload === 'object')
			? (card.overload as { amount: number }).amount : 0;
		const spellDamage = ('spellDamage' in card && typeof card.spellDamage === 'number') ? card.spellDamage : 0;

		loader.setCardStats(attack, health, heroClass, overload, spellDamage);

		const rarity = card.rarity ?? 'free';
		const race = card.race ?? '';
		const heroId = ('heroId' in card && typeof card.heroId === 'string') ? card.heroId : '';
		const armorSlot = ('armorSlot' in card && typeof card.armorSlot === 'string') ? card.armorSlot : '';

		loader.setCardMeta(rarity, race, heroId, armorSlot);

		if (card.keywords) {
			for (const kw of card.keywords) {
				loader.addCardKeyword(kw);
			}
		}

		if ('battlecry' in card) {
			const bc = mapEffectToPattern(card.battlecry as BattlecryEffect);
			if (bc) loader.setCardBattlecry(bc.pattern, bc.value, bc.value2, bc.targetType, bc.condition, bc.cardId, bc.count);
		}

		if ('deathrattle' in card) {
			const dr = mapEffectToPattern(card.deathrattle as DeathrattleEffect);
			if (dr) loader.setCardDeathrattle(dr.pattern, dr.value, dr.value2, dr.targetType, dr.condition, dr.cardId, dr.count);
		}

		if ('spellEffect' in card) {
			const se = mapEffectToPattern(card.spellEffect as SpellEffect);
			if (se) loader.setCardSpellEffect(se.pattern, se.value, se.value2, se.targetType, se.condition, se.cardId, se.count);
		}

		loader.commitCard();
	}

	return loader.getCardCount();
}

import type { CardData, BattlecryEffect, SpellEffect, DeathrattleEffect } from '../../types';
import type { HiveCardAsset } from '../../../data/schemas/HiveTypes';

export const EVOLUTION_LEVELS = { MORTAL: 1, ASCENDED: 2, DIVINE: 3 } as const;
export type EvolutionLevel = 1 | 2 | 3;

export const LEVEL_NAMES: Record<EvolutionLevel, string> = {
	1: 'Mortal',
	2: 'Ascended',
	3: 'Divine',
};

const BASIC_KEYWORDS = new Set([
	'taunt', 'charge', 'rush', 'divine_shield', 'battlecry', 'echo',
]);

const STAT_MULTIPLIERS: Record<EvolutionLevel, { attack: number; health: number }> = {
	1: { attack: 0.6, health: 0.7 },
	2: { attack: 0.8, health: 0.9 },
	3: { attack: 1.0, health: 1.0 },
};

const EFFECT_MULTIPLIERS: Record<EvolutionLevel, number> = {
	1: 0.6,
	2: 0.8,
	3: 1.0,
};

const EVOLUTION_TIER_MAP: Record<string, [number, number][]> = {
	basic:     [[1, 2], [3, 4], [5, 5]],
	common:    [[1, 3], [4, 7], [8, 10]],
	rare:      [[1, 3], [4, 6], [7, 8]],
	epic:      [[1, 2], [3, 4], [5, 6]],
	mythic:    [[1, 1], [2, 3], [4, 4]],
};

function scaleValue(value: number, multiplier: number): number {
	if (value === 0) return 0;
	if (value > 0) return Math.max(1, Math.ceil(value * multiplier));
	return Math.min(-1, Math.floor(value * multiplier));
}

function scaleEffect<T>(effect: T | undefined, multiplier: number): T | undefined {
	if (!effect || multiplier === 1) return effect;
	if (typeof effect !== 'object' || effect === null) return effect;

	const scaled = { ...effect } as Record<string, unknown>;

	for (const key of Object.keys(scaled)) {
		const val = scaled[key];
		if (key === 'value' && typeof val === 'number') {
			scaled[key] = scaleValue(val, multiplier);
		} else if (key === 'amount' && typeof val === 'number') {
			scaled[key] = scaleValue(val, multiplier);
		} else if (key === 'damage' && typeof val === 'number') {
			scaled[key] = scaleValue(val, multiplier);
		} else if (key === 'healing' && typeof val === 'number') {
			scaled[key] = scaleValue(val, multiplier);
		} else if (key === 'armor' && typeof val === 'number') {
			scaled[key] = scaleValue(val, multiplier);
		} else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
			scaled[key] = scaleEffect(val, multiplier);
		}
	}

	return scaled as T;
}

function scaleDescription(
	description: string | undefined,
	level: EvolutionLevel,
	effectMultiplier: number
): string | undefined {
	if (!description || effectMultiplier === 1) return description;

	return description.replace(/\b(\d+)\b/g, (match) => {
		const num = parseInt(match, 10);
		if (num <= 1 || isNaN(num)) return match;
		return String(scaleValue(num, effectMultiplier));
	});
}

function scaleKeywords(keywords: string[] | undefined, level: EvolutionLevel): string[] | undefined {
	if (!keywords || level >= 2) return keywords;
	return keywords.filter(kw => BASIC_KEYWORDS.has(kw));
}

export function getCardAtLevel(card: CardData, level: EvolutionLevel): CardData {
	if (!level || level === 3 || level < 1 || level > 3) return card;

	const mult = STAT_MULTIPLIERS[level];
	const effectMult = EFFECT_MULTIPLIERS[level];

	const scaled: CardData = { ...card };

	if ('attack' in scaled && typeof (scaled as any).attack === 'number') {
		(scaled as any).attack = scaleValue((scaled as any).attack, mult.attack);
	}

	if ('health' in scaled && typeof (scaled as any).health === 'number') {
		(scaled as any).health = scaleValue((scaled as any).health, mult.health);
	}

	if (scaled.type === 'weapon' && 'durability' in scaled) {
		const dur = (scaled as any).durability as number;
		if (typeof dur === 'number' && level === 1) {
			(scaled as any).durability = Math.max(1, dur - 1);
		}
	}

	scaled.keywords = scaleKeywords(scaled.keywords, level);

	if ('battlecry' in scaled && (scaled as any).battlecry) {
		(scaled as any).battlecry = scaleEffect<BattlecryEffect>(
			(scaled as any).battlecry, effectMult
		);
	}

	if ('spellEffect' in scaled && (scaled as any).spellEffect) {
		(scaled as any).spellEffect = scaleEffect<SpellEffect>(
			(scaled as any).spellEffect, effectMult
		);
	}

	if ('deathrattle' in scaled && (scaled as any).deathrattle) {
		(scaled as any).deathrattle = scaleEffect<DeathrattleEffect>(
			(scaled as any).deathrattle, effectMult
		);
	}

	if ('endOfTurn' in scaled && (scaled as any).endOfTurn) {
		(scaled as any).endOfTurn = scaleEffect((scaled as any).endOfTurn, effectMult);
	}

	if ('aura' in scaled && (scaled as any).aura) {
		(scaled as any).aura = scaleEffect((scaled as any).aura, effectMult);
	}

	if ('auraEffect' in scaled && (scaled as any).auraEffect) {
		(scaled as any).auraEffect = scaleEffect((scaled as any).auraEffect, effectMult);
	}

	if ('passive' in scaled && (scaled as any).passive) {
		(scaled as any).passive = scaleEffect((scaled as any).passive, effectMult);
	}

	if ('frenzyEffect' in scaled && (scaled as any).frenzyEffect) {
		(scaled as any).frenzyEffect = scaleEffect((scaled as any).frenzyEffect, effectMult);
	}

	scaled.description = scaleDescription(scaled.description, level, effectMult);

	return scaled;
}

export function getLevelName(level: EvolutionLevel): string {
	return LEVEL_NAMES[level] || 'Unknown';
}

export function getEvolutionLevel(xpLevel: number, rarity: string): EvolutionLevel {
	const key = rarity.toLowerCase();
	const tiers = EVOLUTION_TIER_MAP[key] || EVOLUTION_TIER_MAP.common;

	for (let i = 0; i < tiers.length; i++) {
		const [min, max] = tiers[i];
		if (xpLevel >= min && xpLevel <= max) {
			return (i + 1) as EvolutionLevel;
		}
	}

	return 3;
}

export function getEvolutionStars(level: EvolutionLevel): string {
	return '★'.repeat(level);
}

export function enrichDeckWithNFTLevels(
	deck: CardData[],
	collection: HiveCardAsset[]
): CardData[] {
	if (!collection || collection.length === 0) return deck;

	const bestLevelByCardId = new Map<number, number>();
	for (const asset of collection) {
		const existing = bestLevelByCardId.get(asset.cardId);
		if (existing === undefined || asset.level > existing) {
			bestLevelByCardId.set(asset.cardId, asset.level);
		}
	}

	return deck.map(card => {
		const cardId = typeof card.id === 'string' ? parseInt(card.id, 10) : card.id;
		const nftLevel = bestLevelByCardId.get(cardId);
		if (nftLevel === undefined) return card;

		const rarity = (card.rarity ?? 'common').toLowerCase();
		const evoLevel = getEvolutionLevel(nftLevel, rarity);
		if (evoLevel >= 3) return card;

		const enriched = { ...card, _evolutionLevel: evoLevel };
		return enriched as CardData;
	});
}

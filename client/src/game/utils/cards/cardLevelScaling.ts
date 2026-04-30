import type { CardData } from '../../types';
import type { HiveCardAsset } from '../../../data/schemas/HiveTypes';

export type EvolutionLevel = 1 | 2 | 3;

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

const SCALABLE_EFFECT_NUMBER_KEYS = new Set(['value', 'amount', 'damage', 'healing', 'armor']);

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
		if (typeof val === 'number' && SCALABLE_EFFECT_NUMBER_KEYS.has(key)) {
			scaled[key] = scaleValue(val, multiplier);
			continue;
		}

		if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
			scaled[key] = scaleEffect(val, multiplier);
		}
	}

	return scaled as T;
}

function scaleDescription(
	description: string | undefined,
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

function getScaledNumericProperty(target: Record<string, unknown>, key: string, multiplier: number): number | null {
	const value = target[key];
	if (typeof value === 'number') {
		return scaleValue(value, multiplier);
	}
	return null;
}

function getScaledEffectProperty(target: Record<string, unknown>, key: string, multiplier: number): unknown {
	const effect = target[key];
	if (effect) {
		return scaleEffect(effect, multiplier);
	}
	return undefined;
}

export function getCardAtLevel(card: CardData, level: EvolutionLevel): CardData {
	if (!level || level === 3 || level < 1 || level > 3) return card;

	const mult = STAT_MULTIPLIERS[level];
	const effectMult = EFFECT_MULTIPLIERS[level];

	const scaledRecord: Record<string, unknown> = { ...card };
	const scaled = scaledRecord as unknown as CardData;

	const scaledAttack = getScaledNumericProperty(scaledRecord, 'attack', mult.attack);
	if (scaledAttack !== null) scaledRecord.attack = scaledAttack;

	const scaledHealth = getScaledNumericProperty(scaledRecord, 'health', mult.health);
	if (scaledHealth !== null) scaledRecord.health = scaledHealth;

	if (scaled.type === 'weapon' && 'durability' in scaled) {
		const durability = scaledRecord.durability;
		if (typeof durability === 'number' && level === 1) {
			scaledRecord.durability = Math.max(1, durability - 1);
		}
	}

	scaled.keywords = scaleKeywords(scaled.keywords, level);

	for (const key of ['battlecry', 'spellEffect', 'deathrattle', 'endOfTurn', 'aura', 'auraEffect', 'passive', 'frenzyEffect']) {
		const scaledEffect = getScaledEffectProperty(scaledRecord, key, effectMult);
		if (scaledEffect !== undefined) scaledRecord[key] = scaledEffect;
	}

	scaled.description = scaleDescription(scaled.description, effectMult);

	return scaled;
}

export function getEvolutionLevel(xpLevel: number): EvolutionLevel {
	const clamped = Math.max(1, Math.min(3, xpLevel));
	return clamped as EvolutionLevel;
}

export function enrichDeckWithNFTLevels(
	deck: CardData[],
	collection: HiveCardAsset[]
): CardData[] {
	if (!collection || collection.length === 0) return deck;

	const bestLevelByCardId = new Map<number, number>();
	for (const asset of collection) {
		if (asset.ownershipSource !== 'nft') continue;

		const existing = bestLevelByCardId.get(asset.cardId);
		if (existing === undefined || asset.level > existing) {
			bestLevelByCardId.set(asset.cardId, asset.level);
		}
	}

	return deck.map(card => {
		const cardId = typeof card.id === 'string' ? parseInt(card.id, 10) : card.id;
		const nftLevel = bestLevelByCardId.get(cardId);
		if (nftLevel === undefined) return card;

		const evoLevel = getEvolutionLevel(nftLevel);
		if (evoLevel >= 3) return card;

		const enriched = { ...card, _evolutionLevel: evoLevel };
		return enriched as CardData;
	});
}

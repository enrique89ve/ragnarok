/**
 * Shared helpers for pack catalog + sealed pack flows.
 * Used by:
 *   - marketplace/PackCatalog.tsx (catalog + buy)
 *   - PacksPage.tsx (vault + open)
 */

import { cardRegistry } from '../../data/cardRegistry';
import { cryptoRng } from '../../utils/seededRng';
import {
	PACK_DEFINITIONS,
	PUBLIC_PACK_KEYS,
	getPackDefinition,
	normalizePackKey,
	type CanonicalPackDefinition,
} from '@shared/protocol-core/packCatalog';
import type { CardData } from '../../types';
import type { PackType, PackTypeApiRow, RevealedCard } from './types';

export const RARITY_ORDER = ['mythic', 'epic', 'rare', 'common'] as const;

// Canonical rarity colors — must match design-tokens.css `--rarity-*-color`.
// Mythic is gold/amber per Norse rulebook, NOT pink.
export const RARITY_COLORS: Record<string, string> = {
	mythic: 'var(--rarity-mythic-color)',
	epic: 'var(--rarity-epic-color)',
	rare: 'var(--rarity-rare-color)',
	common: 'var(--rarity-common-color)',
};

export const PACK_THEMES: Record<string, { seal: string; btn: string; card: string; icon: string }> = {
	'Starter Pack': { seal: 'pack-seal-starter', btn: 'open-btn-starter', card: 'pack-card-starter', icon: '石' },
	'Booster Pack': { seal: 'pack-seal-booster', btn: 'open-btn-booster', card: 'pack-card-booster', icon: '盾' },
	'Standard Pack': { seal: 'pack-seal-booster', btn: 'open-btn-booster', card: 'pack-card-booster', icon: '盾' },
	'Premium Pack': { seal: 'pack-seal-premium', btn: 'open-btn-premium', card: 'pack-card-premium', icon: '冠' },
	'Mythic Pack': { seal: 'pack-seal-mythic', btn: 'open-btn-mythic', card: 'pack-card-mythic', icon: '龍' },
	'Mega Pack': { seal: 'pack-seal-mythic', btn: 'open-btn-mythic', card: 'pack-card-mythic', icon: '星' },
};

export function getPackTheme(name: string) {
	return PACK_THEMES[name] || PACK_THEMES['Starter Pack'];
}

export function packRarityOdds(
	pack: Pick<
		CanonicalPackDefinition,
		'cardCount' | 'commonSlots' | 'rareSlots' | 'epicSlots' | 'wildcardSlots' | 'legendaryChance' | 'mythicChance'
	>,
): PackType['rarityOdds'] {
	const guaranteedSlots = Math.max(pack.cardCount - pack.wildcardSlots, 1);
	const wildcardRareWeight = Math.max(100 - pack.legendaryChance - pack.mythicChance, 0);

	return {
		common: Math.round((pack.commonSlots / guaranteedSlots) * 100),
		rare: Math.min(100, Math.round((pack.rareSlots / guaranteedSlots) * 100) + Math.round((pack.wildcardSlots * wildcardRareWeight) / pack.cardCount)),
		epic: Math.min(100, Math.round((pack.epicSlots / guaranteedSlots) * 100) + Math.round((pack.wildcardSlots * pack.legendaryChance) / pack.cardCount)),
		mythic: Math.min(100, Math.round((pack.wildcardSlots * pack.mythicChance) / pack.cardCount)),
	};
}

export function packDefinitionToUiPack(pack: CanonicalPackDefinition, id: number): PackType {
	return {
		key: pack.key,
		id,
		name: pack.name,
		description: pack.description,
		price: pack.price,
		runeCost: pack.runeCost,
		isFreeClaim: pack.freeClaimLimitPerAccount > 0,
		isRuneRedeemable: pack.runeCost !== null,
		cardCount: pack.cardCount,
		rarityOdds: packRarityOdds(pack),
	};
}

export function apiPackToUiPack(pack: PackTypeApiRow): PackType {
	const definition = getPackDefinition(pack.name);
	if (definition) return packDefinitionToUiPack(definition, pack.id);

	return {
		key: normalizePackKey(pack.name) ?? 'standard',
		id: pack.id,
		name: pack.name,
		description: pack.description ?? '',
		price: pack.price,
		runeCost: null,
		isFreeClaim: false,
		isRuneRedeemable: false,
		cardCount: pack.card_count,
		rarityOdds: packRarityOdds({
			cardCount: pack.card_count,
			commonSlots: pack.common_slots,
			rareSlots: pack.rare_slots,
			epicSlots: pack.epic_slots,
			wildcardSlots: pack.wildcard_slots,
			legendaryChance: pack.legendary_chance ?? 0,
			mythicChance: pack.mythic_chance ?? 0,
		}),
	};
}

export const FALLBACK_PACKS: PackType[] = PUBLIC_PACK_KEYS.map((key, index) =>
	packDefinitionToUiPack(PACK_DEFINITIONS[key], index + 1),
);

export const CARD_POOL = cardRegistry.filter(c => c.rarity && c.name && Number(c.id) >= 1000);

export function starterCardToRevealedCard(card: CardData): RevealedCard {
	return {
		id: card.id as number,
		name: card.name,
		rarity: (card.rarity ?? 'common').toLowerCase(),
		type: card.type ?? 'minion',
		heroClass: 'class' in card ? (card as { class: string }).class : 'Neutral',
	};
}

export function openPackLocally(pack: PackType): RevealedCard[] {
	const byRarity: Record<string, typeof CARD_POOL> = {};
	for (const c of CARD_POOL) {
		const r = (c.rarity ?? 'common').toLowerCase();
		(byRarity[r] ??= []).push(c);
	}
	const pick = (rarity: string) => {
		const pool = byRarity[rarity] ?? byRarity['common'] ?? [];
		if (pool.length === 0) return null;
		return pool[Math.floor(cryptoRng() * pool.length)];
	};
	const odds = pack.rarityOdds;
	const totalWeight = odds.common + odds.rare + odds.epic + odds.mythic;
	const rollRarity = () => {
		let roll = cryptoRng() * totalWeight;
		if ((roll -= odds.mythic) < 0) return 'mythic';
		if ((roll -= odds.epic) < 0) return 'epic';
		if ((roll -= odds.rare) < 0) return 'rare';
		return 'common';
	};
	const cards: RevealedCard[] = [];
	for (let i = 0; i < pack.cardCount; i++) {
		const rarity = rollRarity();
		const card = pick(rarity);
		if (card) {
			cards.push({
				id: Number(card.id),
				name: card.name,
				rarity: (card.rarity ?? 'common').toLowerCase(),
				type: card.type ?? 'minion',
				heroClass: card.heroClass ?? 'neutral',
			});
		}
	}
	return cards;
}

export function getScarcityInfo(percentRemaining: number): { label: string; class: string } {
	if (percentRemaining <= 0) return { label: 'SOLD OUT', class: 'scarcity-badge-soldout' };
	if (percentRemaining <= 10) return { label: 'ALMOST GONE', class: 'scarcity-badge-critical' };
	if (percentRemaining <= 25) return { label: 'LOW SUPPLY', class: 'scarcity-badge-low' };
	return { label: 'AVAILABLE', class: 'scarcity-badge-fresh' };
}

export function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

export function getPackGuarantees(pack: Pick<PackType, 'cardCount' | 'rarityOdds'>): string[] {
	const guarantees: string[] = [];
	if (pack.rarityOdds.epic > 0) guarantees.push('Epic');
	if (pack.cardCount >= 7) guarantees.push(`${pack.cardCount} Cards`);
	return guarantees;
}

export function parseNum(v: string | number): number {
	return typeof v === 'string' ? parseInt(v, 10) || 0 : v || 0;
}

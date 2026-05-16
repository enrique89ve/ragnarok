/**
 * Shared helpers for pack catalog + sealed pack flows.
 * Used by:
 *   - marketplace/PackCatalog.tsx (catalog + buy)
 *   - PacksPage.tsx (vault + open)
 */

import { cardRegistry } from '../../data/cardRegistry';
import {
	PACK_DEFINITIONS,
	PUBLIC_PACK_KEYS,
	getHbdPackPriceThousandths,
	getPackDefinition,
	normalizePackKey,
	type CanonicalPackDefinition,
} from '@shared/protocol-core/packCatalog';
import { RARITY_ORDER as CANON_RARITY_ORDER, type Rarity } from '@shared/schemas/rarity';
import type { CardData } from '../../types';
import { getRarityCssColor } from '../../utils/rarityUtils';
import type { PackType, PackTypeApiRow, RevealedCard } from './types';

export const RARITY_ORDER = (Object.keys(CANON_RARITY_ORDER) as Rarity[])
	.sort((a, b) => CANON_RARITY_ORDER[b] - CANON_RARITY_ORDER[a]);

export const RARITY_COLORS: Record<Rarity, string> = Object.fromEntries(
	RARITY_ORDER.map(rarity => [rarity, getRarityCssColor(rarity)]),
) as Record<Rarity, string>;

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
		'cardCount' | 'commonSlots' | 'rareSlots' | 'epicSlots' | 'wildcardSlots' | 'epicChance' | 'mythicChance'
	>,
): PackType['rarityOdds'] {
	const guaranteedSlots = Math.max(pack.cardCount - pack.wildcardSlots, 1);
	const wildcardRareWeight = Math.max(100 - pack.epicChance - pack.mythicChance, 0);

	return {
		common: Math.round((pack.commonSlots / guaranteedSlots) * 100),
		rare: Math.min(100, Math.round((pack.rareSlots / guaranteedSlots) * 100) + Math.round((pack.wildcardSlots * wildcardRareWeight) / pack.cardCount)),
		epic: Math.min(100, Math.round((pack.epicSlots / guaranteedSlots) * 100) + Math.round((pack.wildcardSlots * pack.epicChance) / pack.cardCount)),
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
		hbdPriceThousandths: getHbdPackPriceThousandths(pack.key),
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

	const packKey = normalizePackKey(pack.name) ?? PACK_DEFINITIONS.standard.key;
	return {
		key: packKey,
		id: pack.id,
		name: pack.name,
		description: pack.description ?? '',
		price: pack.price,
		hbdPriceThousandths: getHbdPackPriceThousandths(packKey),
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
			epicChance: pack.epic_chance ?? 0,
			mythicChance: pack.mythic_chance ?? 0,
		}),
	};
}

export const FALLBACK_PACKS: PackType[] = PUBLIC_PACK_KEYS.map((key, index) =>
	packDefinitionToUiPack(PACK_DEFINITIONS[key], index + 1),
);

export function starterCardToRevealedCard(card: CardData): RevealedCard {
	return {
		id: card.id as number,
		name: card.name,
		rarity: (card.rarity ?? 'common').toLowerCase(),
		type: card.type ?? 'minion',
		heroClass: 'class' in card ? (card as { class: string }).class : 'Neutral',
	};
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

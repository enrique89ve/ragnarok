/**
 * Chain-derived pack routes.
 *
 * These endpoints are projections for the UI. They do not open packs, mint
 * cards, or mutate inventory. Canonical state transitions live in Hive ops:
 * `pack_purchase` creates sealed PackAsset records, and `pack_burn` opens them.
 */

import { Router, type Request, type Response } from 'express';
import {
	PACK_DEFINITION_LIST,
	getActiveHbdPackSaleScenario,
	getHbdPackPriceThousandths,
	type CanonicalPackDefinition,
	type RuneRedeemablePackKey,
} from '../../shared/protocol-core';
import { RARITY, type Rarity } from '../../shared/schemas/rarity';
import {
	getPackSupplyRecord,
	getSupplyCounter,
} from '../services/chainState';

const router = Router();

const PACK_ROW_IDS: Record<string, number> = {
	starter: 1,
	standard: 2,
	premium: 3,
	mythic: 4,
	booster: 5,
	mega: 6,
};

type RarityKey = Rarity;

type PackTypeApiRow = {
	id: number;
	key: string;
	name: string;
	description: string;
	price: number;
	hbd_price_thousandths: number | null;
	rune_cost: number | null;
	is_free_claim: boolean;
	is_rune_redeemable: boolean;
	is_active: boolean;
	card_count: number;
	common_slots: number;
	rare_slots: number;
	epic_slots: number;
	wildcard_slots: number;
	epic_chance: number;
	mythic_chance: number;
};

type SupplyStatsRow = {
	nft_rarity: RarityKey;
	card_count: number;
	max_supply: number;
	remaining_supply: number;
	reward_reserve: number;
	pack_supply: number;
	pack_remaining: number;
};

function toPackTypeApiRow(pack: CanonicalPackDefinition): PackTypeApiRow {
	return {
		id: PACK_ROW_IDS[pack.key] ?? 999,
		key: pack.key,
		name: pack.name,
		description: pack.description,
		price: pack.price,
		hbd_price_thousandths: getHbdPackPriceThousandths(pack.key),
		rune_cost: pack.runeCost,
		is_free_claim: pack.freeClaimLimitPerAccount > 0,
		is_rune_redeemable: pack.runeCost !== null,
		is_active: pack.isActive,
		card_count: pack.cardCount,
		common_slots: pack.commonSlots,
		rare_slots: pack.rareSlots,
		epic_slots: pack.epicSlots,
		wildcard_slots: pack.wildcardSlots,
		epic_chance: pack.epicChance,
		mythic_chance: pack.mythicChance,
	};
}

function getPackCap(packKey: RuneRedeemablePackKey): number {
	const saleScenario = getActiveHbdPackSaleScenario();
	const indexed = getPackSupplyRecord(packKey);
	return indexed?.cap && indexed.cap > 0
		? indexed.cap
		: saleScenario.packCaps[packKey];
}

function getPackMinted(packKey: RuneRedeemablePackKey): number {
	return getPackSupplyRecord(packKey)?.minted ?? 0;
}

function getPackBurned(packKey: RuneRedeemablePackKey): number {
	return getPackSupplyRecord(packKey)?.burned ?? 0;
}

function buildRarityStats(): SupplyStatsRow[] {
	return RARITY.map((rarity) => {
		const counter = getSupplyCounter(`pack:${rarity}`);
		const cap = counter?.cap ?? 0;
		const minted = counter?.minted ?? 0;
		const remaining = Math.max(cap - minted, 0);

		return {
			nft_rarity: rarity,
			card_count: 0,
			max_supply: cap,
			remaining_supply: remaining,
			reward_reserve: 0,
			pack_supply: cap,
			pack_remaining: remaining,
		};
	}).filter(row => row.max_supply > 0 || row.pack_supply > 0);
}

function buildSupplyStats() {
	const saleScenario = getActiveHbdPackSaleScenario();
	const packKeys = Object.keys(saleScenario.packCaps) as RuneRedeemablePackKey[];
	let totalPackSupply = 0;
	let totalPackMinted = 0;
	let totalPackBurned = 0;
	let totalCardInstanceCap = 0;

	for (const packKey of packKeys) {
		const definition = PACK_DEFINITION_LIST.find(pack => pack.key === packKey);
		if (!definition) continue;

		const cap = getPackCap(packKey);
		const minted = getPackMinted(packKey);
		const burned = getPackBurned(packKey);

		totalPackSupply += cap;
		totalPackMinted += minted;
		totalPackBurned += burned;
		totalCardInstanceCap += cap * definition.cardCount;
	}

	const totalPackRemaining = Math.max(totalPackSupply - totalPackMinted, 0);
	const openedCardInstances = packKeys.reduce((total, packKey) => {
		const definition = PACK_DEFINITION_LIST.find(pack => pack.key === packKey);
		return total + (definition ? getPackBurned(packKey) * definition.cardCount : 0);
	}, 0);

	return {
		overall: {
			total_cards: totalCardInstanceCap,
			total_max_supply: totalCardInstanceCap,
			total_remaining_supply: Math.max(totalCardInstanceCap - openedCardInstances, 0),
			total_reward_reserve: 0,
			total_pack_supply: totalPackSupply,
			total_pack_remaining: totalPackRemaining,
			total_pack_minted: totalPackMinted,
			total_pack_burned: totalPackBurned,
		},
		byRarity: buildRarityStats(),
		byType: [],
	};
}

router.get('/types', (_req: Request, res: Response) => {
	const packs = PACK_DEFINITION_LIST
		.filter(pack => pack.isActive)
		.map(toPackTypeApiRow)
		.sort((a, b) => a.price - b.price);

	res.json({
		success: true,
		source: 'chain-derived',
		packs,
	});
});

router.get('/supply-stats', (_req: Request, res: Response) => {
	res.json({
		success: true,
		source: 'chain-derived',
		...buildSupplyStats(),
	});
});

router.post('/open', (_req: Request, res: Response) => {
	res.status(410).json({
		success: false,
		error: 'Legacy SQL pack opening is disabled. Use HBD pack purchase, then sealed pack burn from the chain-derived vault.',
		canonicalFlow: ['pack_purchase', 'pack_burn'],
	});
});

router.get('/history/:userId', (_req: Request, res: Response) => {
	res.json({
		success: true,
		source: 'chain-derived',
		history: [],
		message: 'Pack history is derived from Hive replay; SQL pack_history is no longer authoritative.',
	});
});

export default router;

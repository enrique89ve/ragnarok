/**
 * Canonical pack catalog shared by protocol, server seeds, and client UI.
 *
 * `booster` remains for legacy protocol compatibility. New reward/airdrop
 * flows should prefer `standard` as the canonical 5-card pack.
 */

import type { RuneExchangeQuote, RuneExchangeQuoteInput } from './runeEconomy';

export const PACK_KEYS = ['starter', 'booster', 'standard', 'premium', 'mythic', 'mega'] as const;
export const PUBLIC_PACK_KEYS = ['starter', 'standard', 'premium', 'mythic'] as const;
export const ADMIN_MINTABLE_PACK_KEYS = ['standard', 'premium', 'mythic', 'mega'] as const;

export type PackKey = typeof PACK_KEYS[number];
export type PublicPackKey = typeof PUBLIC_PACK_KEYS[number];
export type AdminMintablePackKey = typeof ADMIN_MINTABLE_PACK_KEYS[number];
export type PackCategory = 'starter' | 'core' | 'premium' | 'chase' | 'event' | 'legacy';
export type PackAcquisition = 'free_starter_claim' | 'rune_exchange' | 'direct_purchase' | 'admin_event' | 'legacy';

export type CanonicalPackDefinition = {
	key: PackKey;
	category: PackCategory;
	name: string;
	description: string;
	cardCount: number;
	price: number;
	runeCost: number | null;
	runeExchangeLimitPerAccount: number;
	commonSlots: number;
	rareSlots: number;
	epicSlots: number;
	wildcardSlots: number;
	legendaryChance: number;
	mythicChance: number;
	isActive: boolean;
	adminMintable: boolean;
	freeClaimLimitPerAccount: number;
	acquisition: readonly PackAcquisition[];
};

export const PACK_DEFINITIONS: Record<PackKey, CanonicalPackDefinition> = {
	starter: {
		key: 'starter',
		category: 'starter',
		name: 'Starter Pack',
		description: 'A free one-time 45-card starter pack for account onboarding. Content is fixed (off-chain entitlement) — see shared/schemas/starterEntitlement.ts. Slots all collapse to commonSlots because the pack is deterministic, not rolled.',
		cardCount: 45,
		price: 0,
		runeCost: null,
		runeExchangeLimitPerAccount: 0,
		commonSlots: 45,
		rareSlots: 0,
		epicSlots: 0,
		wildcardSlots: 0,
		legendaryChance: 0,
		mythicChance: 0,
		isActive: true,
		adminMintable: false,
		freeClaimLimitPerAccount: 1,
		acquisition: ['free_starter_claim'],
	},
	booster: {
		key: 'booster',
		category: 'legacy',
		name: 'Booster Pack',
		description: 'Legacy 5-card booster. Prefer Standard Pack for new reward flows.',
		cardCount: 5,
		price: 250,
		runeCost: null,
		runeExchangeLimitPerAccount: 0,
		commonSlots: 2,
		rareSlots: 2,
		epicSlots: 0,
		wildcardSlots: 1,
		legendaryChance: 10,
		mythicChance: 2,
		isActive: false,
		adminMintable: false,
		freeClaimLimitPerAccount: 0,
		acquisition: ['legacy'],
	},
	standard: {
		key: 'standard',
		category: 'core',
		name: 'Standard Pack',
		description: 'A 5-card pack for airdrops, campaign claims, and normal rewards.',
		cardCount: 5,
		price: 250,
		runeCost: 2,
		runeExchangeLimitPerAccount: 5,
		commonSlots: 2,
		rareSlots: 2,
		epicSlots: 0,
		wildcardSlots: 1,
		legendaryChance: 10,
		mythicChance: 2,
		isActive: true,
		adminMintable: true,
		freeClaimLimitPerAccount: 0,
		acquisition: ['rune_exchange', 'direct_purchase'],
	},
	premium: {
		key: 'premium',
		category: 'premium',
		name: 'Premium Pack',
		description: 'A 7-card premium pack with a guaranteed epic and two wildcard slots.',
		cardCount: 7,
		price: 500,
		runeCost: 7,
		runeExchangeLimitPerAccount: 3,
		commonSlots: 3,
		rareSlots: 1,
		epicSlots: 1,
		wildcardSlots: 2,
		legendaryChance: 15,
		mythicChance: 3,
		isActive: true,
		adminMintable: true,
		freeClaimLimitPerAccount: 0,
		acquisition: ['rune_exchange', 'direct_purchase'],
	},
	mythic: {
		key: 'mythic',
		category: 'chase',
		name: 'Mythic Pack',
		description: 'A 7-card mythic pack with no commons and the highest mythic odds.',
		cardCount: 7,
		price: 1000,
		runeCost: 20,
		runeExchangeLimitPerAccount: 5,
		commonSlots: 0,
		rareSlots: 4,
		epicSlots: 1,
		wildcardSlots: 2,
		legendaryChance: 25,
		mythicChance: 5,
		isActive: true,
		adminMintable: true,
		freeClaimLimitPerAccount: 0,
		acquisition: ['rune_exchange', 'direct_purchase'],
	},
	mega: {
		key: 'mega',
		category: 'event',
		name: 'Mega Pack',
		description: 'A 15-card admin/event pack for limited distributions.',
		cardCount: 15,
		price: 2500,
		runeCost: null,
		runeExchangeLimitPerAccount: 0,
		commonSlots: 8,
		rareSlots: 4,
		epicSlots: 1,
		wildcardSlots: 2,
		legendaryChance: 20,
		mythicChance: 5,
		isActive: false,
		adminMintable: true,
		freeClaimLimitPerAccount: 0,
		acquisition: ['admin_event'],
	},
};

export const PACK_DEFINITION_LIST: readonly CanonicalPackDefinition[] = PACK_KEYS.map((key) => PACK_DEFINITIONS[key]);

export const PACK_SIZES: Record<string, number> = {
	starter: PACK_DEFINITIONS.starter.cardCount,
	booster: PACK_DEFINITIONS.booster.cardCount,
	standard: PACK_DEFINITIONS.standard.cardCount,
	premium: PACK_DEFINITIONS.premium.cardCount,
	mythic: PACK_DEFINITIONS.mythic.cardCount,
	mega: PACK_DEFINITIONS.mega.cardCount,
};

export const PACK_RUNE_COSTS: Partial<Record<PackKey, number>> = {
	standard: 2,
	premium: 7,
	mythic: 20,
};

export const RUNE_REDEEMABLE_PACK_KEYS = ['standard', 'premium', 'mythic'] as const;

export type RuneRedeemablePackKey = typeof RUNE_REDEEMABLE_PACK_KEYS[number];

export type RunePackPoolConfig = {
	phase: 'testnet';
	runeCap: number;
	targetAccounts: number;
	freeStarterPacksPerAccount: number;
	packCaps: Record<RuneRedeemablePackKey, number>;
};

export type RunePackPoolAllocation = {
	packKey: RuneRedeemablePackKey;
	packCap: number;
	cardInstanceCap: number;
	runeExposure: number;
};

export const TESTNET_RUNE_PACK_POOL: RunePackPoolConfig = {
	phase: 'testnet',
	runeCap: 2_600_000,
	targetAccounts: 20_000,
	freeStarterPacksPerAccount: PACK_DEFINITIONS.starter.freeClaimLimitPerAccount,
	packCaps: {
		standard: 100_000,
		premium: 60_000,
		mythic: 100_000,
	},
};

const PACK_KEY_SET: ReadonlySet<string> = new Set(PACK_KEYS);

export function isPackKey(value: string): value is PackKey {
	return PACK_KEY_SET.has(value);
}

export function normalizePackKey(value: string): PackKey | null {
	const normalized = value.trim().toLowerCase().replace(/\s+pack$/, '');
	return isPackKey(normalized) ? normalized : null;
}

export function getPackDefinition(value: string): CanonicalPackDefinition | null {
	const key = normalizePackKey(value);
	return key ? PACK_DEFINITIONS[key] : null;
}

export function getPackRuneCost(value: string): number | null {
	return getPackDefinition(value)?.runeCost ?? null;
}

export function isRuneRedeemablePackKey(value: string): value is RuneRedeemablePackKey {
	return RUNE_REDEEMABLE_PACK_KEYS.some((key) => key === value);
}

export function getRuneExchangePackQuote(input: RuneExchangeQuoteInput): RuneExchangeQuote | null {
	if (!Number.isInteger(input.quantity) || input.quantity < 1) return null;

	const pack = getPackDefinition(input.packType);
	if (!pack || !isRuneRedeemablePackKey(pack.key) || !pack.runeCost) return null;

	return {
		packType: pack.key,
		quantity: input.quantity,
		runeCost: pack.runeCost,
		totalCost: pack.runeCost * input.quantity,
		accountLimit: pack.runeExchangeLimitPerAccount,
		globalPackCap: TESTNET_RUNE_PACK_POOL.packCaps[pack.key],
	};
}

export function getRunePackPoolAllocations(pool: RunePackPoolConfig = TESTNET_RUNE_PACK_POOL): RunePackPoolAllocation[] {
	return RUNE_REDEEMABLE_PACK_KEYS.map((packKey) => {
		const pack = PACK_DEFINITIONS[packKey];
		const packCap = pool.packCaps[packKey];
		const runeCost = pack.runeCost ?? 0;

		return {
			packKey,
			packCap,
			cardInstanceCap: pack.cardCount * packCap,
			runeExposure: runeCost * packCap,
		};
	});
}

export function getRunePackPoolTotals(pool: RunePackPoolConfig = TESTNET_RUNE_PACK_POOL): { packCap: number; cardInstanceCap: number; runeExposure: number } {
	return getRunePackPoolAllocations(pool).reduce(
		(totals, allocation) => ({
			packCap: totals.packCap + allocation.packCap,
			cardInstanceCap: totals.cardInstanceCap + allocation.cardInstanceCap,
			runeExposure: totals.runeExposure + allocation.runeExposure,
		}),
		{ packCap: 0, cardInstanceCap: 0, runeExposure: 0 },
	);
}

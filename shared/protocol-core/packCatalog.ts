/**
 * Canonical pack catalog shared by protocol, server seeds, and client UI.
 *
 * `booster` remains for legacy protocol compatibility. New reward/airdrop
 * flows should prefer `standard` as the canonical 5-card pack.
 */

import type { RuneExchangeQuote, RuneExchangeQuoteInput } from './runeEconomy';
import { fnv1a } from './broadcast-utils';

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
	epicChance: number;
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
		epicChance: 0,
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
		epicChance: 10,
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
		epicChance: 10,
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
		epicChance: 15,
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
		epicChance: 25,
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
		epicChance: 20,
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

export type HbdPackSaleScenarioKey = 'beta_full_cap' | 'beta_2m_tranche' | 'beta_500k_tranche';

export type HbdPackSaleScenario = Readonly<{
	key: HbdPackSaleScenarioKey;
	label: string;
	targetGrossHbd: number;
	priceThousandths: Readonly<Record<RuneRedeemablePackKey, number>>;
	packCaps: Readonly<Record<RuneRedeemablePackKey, number>>;
	notes: string;
}>;

export type HbdPackSaleScenarioTotals = Readonly<{
	key: HbdPackSaleScenarioKey;
	packCap: number;
	cardInstanceCap: number;
	grossThousandths: number;
	grossHbd: number;
}>;

export type HbdPackPurchaseQuoteInput = Readonly<{
	packType: string;
	quantity: number;
}>;

export type HbdPackPurchaseQuote = Readonly<{
	packType: RuneRedeemablePackKey;
	quantity: number;
	unitPriceThousandths: number;
	totalPriceThousandths: number;
	globalPackCap: number;
}>;

export type HbdPackPurchaseMemoInput = Readonly<{
	account: string;
	packType: string;
	quantity: number;
	totalPriceThousandths: number;
}>;

export type ParsedHbdPackPurchaseMemo = Readonly<{
	version: 1;
	account: string;
	packType: RuneRedeemablePackKey;
	quantity: number;
	totalPriceThousandths: number;
	checksum: string;
}>;

export const HBD_CURRENCY_CODE = 'HBD' as const;
export const HBD_PRICE_LOCALE = 'en-US' as const;
export const ACTIVE_HBD_PACK_SALE_SCENARIO_KEY = 'beta_full_cap' satisfies HbdPackSaleScenarioKey;
export const MAX_HBD_PACK_PURCHASE_QUANTITY = 100;
export const HBD_PACK_PURCHASE_MEMO_PREFIX = 'rkpack' as const;

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

const BETA_HBD_PRICE_GRID = {
	standard: 20_000,
	premium: 100_000,
	mythic: 250_000,
} as const satisfies Readonly<Record<RuneRedeemablePackKey, number>>;

export const HBD_PACK_SALE_SCENARIOS = {
	beta_full_cap: {
		key: 'beta_full_cap',
		label: 'Beta full-cap HBD sale capacity',
		targetGrossHbd: 33_000_000,
		priceThousandths: { ...BETA_HBD_PRICE_GRID },
		packCaps: { ...TESTNET_RUNE_PACK_POOL.packCaps },
		notes: 'Full sellout capacity using fixed 20/100/250 HBD beta prices and the canonical pack-cap grid.',
	},
	beta_2m_tranche: {
		key: 'beta_2m_tranche',
		label: 'Beta 2M HBD sale tranche',
		targetGrossHbd: 2_000_000,
		priceThousandths: { ...BETA_HBD_PRICE_GRID },
		packCaps: {
			standard: 6_061,
			premium: 3_636,
			mythic: 6_061,
		},
		notes: 'Launch tranche under the full-cap grid; it preserves the pack mix and does not reduce the global sale caps.',
	},
	beta_500k_tranche: {
		key: 'beta_500k_tranche',
		label: 'Beta 500k HBD sale tranche',
		targetGrossHbd: 500_000,
		priceThousandths: { ...BETA_HBD_PRICE_GRID },
		packCaps: {
			standard: 1_515,
			premium: 909,
			mythic: 1_515,
		},
		notes: 'Smaller sale tranche under the full-cap grid; it preserves the pack mix and does not reduce the global sale caps.',
	},
} as const satisfies Readonly<Record<HbdPackSaleScenarioKey, HbdPackSaleScenario>>;

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

export function getActiveHbdPackSaleScenario(): HbdPackSaleScenario {
	return HBD_PACK_SALE_SCENARIOS[ACTIVE_HBD_PACK_SALE_SCENARIO_KEY];
}

export function getHbdPackPriceThousandths(
	packType: string,
	scenario: HbdPackSaleScenario = getActiveHbdPackSaleScenario(),
): number | null {
	const key = normalizePackKey(packType);
	if (!key || !isRuneRedeemablePackKey(key)) return null;
	return scenario.priceThousandths[key];
}

export function getHbdPackPurchaseQuote(
	input: HbdPackPurchaseQuoteInput,
	scenario: HbdPackSaleScenario = getActiveHbdPackSaleScenario(),
): HbdPackPurchaseQuote | null {
	if (!Number.isInteger(input.quantity) || input.quantity < 1) return null;
	if (input.quantity > MAX_HBD_PACK_PURCHASE_QUANTITY) return null;

	const key = normalizePackKey(input.packType);
	if (!key || !isRuneRedeemablePackKey(key)) return null;

	const pack = PACK_DEFINITIONS[key];
	if (!pack.isActive || !pack.acquisition.includes('direct_purchase')) return null;

	const unitPriceThousandths = scenario.priceThousandths[key];
	return {
		packType: key,
		quantity: input.quantity,
		unitPriceThousandths,
		totalPriceThousandths: unitPriceThousandths * input.quantity,
		globalPackCap: scenario.packCaps[key],
	};
}

export function formatHbdThousandths(priceThousandths: number): string {
	if (!Number.isInteger(priceThousandths) || priceThousandths < 0) {
		throw new Error(`Invalid HBD thousandths value: ${priceThousandths}`);
	}

	const whole = Math.trunc(priceThousandths / 1_000);
	const fraction = priceThousandths % 1_000;
	if (fraction === 0) return whole.toLocaleString(HBD_PRICE_LOCALE);

	const fractionText = fraction
		.toString()
		.padStart(3, '0')
		.replace(/0+$/, '');
	return `${whole.toLocaleString(HBD_PRICE_LOCALE)}.${fractionText}`;
}

export function formatHbdPrice(priceThousandths: number): string {
	return `${formatHbdThousandths(priceThousandths)} ${HBD_CURRENCY_CODE}`;
}

export function formatHbdTransferAmount(priceThousandths: number): string {
	if (!Number.isInteger(priceThousandths) || priceThousandths < 0) {
		throw new Error(`Invalid HBD thousandths value: ${priceThousandths}`);
	}

	const whole = Math.trunc(priceThousandths / 1_000);
	const fraction = priceThousandths % 1_000;
	return `${whole}.${fraction.toString().padStart(3, '0')} ${HBD_CURRENCY_CODE}`;
}

export function createHbdPackPurchaseMemoChecksum(input: HbdPackPurchaseMemoInput): string {
	const packKey = normalizePackKey(input.packType) ?? input.packType;
	return fnv1a([
		HBD_PACK_PURCHASE_MEMO_PREFIX,
		'v1',
		input.account,
		packKey,
		input.quantity,
		input.totalPriceThousandths,
	].join('|')).slice(0, 12);
}

export function buildHbdPackPurchaseMemo(input: HbdPackPurchaseMemoInput): string {
	const packKey = normalizePackKey(input.packType);
	if (!packKey || !isRuneRedeemablePackKey(packKey)) {
		throw new Error(`Invalid HBD pack memo pack type: ${input.packType}`);
	}
	if (!Number.isInteger(input.quantity) || input.quantity < 1) {
		throw new Error(`Invalid HBD pack memo quantity: ${input.quantity}`);
	}
	if (!Number.isInteger(input.totalPriceThousandths) || input.totalPriceThousandths < 1) {
		throw new Error(`Invalid HBD pack memo amount: ${input.totalPriceThousandths}`);
	}
	return [
		HBD_PACK_PURCHASE_MEMO_PREFIX,
		'v1',
		input.account,
		packKey,
		String(input.quantity),
		String(input.totalPriceThousandths),
		createHbdPackPurchaseMemoChecksum({ ...input, packType: packKey }),
	].join(':');
}

export function parseHbdPackPurchaseMemo(memo: string): ParsedHbdPackPurchaseMemo | null {
	const [prefix, version, account, packTypeValue, quantityValue, totalValue, checksum] = memo.trim().split(':');
	if (prefix !== HBD_PACK_PURCHASE_MEMO_PREFIX || version !== 'v1') return null;
	if (!account || !/^[a-z][a-z0-9.-]{2,15}$/.test(account)) return null;
	if (!packTypeValue || !isRuneRedeemablePackKey(packTypeValue)) return null;
	if (!checksum || !/^[a-f0-9]{12}$/.test(checksum)) return null;

	const quantity = Number(quantityValue);
	if (!Number.isInteger(quantity) || quantity < 1) return null;

	const totalPriceThousandths = Number(totalValue);
	if (!Number.isInteger(totalPriceThousandths) || totalPriceThousandths < 1) return null;

	const expectedChecksum = createHbdPackPurchaseMemoChecksum({
		account,
		packType: packTypeValue,
		quantity,
		totalPriceThousandths,
	});
	if (checksum !== expectedChecksum) return null;

	return {
		version: 1,
		account,
		packType: packTypeValue,
		quantity,
		totalPriceThousandths,
		checksum,
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

export function getHbdPackSaleScenarioTotals(
	scenario: HbdPackSaleScenario = getActiveHbdPackSaleScenario(),
): HbdPackSaleScenarioTotals {
	const totals = RUNE_REDEEMABLE_PACK_KEYS.reduce(
		(totals, packKey) => {
			const pack = PACK_DEFINITIONS[packKey];
			const packCap = scenario.packCaps[packKey];
			const priceThousandths = scenario.priceThousandths[packKey];
			return {
				key: scenario.key,
				packCap: totals.packCap + packCap,
				cardInstanceCap: totals.cardInstanceCap + (pack.cardCount * packCap),
				grossThousandths: totals.grossThousandths + (packCap * priceThousandths),
				grossHbd: 0,
			};
		},
		{ key: scenario.key, packCap: 0, cardInstanceCap: 0, grossThousandths: 0, grossHbd: 0 },
	);
	return { ...totals, grossHbd: totals.grossThousandths / 1_000 };
}

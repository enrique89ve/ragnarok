import { describe, expect, it } from 'vitest';
import {
	ADMIN_MINTABLE_PACK_KEYS,
	HBD_PACK_SALE_SCENARIOS,
	PACK_DEFINITIONS,
	PACK_DEFINITION_LIST,
	PACK_RUNE_COSTS,
	PACK_SIZES,
	PUBLIC_PACK_KEYS,
	RUNE_REDEEMABLE_PACK_KEYS,
	TESTNET_RUNE_PACK_POOL,
	formatHbdPrice,
	formatHbdThousandths,
	getActiveHbdPackSaleScenario,
	getHbdPackPriceThousandths,
	getHbdPackSaleScenarioTotals,
	getRuneExchangePackQuote,
	getRunePackPoolAllocations,
	getRunePackPoolTotals,
	normalizePackKey,
} from './packCatalog';
import { TESTNET_RUNE_ECONOMY } from './runeEconomy';

describe('pack catalog', () => {
	it('keeps card counts aligned with slot totals', () => {
		for (const pack of PACK_DEFINITION_LIST) {
			const slotCount = pack.commonSlots + pack.rareSlots + pack.epicSlots + pack.wildcardSlots;

			expect(slotCount).toBe(pack.cardCount);
			expect(PACK_SIZES[pack.key]).toBe(pack.cardCount);
		}
	});

	it('keeps RUNE costs aligned with catalog definitions', () => {
		for (const pack of PACK_DEFINITION_LIST) {
			if (pack.runeCost === null) {
				expect(PACK_RUNE_COSTS[pack.key]).toBeUndefined();
				continue;
			}

			expect(PACK_RUNE_COSTS[pack.key]).toBe(pack.runeCost);
		}
	});

	it('quotes RUNE exchange packs from the canonical catalog', () => {
		expect(getRuneExchangePackQuote({ packType: 'Standard Pack', quantity: 2 })).toEqual({
			packType: 'standard',
			quantity: 2,
			runeCost: 2,
			totalCost: 4,
			accountLimit: 5,
			globalPackCap: 100_000,
		});
		expect(getRuneExchangePackQuote({ packType: 'starter', quantity: 1 })).toBeNull();
		expect(getRuneExchangePackQuote({ packType: 'standard', quantity: 0 })).toBeNull();
	});

	it('uses standard as the active 5-card reward pack', () => {
		expect(PUBLIC_PACK_KEYS).toEqual(['starter', 'standard', 'premium', 'mythic']);
		for (const key of PUBLIC_PACK_KEYS) {
			expect(PACK_DEFINITIONS[key].isActive).toBe(true);
		}
		expect(PACK_DEFINITIONS.starter.freeClaimLimitPerAccount).toBe(1);
		expect(PACK_DEFINITIONS.starter.runeCost).toBeNull();
		expect(PACK_DEFINITIONS.starter.acquisition).toEqual(['free_starter_claim']);
		expect(PACK_DEFINITIONS.starter.adminMintable).toBe(false);
			expect(ADMIN_MINTABLE_PACK_KEYS).not.toContain('starter');
			expect(RUNE_REDEEMABLE_PACK_KEYS).not.toContain('starter');
			expect(PACK_DEFINITIONS.standard.isActive).toBe(true);
			expect(PACK_DEFINITIONS.standard.cardCount).toBe(5);
			expect(PACK_DEFINITIONS.standard.runeCost).toBe(2);
			expect(PACK_DEFINITIONS.standard.runeExchangeLimitPerAccount).toBe(5);
			expect(PACK_DEFINITIONS.premium.runeCost).toBe(7);
			expect(PACK_DEFINITIONS.premium.runeExchangeLimitPerAccount).toBe(3);
			expect(PACK_DEFINITIONS.mythic.runeCost).toBe(20);
			expect(PACK_DEFINITIONS.mythic.runeExchangeLimitPerAccount).toBe(5);
			// Casual onboarding tier: campaign 10 RUNE still affords 1 std + 1 premium with 1 RUNE leftover,
			// preserving the original "campaign-only player can buy a meaningful pack" property.
			const standardCost = PACK_DEFINITIONS.standard.runeCost ?? 0;
			const premiumCost = PACK_DEFINITIONS.premium.runeCost ?? 0;
			const mythicCost = PACK_DEFINITIONS.mythic.runeCost ?? 0;
			const campaignStarterPremiumCost = standardCost + premiumCost;
			expect(campaignStarterPremiumCost).toBeLessThanOrEqual(TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount);
			expect(TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount - campaignStarterPremiumCost).toBe(1);
			expect(mythicCost * PACK_DEFINITIONS.mythic.runeExchangeLimitPerAccount)
				.toBe(TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount);
			// Active-account max budget = campaign 10 + P2P 100 + daily 20 = 130; the new
			// per-account pack limits absorb exactly this budget (5 std + 3 premium + 5 mythic = 131,
			// 1 RUNE over by design so the cap is the binding constraint, not the pack limit).
			const fullBudget = standardCost * PACK_DEFINITIONS.standard.runeExchangeLimitPerAccount
				+ premiumCost * PACK_DEFINITIONS.premium.runeExchangeLimitPerAccount
				+ mythicCost * PACK_DEFINITIONS.mythic.runeExchangeLimitPerAccount;
			expect(fullBudget).toBe(TESTNET_RUNE_ECONOMY.maxRuneScoreBonusInput + 1);
			expect(PACK_DEFINITIONS.booster.isActive).toBe(false);
			expect(PACK_DEFINITIONS.booster.adminMintable).toBe(false);
		});

	it('keeps testnet RUNE exchange pool within the season RUNE cap', () => {
		const allocations = getRunePackPoolAllocations(TESTNET_RUNE_PACK_POOL);
		const totals = getRunePackPoolTotals(TESTNET_RUNE_PACK_POOL);

			expect(allocations).toEqual([
				{ packKey: 'standard', packCap: 100000, cardInstanceCap: 500000, runeExposure: 200000 },
				{ packKey: 'premium', packCap: 60000, cardInstanceCap: 420000, runeExposure: 420000 },
				{ packKey: 'mythic', packCap: 100000, cardInstanceCap: 700000, runeExposure: 2000000 },
			]);
			expect(totals).toEqual({ packCap: 260000, cardInstanceCap: 1620000, runeExposure: 2620000 });
			// Headroom keeps existing capitalist tension: pack pool absorbs ~99.2% of supply,
			// leaving ~20k RUNE locked as a buffer against rounding/replay edge cases.
			expect(totals.runeExposure - TESTNET_RUNE_PACK_POOL.runeCap).toBe(20_000);
			expect(TESTNET_RUNE_PACK_POOL.runeCap).toBe(TESTNET_RUNE_ECONOMY.totalCap);
		});

	it('defines HBD sale capacity and launch tranches', () => {
		expect(getActiveHbdPackSaleScenario()).toBe(HBD_PACK_SALE_SCENARIOS.beta_full_cap);
		expect(HBD_PACK_SALE_SCENARIOS.beta_full_cap.priceThousandths).toEqual({
			standard: 20000,
			premium: 100000,
			mythic: 250000,
		});
		expect(getHbdPackPriceThousandths('Standard Pack')).toBe(20000);
		expect(getHbdPackPriceThousandths('starter')).toBeNull();
		expect(formatHbdThousandths(20000)).toBe('20.000');
		expect(formatHbdPrice(250000)).toBe('250.000 HBD');

		expect(getHbdPackSaleScenarioTotals(HBD_PACK_SALE_SCENARIOS.beta_full_cap)).toEqual({
			key: 'beta_full_cap',
			packCap: 260000,
			cardInstanceCap: 1620000,
			grossThousandths: 33000000000,
			grossHbd: 33000000,
		});
		expect(getHbdPackSaleScenarioTotals(HBD_PACK_SALE_SCENARIOS.beta_2m_tranche)).toEqual({
			key: 'beta_2m_tranche',
			packCap: 15758,
			cardInstanceCap: 98184,
			grossThousandths: 2000070000,
			grossHbd: 2000070,
		});
		expect(getHbdPackSaleScenarioTotals(HBD_PACK_SALE_SCENARIOS.beta_500k_tranche)).toEqual({
			key: 'beta_500k_tranche',
			packCap: 3939,
			cardInstanceCap: 24543,
			grossThousandths: 499950000,
			grossHbd: 499950,
		});
	});

	it('normalizes display names and protocol keys', () => {
		expect(normalizePackKey('Standard Pack')).toBe('standard');
		expect(normalizePackKey('standard')).toBe('standard');
		expect(normalizePackKey('Booster Pack')).toBe('booster');
		expect(normalizePackKey('unknown')).toBeNull();
	});
});

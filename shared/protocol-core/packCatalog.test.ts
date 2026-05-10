import { describe, expect, it } from 'vitest';
import {
	ADMIN_MINTABLE_PACK_KEYS,
	PACK_DEFINITIONS,
	PACK_DEFINITION_LIST,
	PACK_RUNE_COSTS,
	PACK_SIZES,
	PUBLIC_PACK_KEYS,
	RUNE_REDEEMABLE_PACK_KEYS,
	TESTNET_RUNE_PACK_POOL,
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
			expect(PACK_DEFINITIONS.standard.runeExchangeLimitPerAccount).toBe(1);
			expect(PACK_DEFINITIONS.premium.runeCost).toBe(7);
			expect(PACK_DEFINITIONS.premium.runeExchangeLimitPerAccount).toBe(1);
			expect(PACK_DEFINITIONS.mythic.runeCost).toBe(20);
			expect(PACK_DEFINITIONS.mythic.runeExchangeLimitPerAccount).toBe(5);
			const campaignStarterPremiumCost = PACK_DEFINITIONS.standard.runeCost + PACK_DEFINITIONS.premium.runeCost;
			expect(campaignStarterPremiumCost).toBeLessThanOrEqual(TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount);
			expect(TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount - campaignStarterPremiumCost).toBe(1);
			expect(PACK_DEFINITIONS.mythic.runeCost * PACK_DEFINITIONS.mythic.runeExchangeLimitPerAccount)
				.toBe(TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount);
			expect(PACK_DEFINITIONS.booster.isActive).toBe(false);
			expect(PACK_DEFINITIONS.booster.adminMintable).toBe(false);
		});

	it('keeps testnet RUNE exchange pool within the 1M RUNE cap', () => {
		const allocations = getRunePackPoolAllocations(TESTNET_RUNE_PACK_POOL);
		const totals = getRunePackPoolTotals(TESTNET_RUNE_PACK_POOL);

			expect(allocations).toEqual([
				{ packKey: 'standard', packCap: 20000, cardInstanceCap: 100000, runeExposure: 40000 },
				{ packKey: 'premium', packCap: 20000, cardInstanceCap: 140000, runeExposure: 140000 },
				{ packKey: 'mythic', packCap: 100000, cardInstanceCap: 700000, runeExposure: 2000000 },
			]);
			expect(totals).toEqual({ packCap: 140000, cardInstanceCap: 940000, runeExposure: 2180000 });
			expect(totals.runeExposure).toBeLessThanOrEqual(TESTNET_RUNE_PACK_POOL.runeCap);
		});

	it('normalizes display names and protocol keys', () => {
		expect(normalizePackKey('Standard Pack')).toBe('standard');
		expect(normalizePackKey('standard')).toBe('standard');
		expect(normalizePackKey('Booster Pack')).toBe('booster');
		expect(normalizePackKey('unknown')).toBeNull();
	});
});

import { describe, expect, it } from 'vitest';
import {
	RUNE_LOSS_RANKED,
	RUNE_WIN_RANKED,
	TESTNET_RUNE_ECONOMY,
	getCampaignStageRuneTotal,
	getP2PMatchCapacity,
	getRuneEmissionCaps,
} from './runeEconomy';

describe('rune economy', () => {
	it('allocates S01 testnet RUNE emission to P2P and campaign pools', () => {
		expect(getRuneEmissionCaps(TESTNET_RUNE_ECONOMY)).toEqual({
			totalCap: 2_200_000,
			p2pCap: 2_000_000,
			campaignCap: 200_000,
		});
	});

	it('keeps fixed ranked rewards compatible with the P2P cap', () => {
		expect(RUNE_WIN_RANKED).toBe(2);
		expect(RUNE_LOSS_RANKED).toBe(0);
		expect(getP2PMatchCapacity(TESTNET_RUNE_ECONOMY)).toEqual({
			runePerMatch: 2,
			maxMatchesAtCap: 1_000_000,
			avgMatchesPerTargetAccount: 50,
			avgParticipationsPerTargetAccount: 100,
		});
		expect(TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount).toBe(100);
		expect(TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount * TESTNET_RUNE_ECONOMY.targetAccounts)
			.toBe(getRuneEmissionCaps(TESTNET_RUNE_ECONOMY).p2pCap);
	});

	it('caps full campaign completion at 10 RUNE per target account', () => {
		const caps = getRuneEmissionCaps(TESTNET_RUNE_ECONOMY);

		expect(TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount).toBe(10);
		expect(TESTNET_RUNE_ECONOMY.campaignStageRuneRewards).toEqual([2, 2, 2, 2, 1, 1]);
		expect(getCampaignStageRuneTotal(TESTNET_RUNE_ECONOMY)).toBe(10);
		expect(TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount * TESTNET_RUNE_ECONOMY.targetAccounts).toBe(caps.campaignCap);
	});
});

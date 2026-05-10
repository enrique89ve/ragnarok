import { describe, expect, it } from 'vitest';
import {
	RUNE_LOSS_RANKED,
	RUNE_WIN_RANKED,
	TESTNET_RUNE_ECONOMY,
	calculateRuneScoreBonus,
	calculateSeasonRuneEarned,
	calculateSeasonScore,
	createCampaignFirstClearRuneSourceKey,
	createRewardClaimRuneSourceKey,
	getCampaignStageRuneTotal,
	getCampaignFirstClearRuneReward,
	getP2PMatchCapacity,
	getRuneEmissionCaps,
} from './runeEconomy';
import {
	TOURNAMENT_REWARDS,
	getProtocolRewardById,
	getRewardById,
} from './rewardCatalog';

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

	it('derives campaign first-clear rewards and source keys from mission ids', () => {
		expect(createCampaignFirstClearRuneSourceKey(
			'alice',
			'war-of-pantheons',
			'norse-1',
		)).toBe('campaign:S01:alice:war-of-pantheons:norse-1');
		expect(createRewardClaimRuneSourceKey('alice', 'first_victory'))
			.toBe('reward:S01:alice:first_victory');
		expect(getCampaignFirstClearRuneReward('norse-1')).toBe(2);
		expect(getCampaignFirstClearRuneReward('norse-4')).toBe(2);
		expect(getCampaignFirstClearRuneReward('norse-5')).toBe(1);
		expect(getCampaignFirstClearRuneReward('norse-6')).toBe(1);
		expect(getCampaignFirstClearRuneReward('norse-7')).toBe(0);
	});

	it('exposes reward_claim RUNE through one shared protocol catalog', () => {
		expect(TOURNAMENT_REWARDS.length).toBeGreaterThan(0);
		expect(getRewardById('first_victory')?.runeBonus).toBe(50);
		expect(getProtocolRewardById('first_victory')).toEqual({
			id: 'first_victory',
			condition: { type: 'wins_milestone', value: 1 },
			cards: [{ cardId: 20001, rarity: 'rare' }],
			runeBonus: 50,
		});
		expect(getProtocolRewardById('missing')).toBeNull();
	});

	it('calculates Season Score from capped RUNE totals and final ELO', () => {
		expect(calculateSeasonRuneEarned({
			campaignRuneEarned: 999,
			p2pRuneEarned: 999,
		})).toBe(110);
		expect(calculateRuneScoreBonus(110)).toBe(55);
		expect(calculateSeasonScore({
			finalElo: 1420,
			campaignRuneEarned: 10,
			p2pRuneEarned: 100,
		})).toBe(1475);
	});
});

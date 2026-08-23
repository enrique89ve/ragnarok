import { describe, expect, it } from 'vitest';
import {
	RUNE_LOSS_RANKED,
	RUNE_WIN_RANKED,
	TESTNET_RUNE_ECONOMY,
	calculateRuneBalanceTrace,
	calculateRuneScoreBonus,
	calculateSeasonRuneEarned,
	calculateSeasonScore,
	createCampaignFirstClearRuneSourceKey,
	createDailyQuestRuneSourceKey,
	parseDailyQuestRuneSourceKey,
	createP2PRankedMatchSourceKeyPrefix,
	createP2PRankedRuneSourceKey,
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
	it('allocates S01 testnet RUNE emission to P2P, campaign, and daily quest pools', () => {
		expect(getRuneEmissionCaps(TESTNET_RUNE_ECONOMY)).toEqual({
			totalCap: 2_600_000,
			p2pCap: 2_000_000,
			campaignCap: 200_000,
			dailyQuestCap: 400_000,
		});
		expect(TESTNET_RUNE_ECONOMY.p2pCap
			+ TESTNET_RUNE_ECONOMY.campaignCap
			+ TESTNET_RUNE_ECONOMY.dailyQuestCap).toBe(TESTNET_RUNE_ECONOMY.totalCap);
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
			'S01',
		)).toBe('campaign:S01:alice:war-of-pantheons:norse-1');
		expect(createRewardClaimRuneSourceKey('alice', 'first_victory', 'S01'))
			.toBe('reward:S01:alice:first_victory');
		expect(getCampaignFirstClearRuneReward('norse-1')).toBe(2);
		expect(getCampaignFirstClearRuneReward('norse-4')).toBe(2);
		expect(getCampaignFirstClearRuneReward('norse-5')).toBe(1);
		expect(getCampaignFirstClearRuneReward('norse-6')).toBe(1);
		expect(getCampaignFirstClearRuneReward('norse-7')).toBe(0);
	});

	it('derives P2P source keys from match id, role, and balance owner', () => {
		expect(createP2PRankedMatchSourceKeyPrefix('match-123', 'S01'))
			.toBe('p2p:S01:match-123:');
		expect(createP2PRankedRuneSourceKey('match-123', 'winner', 'alice', 'S01'))
			.toBe('p2p:S01:match-123:winner:alice');
		expect(createP2PRankedRuneSourceKey('match-123', 'loser', 'bob', 'S01'))
			.toBe('p2p:S01:match-123:loser:bob');
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

	it('traces RUNE balance before and after ledger movements', () => {
		expect(calculateRuneBalanceTrace({
			balanceBefore: 10,
			direction: 'credit',
			amount: 2,
		})).toEqual({
			balanceBefore: 10,
			balanceAfter: 12,
		});

		expect(calculateRuneBalanceTrace({
			balanceBefore: 10,
			direction: 'debit',
			amount: 2,
		})).toEqual({
			balanceBefore: 10,
			balanceAfter: 8,
		});
	});

	it('calculates Season Score from capped RUNE totals and final ELO', () => {
		expect(calculateSeasonRuneEarned({
			campaignRuneEarned: 999,
			p2pRuneEarned: 999,
			dailyQuestRuneEarned: 999,
		})).toBe(130);
		expect(calculateRuneScoreBonus(130)).toBe(65);
		expect(calculateSeasonScore({
			finalElo: 1420,
			campaignRuneEarned: 10,
			p2pRuneEarned: 100,
			dailyQuestRuneEarned: 20,
		})).toBe(1485);
	});

	it('caps daily quest at 20 RUNE per target account and 400k pool', () => {
		expect(TESTNET_RUNE_ECONOMY.maxDailyQuestRunePerAccount).toBe(20);
		expect(TESTNET_RUNE_ECONOMY.dailyQuestRunePerSlot).toBe(2);
		expect(TESTNET_RUNE_ECONOMY.dailyQuestSlotsPerDay).toBe(3);
		expect(TESTNET_RUNE_ECONOMY.maxDailyQuestRunePerAccount
			* TESTNET_RUNE_ECONOMY.targetAccounts).toBe(TESTNET_RUNE_ECONOMY.dailyQuestCap);
	});

	it('keeps P2P primary at 77% of Season Score bonus input', () => {
		const total = TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount
			+ TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount
			+ TESTNET_RUNE_ECONOMY.maxDailyQuestRunePerAccount;
		expect(total).toBe(TESTNET_RUNE_ECONOMY.maxRuneScoreBonusInput);
		expect(TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount / total)
			.toBeGreaterThanOrEqual(0.76);
	});

	it('derives daily quest source key from account + UTC day + slot', () => {
		expect(createDailyQuestRuneSourceKey('alice', '2026-05-14', 0, 'S01'))
			.toBe('daily_quest:S01:alice:2026-05-14:0');
		expect(createDailyQuestRuneSourceKey('bob', '2026-05-14', 2, 'S01'))
			.toBe('daily_quest:S01:bob:2026-05-14:2');
	});

	it('parses a daily quest source key and rejects malformed keys', () => {
		expect(parseDailyQuestRuneSourceKey('daily_quest:S01:alice:2026-05-14:0')).toEqual({
			seasonId: 'S01',
			account: 'alice',
			ymdUtc: '2026-05-14',
			slot: 0,
		});
		expect(parseDailyQuestRuneSourceKey('reward:S01:alice:first_victory')).toBeNull();
		expect(parseDailyQuestRuneSourceKey('daily_quest:S01:alice:20260514:0')).toBeNull();
	});
});

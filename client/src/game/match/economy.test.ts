import { describe, expect, it } from 'vitest';
import {
	MATCH_ECONOMY,
	POOL_REWARDS,
	getEconomyFootprint,
	modeEconomyToReward,
} from './economy';

describe('POOL_REWARDS', () => {
	it('is a positive finite number', () => {
		expect(POOL_REWARDS).toBeGreaterThan(0);
		expect(Number.isFinite(POOL_REWARDS)).toBe(true);
	});

	it('is normalized to 1.0 (the "100%" reference)', () => {
		expect(POOL_REWARDS).toBe(1.0);
	});
});

describe('MATCH_ECONOMY', () => {
	it('practice has no Match XP, RUNE, or ranking', () => {
		expect(MATCH_ECONOMY.practice).toEqual({
			matchXpShare: 0,
			rune: 'none',
			ranking: 'none',
		});
	});

	it('campaign reduces Match XP to 10% and projects first-clear RUNE', () => {
		expect(MATCH_ECONOMY.campaign.matchXpShare).toBeCloseTo(POOL_REWARDS * 0.10, 10);
		expect(MATCH_ECONOMY.campaign.rune).toBe('campaign_first_clear');
		expect(MATCH_ECONOMY.campaign.ranking).toBe('none');
	});

	it('p2pRanked is full Match XP, ranked RUNE, and ELO', () => {
		expect(MATCH_ECONOMY.p2pRanked.matchXpShare).toBeCloseTo(POOL_REWARDS * 1.0, 10);
		expect(MATCH_ECONOMY.p2pRanked.rune).toBe('p2p_ranked');
		expect(MATCH_ECONOMY.p2pRanked.ranking).toBe('elo');
	});
});

describe('modeEconomyToReward', () => {
	it('maps practice to empty channels', () => {
		expect(modeEconomyToReward(MATCH_ECONOMY.practice)).toEqual({
			matchXp: { kind: 'none' },
			rune: { kind: 'none' },
			ranking: { kind: 'none' },
		});
	});

	it('maps campaign to Match XP share and first-clear RUNE', () => {
		expect(modeEconomyToReward(MATCH_ECONOMY.campaign)).toEqual({
			matchXp: { kind: 'percentage', multiplier: MATCH_ECONOMY.campaign.matchXpShare },
			rune: { kind: 'projected', source: 'campaign_first_clear' },
			ranking: { kind: 'none' },
		});
	});

	it('maps p2pRanked to full Match XP, ranked RUNE, and ELO', () => {
		expect(modeEconomyToReward(MATCH_ECONOMY.p2pRanked)).toEqual({
			matchXp: { kind: 'percentage', multiplier: 1 },
			rune: { kind: 'projected', source: 'p2p_ranked' },
			ranking: { kind: 'elo' },
		});
	});
});

describe('getEconomyFootprint', () => {
	it('returns the sum of Match XP shares', () => {
		expect(getEconomyFootprint()).toBeCloseTo(1.1, 10);
	});
});

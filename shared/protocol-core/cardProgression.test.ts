import { describe, expect, it } from 'vitest';
import { getEconomicLevelForXP, getEconomicXPPerWin, getXPToNextLevel } from './cardProgression';
import { MAX_CARD_LEVEL } from './types';

describe('cardProgression', () => {
	it('caps derived card level while allowing XP to remain an accumulated counter', () => {
		expect(getEconomicLevelForXP('common', 999_999)).toBe(MAX_CARD_LEVEL);
		expect(getXPToNextLevel('common', 999_999)).toBeNull();
	});

	it('returns the remaining XP to reach the next threshold below cap', () => {
		expect(getXPToNextLevel('common', 0)).toBe(50);
		expect(getXPToNextLevel('common', 49)).toBe(1);
	});

	it('falls back to common config for unknown rarity', () => {
		expect(getEconomicXPPerWin('starter')).toBe(getEconomicXPPerWin('common'));
		expect(getEconomicLevelForXP('starter', 50)).toBe(2);
	});
});

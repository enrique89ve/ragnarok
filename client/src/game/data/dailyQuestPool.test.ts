import { describe, expect, it } from 'vitest';
import { LOCAL_GAMEPLAY_QUEST_POOL, pickRandomQuests } from './dailyQuestPool';

describe('local gameplay quest pool', () => {
	it('contains only one-to-two-match objectives', () => {
		for (const quest of LOCAL_GAMEPLAY_QUEST_POOL) {
			expect(['win_games', 'play_minions', 'play_spells', 'deal_damage', 'destroy_minions', 'use_hero_power', 'play_cards']).toContain(quest.type);
		}
		const limits = { win_games: 2, play_minions: 10, play_spells: 5, deal_damage: 30, destroy_minions: 8, use_hero_power: 5, play_cards: 15 } as const;
		for (const quest of LOCAL_GAMEPLAY_QUEST_POOL) expect(quest.goal).toBeLessThanOrEqual(limits[quest.type]);
		expect(pickRandomQuests(3, [], 'stable-seed')).toEqual(pickRandomQuests(3, [], 'stable-seed'));
	});
});

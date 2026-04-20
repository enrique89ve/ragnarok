import { shuffleArray } from '../utils/seededRng';

export type DailyQuestType =
	| 'win_games'
	| 'play_minions'
	| 'play_spells'
	| 'deal_damage'
	| 'destroy_minions'
	| 'use_hero_power'
	| 'play_mythic'
	| 'play_weapons'
	| 'win_with_class'
	| 'play_cards';

export interface QuestTemplate {
	type: DailyQuestType;
	title: string;
	description: string;
	goal: number;
	reward: { rune: number; xp: number };
}

export const QUEST_POOL: QuestTemplate[] = [
	{ type: 'win_games', title: 'Path to Valhalla', description: 'Win {goal} games', goal: 2, reward: { rune: 30, xp: 50 } },
	{ type: 'win_games', title: 'Warrior\'s Triumph', description: 'Win {goal} games', goal: 3, reward: { rune: 50, xp: 75 } },
	{ type: 'win_games', title: 'Conquest of the Realms', description: 'Win {goal} games', goal: 5, reward: { rune: 80, xp: 100 } },
	{ type: 'play_minions', title: 'Army Builder', description: 'Play {goal} minions', goal: 10, reward: { rune: 20, xp: 40 } },
	{ type: 'play_minions', title: 'The Einherjar March', description: 'Play {goal} minions', goal: 20, reward: { rune: 40, xp: 60 } },
	{ type: 'play_spells', title: 'Sorcerer\'s Path', description: 'Cast {goal} spells', goal: 5, reward: { rune: 25, xp: 40 } },
	{ type: 'play_spells', title: 'Runic Mastery', description: 'Cast {goal} spells', goal: 10, reward: { rune: 45, xp: 70 } },
	{ type: 'deal_damage', title: 'Wrath of Thor', description: 'Deal {goal} damage to enemies', goal: 30, reward: { rune: 30, xp: 50 } },
	{ type: 'deal_damage', title: 'Ragnarok\'s Fury', description: 'Deal {goal} damage to enemies', goal: 60, reward: { rune: 60, xp: 80 } },
	{ type: 'destroy_minions', title: 'Slayer of Beasts', description: 'Destroy {goal} enemy minions', goal: 8, reward: { rune: 25, xp: 45 } },
	{ type: 'destroy_minions', title: 'Bane of the Jotnar', description: 'Destroy {goal} enemy minions', goal: 15, reward: { rune: 50, xp: 70 } },
	{ type: 'use_hero_power', title: 'Channel the Gods', description: 'Use your hero power {goal} times', goal: 5, reward: { rune: 20, xp: 35 } },
	{ type: 'use_hero_power', title: 'Divine Authority', description: 'Use your hero power {goal} times', goal: 10, reward: { rune: 40, xp: 60 } },
	{ type: 'play_mythic', title: 'Summon the Aesir', description: 'Play {goal} mythic cards', goal: 2, reward: { rune: 35, xp: 50 } },
	{ type: 'play_mythic', title: 'Pantheon Assembled', description: 'Play {goal} mythic cards', goal: 4, reward: { rune: 60, xp: 80 } },
	{ type: 'play_weapons', title: 'Forge of Brokkr', description: 'Equip {goal} weapons', goal: 3, reward: { rune: 25, xp: 40 } },
	{ type: 'play_cards', title: 'Card Collector', description: 'Play {goal} cards from your hand', goal: 15, reward: { rune: 20, xp: 35 } },
	{ type: 'play_cards', title: 'The Great Saga', description: 'Play {goal} cards from your hand', goal: 30, reward: { rune: 45, xp: 65 } },
];

export function pickRandomQuests(count: number, exclude: string[] = []): QuestTemplate[] {
	const available = QUEST_POOL.filter(q => !exclude.includes(q.title));
	const shuffled = shuffleArray(available);
	return shuffled.slice(0, count);
}

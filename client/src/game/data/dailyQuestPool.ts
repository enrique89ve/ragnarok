import { seededRngFromString, seededShuffle } from '../utils/seededRng';
import type { DailyQuestType } from '@shared/protocol-core/dailyQuest';

export type { DailyQuestType } from '@shared/protocol-core/dailyQuest';

/**
 * QuestTemplate — content + difficulty (goal) + local XP grant.
 *
 * RUNE per slot is NOT stored here: it is a chain-canonical constant from
 * TESTNET_RUNE_ECONOMY.dailyQuestRunePerSlot. The chain never reads quest_type
 * to compute reward, so per-quest RUNE variance is impossible by design —
 * otherwise a player could spoof the most rewarding quest_type on claim.
 */
export interface QuestTemplate {
	type: DailyQuestType;
	title: string;
	description: string;
	goal: number;
	xp: number;
}

export const QUEST_POOL: QuestTemplate[] = [
	{ type: 'win_games', title: 'Path to Valhalla', description: 'Win {goal} games', goal: 2, xp: 50 },
	{ type: 'win_games', title: 'Warrior\'s Triumph', description: 'Win {goal} games', goal: 3, xp: 75 },
	{ type: 'win_games', title: 'Conquest of the Realms', description: 'Win {goal} games', goal: 5, xp: 100 },
	{ type: 'play_minions', title: 'Army Builder', description: 'Play {goal} minions', goal: 10, xp: 40 },
	{ type: 'play_minions', title: 'The Einherjar March', description: 'Play {goal} minions', goal: 20, xp: 60 },
	{ type: 'play_spells', title: 'Sorcerer\'s Path', description: 'Cast {goal} spells', goal: 5, xp: 40 },
	{ type: 'play_spells', title: 'Runic Mastery', description: 'Cast {goal} spells', goal: 10, xp: 70 },
	{ type: 'deal_damage', title: 'Wrath of Thor', description: 'Deal {goal} damage to enemies', goal: 30, xp: 50 },
	{ type: 'deal_damage', title: 'Ragnarok\'s Fury', description: 'Deal {goal} damage to enemies', goal: 60, xp: 80 },
	{ type: 'destroy_minions', title: 'Slayer of Beasts', description: 'Destroy {goal} enemy minions', goal: 8, xp: 45 },
	{ type: 'destroy_minions', title: 'Bane of the Jotnar', description: 'Destroy {goal} enemy minions', goal: 15, xp: 70 },
	{ type: 'use_hero_power', title: 'Channel the Gods', description: 'Use your hero power {goal} times', goal: 5, xp: 35 },
	{ type: 'use_hero_power', title: 'Divine Authority', description: 'Use your hero power {goal} times', goal: 10, xp: 60 },
	{ type: 'play_mythic', title: 'Summon the Aesir', description: 'Play {goal} mythic cards', goal: 2, xp: 50 },
	{ type: 'play_mythic', title: 'Pantheon Assembled', description: 'Play {goal} mythic cards', goal: 4, xp: 80 },
	{ type: 'play_weapons', title: 'Forge of Brokkr', description: 'Equip {goal} weapons', goal: 3, xp: 40 },
	{ type: 'play_cards', title: 'Card Collector', description: 'Play {goal} cards from your hand', goal: 15, xp: 35 },
	{ type: 'play_cards', title: 'The Great Saga', description: 'Play {goal} cards from your hand', goal: 30, xp: 65 },
];

/** Gameplay Validation pool: every assigned target is reachable in 1–2 matches. */
export const LOCAL_GAMEPLAY_QUEST_POOL = QUEST_POOL.filter(quest =>
	(quest.type === 'win_games' && quest.goal <= 2)
	|| (quest.type === 'play_minions' && quest.goal <= 10)
	|| (quest.type === 'play_spells' && quest.goal <= 5)
	|| (quest.type === 'deal_damage' && quest.goal <= 30)
	|| (quest.type === 'destroy_minions' && quest.goal <= 8)
	|| (quest.type === 'use_hero_power' && quest.goal <= 5)
	|| (quest.type === 'play_cards' && quest.goal <= 15),
);

/**
 * Pick `count` quests from the pool deterministically.
 *
 * `seedKey` should incorporate the player identity and the UTC day so
 * the same account sees the same set across browsers/devices on the
 * same day (e.g. `daily:enrique89:2026-05-14`). Two different keys
 * produce uncorrelated sets; the same key always reproduces the
 * exact same picks even after a reload or on a fresh device.
 */
export function pickRandomQuests(
	count: number,
	exclude: string[],
	seedKey: string,
): QuestTemplate[] {
	const available = LOCAL_GAMEPLAY_QUEST_POOL.filter(q => !exclude.includes(q.title));
	const rng = seededRngFromString(seedKey);
	const shuffled = seededShuffle(available, rng);
	return shuffled.slice(0, count);
}

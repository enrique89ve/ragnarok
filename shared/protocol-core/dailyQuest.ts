export const DAILY_QUEST_TYPES = [
	'win_games',
	'play_minions',
	'play_spells',
	'deal_damage',
	'destroy_minions',
	'use_hero_power',
	'play_mythic',
	'play_weapons',
	'win_with_class',
	'play_cards',
] as const;

export type DailyQuestType = typeof DAILY_QUEST_TYPES[number];

const DAILY_QUEST_TYPE_SET: ReadonlySet<string> = new Set(DAILY_QUEST_TYPES);

export function isDailyQuestType(value: unknown): value is DailyQuestType {
	return typeof value === 'string' && DAILY_QUEST_TYPE_SET.has(value);
}

export function utcDayString(timestampMs: number): string {
	const date = new Date(timestampMs);
	if (!Number.isFinite(date.getTime())) return '';
	return date.toISOString().slice(0, 10);
}

/**
 * tournamentRewards.ts - Fixed tournament/milestone reward definitions
 *
 * All rewards are self-serve: players broadcast rp_reward_claim with a reward_id,
 * the replay engine verifies their on-chain stats and mints the reward card.
 * No admin key needed for distribution.
 *
 * Reward cards are minted from the same supply pool as packs.
 * Each reward can only be claimed once per account.
 */

export type RewardConditionType =
	| 'wins_milestone'
	| 'elo_milestone'
	| 'matches_played';

export interface RewardCondition {
	type: RewardConditionType;
	value: number;
}

export interface RewardCardDef {
	cardId: number;
	rarity: string;
	foil?: 'standard' | 'gold';
}

export interface TournamentReward {
	rewardId: string;
	name: string;
	condition: RewardCondition;
	cards: RewardCardDef[];
	runeBonus: number;
}

export const TOURNAMENT_REWARDS: TournamentReward[] = [
	// --- Win milestones ---
	{
		rewardId: 'first_victory',
		name: 'First Victory',
		condition: { type: 'wins_milestone', value: 1 },
		cards: [{ cardId: 20001, rarity: 'rare' }],
		runeBonus: 50,
	},
	{
		rewardId: 'warrior_10',
		name: 'Seasoned Warrior',
		condition: { type: 'wins_milestone', value: 10 },
		cards: [{ cardId: 20010, rarity: 'epic' }],
		runeBonus: 100,
	},
	{
		rewardId: 'warlord_25',
		name: 'Warlord of Asgard',
		condition: { type: 'wins_milestone', value: 25 },
		cards: [{ cardId: 20025, rarity: 'epic' }, { cardId: 20026, rarity: 'rare' }],
		runeBonus: 200,
	},
	{
		rewardId: 'champion_50',
		name: 'Champion of Midgard',
		condition: { type: 'wins_milestone', value: 50 },
		cards: [{ cardId: 20050, rarity: 'mythic' }],
		runeBonus: 500,
	},
	{
		rewardId: 'legend_100',
		name: 'Legend of the Nine Realms',
		condition: { type: 'wins_milestone', value: 100 },
		cards: [{ cardId: 20100, rarity: 'mythic', foil: 'gold' }],
		runeBonus: 1000,
	},

	// --- ELO milestones ---
	{
		rewardId: 'elo_1200',
		name: 'Rising Star',
		condition: { type: 'elo_milestone', value: 1200 },
		cards: [{ cardId: 20101, rarity: 'rare' }],
		runeBonus: 75,
	},
	{
		rewardId: 'elo_1500',
		name: 'Valkyrie\'s Chosen',
		condition: { type: 'elo_milestone', value: 1500 },
		cards: [{ cardId: 20150, rarity: 'epic' }, { cardId: 20151, rarity: 'epic' }],
		runeBonus: 200,
	},
	{
		rewardId: 'elo_1800',
		name: 'Odin\'s Favored',
		condition: { type: 'elo_milestone', value: 1800 },
		cards: [{ cardId: 20200, rarity: 'mythic', foil: 'gold' }],
		runeBonus: 1000,
	},

	// --- Matches played milestones ---
	{
		rewardId: 'veteran_50',
		name: 'Battle-Tested',
		condition: { type: 'matches_played', value: 50 },
		cards: [{ cardId: 20300, rarity: 'rare' }],
		runeBonus: 100,
	},
	{
		rewardId: 'veteran_200',
		name: 'Battle-Hardened',
		condition: { type: 'matches_played', value: 200 },
		cards: [{ cardId: 20301, rarity: 'epic' }],
		runeBonus: 250,
	},
];

export function getRewardById(rewardId: string): TournamentReward | undefined {
	return TOURNAMENT_REWARDS.find(r => r.rewardId === rewardId);
}

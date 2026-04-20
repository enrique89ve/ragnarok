import { CardData } from '../types';

export const recruitCards: CardData[] = [
	{
		id: 95701,
		name: "Einherjar Vanguard",
		manaCost: 7,
		attack: 5,
		health: 4,
		description: "Deathrattle: Recruit an 8-Cost minion.",
		rarity: "common",
		type: "minion",
		keywords: ["deathrattle", "recruit"],
		deathrattle: {
			type: "recruit",
			maxCost: 8,
		},
		collectible: true,
		class: "Neutral"
	},
	{
		id: 95702,
		name: "Summon the Warband",
		manaCost: 6,
		description: "Recruit a minion.",
		rarity: "rare",
		type: "spell",
		keywords: ["recruit"],
		spellEffect: {
			type: "recruit",
			requiresTarget: false,
		},
		class: "Neutral",
		collectible: true
	},
	{
		id: 95703,
		name: "Valhalla Recruiter",
		manaCost: 5,
		attack: 2,
		health: 4,
		description: "Battlecry: Recruit a minion that costs (4) or less.",
		rarity: "common",
		type: "minion",
		keywords: ["battlecry", "recruit"],
		battlecry: {
			type: "recruit",
			requiresTarget: false,
			maxCost: 4,
		},
		collectible: true,
		class: "Neutral"
	},
	{
		id: 95704,
		name: "Yggdrasil Summons",
		manaCost: 4,
		description: "Gain 6 Armor. Recruit a minion that costs (4) or less.",
		rarity: "common",
		type: "spell",
		keywords: ["recruit"],
		spellEffect: {
			type: "gain_armor_and_recruit",
			value: 6,
			requiresTarget: false,
			maxCost: 4,
		},
		class: "Neutral",
		collectible: true
	},
	{
		id: 95705,
		name: "Hel's Servant",
		manaCost: 6,
		attack: 2,
		health: 2,
		description: "Deathrattle: Recruit a Titan.",
		rarity: "rare",
		type: "minion",
		keywords: ["deathrattle", "recruit"],
		deathrattle: {
			type: "recruit",
			recruitRace: "Titan",
		},
		collectible: true,
		class: "Neutral"
	},
	{
		id: 95706,
		name: "Call of Valhalla",
		manaCost: 5,
		description: "Recruit 3 minions that cost (2) or less.",
		rarity: "rare",
		type: "spell",
		keywords: ["recruit"],
		spellEffect: {
			type: "recruit",
			requiresTarget: false,
			recruitCount: 3,
			maxCost: 2,
		},
		class: "Neutral",
		collectible: true
	},
	{
		id: 95707,
		name: "Rally the Einherjar!",
		manaCost: 6,
		description: "Recruit a Beast.",
		rarity: "rare",
		type: "spell",
		keywords: ["recruit"],
		spellEffect: {
			type: "recruit",
			requiresTarget: false,
			recruitRace: "Beast",
		},
		class: "Neutral",
		collectible: true
	}
];

export default recruitCards;

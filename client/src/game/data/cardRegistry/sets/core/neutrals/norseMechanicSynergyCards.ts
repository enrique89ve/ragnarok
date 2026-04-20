import { CardData } from '../../../../../types';

export const norseMechanicSynergyCards: CardData[] = [
	{
		id: 31301,
		name: 'Weaver of Fates',
		manaCost: 3,
		attack: 2,
		health: 4,
		description: 'Whenever a Prophecy countdown ticks, gain +1/+1.',
		flavorText: 'She reads each thread of fate and grows stronger with every turn of the wheel.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		set: 'core',
		collectible: true
	},
	{
		id: 31302,
		name: 'Seidr Channeler',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Whenever you pay Blood Price, deal 2 damage to a random enemy.',
		flavorText: 'Norse sorcery demands blood — and repays it with destruction.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		set: 'core',
		collectible: true
	},
	{
		id: 31303,
		name: 'Bifrost Resonator',
		manaCost: 5,
		attack: 3,
		health: 6,
		description: 'Whenever a Realm Shift occurs, gain +2/+2 and Taunt.',
		flavorText: 'The Rainbow Bridge hums with power when the realms realign.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		set: 'core',
		collectible: true
	},
	{
		id: 31304,
		name: 'Einherjar Oath-Keeper',
		manaCost: 3,
		attack: 3,
		health: 3,
		description: 'Einherjar. Whenever another Einherjar returns to your deck, gain +1/+1.',
		flavorText: 'He keeps count of every warrior who returns to Valhalla — and fights harder each time.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['einherjar'],
		set: 'core',
		collectible: true
	},
	{
		id: 31305,
		name: 'Ragnarok Harbinger',
		manaCost: 6,
		attack: 4,
		health: 6,
		description: 'Battlecry: If you control a Chain pair, give all friendly minions +2/+2.',
		flavorText: 'When the chains of fate link together, the end times draw near — and power surges.',
		type: 'minion',
		rarity: 'mythic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'conditional_buff',
			condition: 'chain_pair_in_play',
			targetType: 'all_friendly_minions',
			requiresTarget: false,
			buffAttack: 2,
			buffHealth: 2
		},
		set: 'core',
		collectible: true
	}
];

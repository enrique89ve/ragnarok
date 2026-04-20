import { CardData } from '../../../../../types';

export const dragonSynergyCards: CardData[] = [
	{
		id: 31201,
		name: 'Nidhogg\'s Disciple',
		manaCost: 2,
		attack: 2,
		health: 3,
		description: 'Battlecry: If you\'re holding a Dragon, gain +1/+1.',
		flavorText: 'Those who serve the serpent beneath Yggdrasil learn patience — and hunger.',
		type: 'minion',
		rarity: 'common',
		race: 'Dragon',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'conditional_buff',
			condition: 'holding_dragon',
			targetType: 'self',
			requiresTarget: false,
			buffAttack: 1,
			buffHealth: 1
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31202,
		name: 'Dragonscale Warden',
		manaCost: 4,
		attack: 3,
		health: 5,
		description: 'Taunt. Battlecry: If you\'re holding a Dragon, gain +2 Health.',
		flavorText: 'Dragon scales make the finest armor — if you can survive harvesting them.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['taunt', 'battlecry'],
		battlecry: {
			type: 'conditional_buff',
			condition: 'holding_dragon',
			targetType: 'self',
			requiresTarget: false,
			buffAttack: 0,
			buffHealth: 2
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31203,
		name: 'Fafnir\'s Hoardkeeper',
		manaCost: 5,
		attack: 4,
		health: 4,
		description: 'Battlecry: If you\'re holding a Dragon, Foresee a Dragon.',
		flavorText: 'Fafnir hoarded gold and wisdom alike — his keeper hoards dragons.',
		type: 'minion',
		rarity: 'epic',
		race: 'Dragon',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'conditional_discover',
			condition: 'holding_dragon',
			discoveryType: 'dragon',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31204,
		name: 'Jormungandr\'s Envoy',
		manaCost: 8,
		attack: 6,
		health: 8,
		description: 'Battlecry: If you\'re holding a Dragon, deal 3 damage to all enemy minions.',
		flavorText: 'The World Serpent sends its emissaries to remind mortals of their place.',
		type: 'minion',
		rarity: 'mythic',
		race: 'Dragon',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'conditional_damage',
			condition: 'holding_dragon',
			value: 3,
			targetType: 'all_enemy_minions',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	}
];

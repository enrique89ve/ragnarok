import { CardData } from '../../../../../types';

export const petSynergyCards: CardData[] = [
	{
		id: 31101,
		name: 'Beast Tamer of Asgard',
		manaCost: 3,
		attack: 2,
		health: 4,
		description: 'Whenever a friendly pet evolves, draw a card.',
		flavorText: 'She whispers to the creatures of the Nine Realms and they answer with loyalty.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		set: 'core',
		collectible: true
	},
	{
		id: 31102,
		name: 'Elemental Harmony',
		manaCost: 2,
		description: 'Give all friendly pets +1/+1. If you control 3+ pets, give +2/+2 instead.',
		flavorText: 'When the elements align, even the smallest creatures become mighty.',
		type: 'spell',
		rarity: 'common',
		class: 'Neutral',
		spellEffect: {
			type: 'buff',
			value: 1,
			targetType: 'friendly_pets',
			buffAttack: 1,
			buffHealth: 1
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31103,
		name: 'Rune of the Wild Bond',
		manaCost: 4,
		description: 'Foresee a pet from your deck. Reduce its evolution requirement by 1.',
		flavorText: 'The rune glows brighter in the presence of untamed spirits.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		spellEffect: {
			type: 'discover_from_deck',
			targetType: 'pet_cards'
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31104,
		name: 'Yggdrasil Beastkeeper',
		manaCost: 5,
		attack: 4,
		health: 5,
		description: 'Your pets have +1 Attack. Battlecry: Summon a random Stage 1 pet.',
		flavorText: 'At the roots of the World Tree, all creatures find sanctuary.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'summon_random',
			targetType: 'random_stage1_pet',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31105,
		name: 'Fenrir\'s Chosen Alpha',
		manaCost: 7,
		attack: 5,
		health: 6,
		description: 'Battlecry: Evolve all your Stage 1 pets to Stage 2. Your Stage 3 pets gain +3/+3.',
		flavorText: 'The alpha howls and every beast in the pack answers with transformation.',
		type: 'minion',
		rarity: 'mythic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'buff',
			targetType: 'friendly_evolved_pets',
			requiresTarget: false,
			buffAttack: 3,
			buffHealth: 3
		},
		set: 'core',
		collectible: true
	}
];

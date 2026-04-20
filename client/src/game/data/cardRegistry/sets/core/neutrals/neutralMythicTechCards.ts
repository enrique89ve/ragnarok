import { CardData } from '../../../../../types';

export const neutralMythicTechCards: CardData[] = [
	{
		id: 31001,
		name: 'Remembrance of Mimir',
		manaCost: 4,
		attack: 3,
		health: 6,
		description: 'Battlecry: Draw a card for each Norse mechanic keyword you control (Blood Price, Einherjar, Prophecy, Ragnarok Chain).',
		flavorText: 'The well remembers what the god forgot — and whispers it to those who listen.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'conditional_draw',
			value: 1,
			targetType: 'none',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31002,
		name: 'Whisper of Hoenir',
		manaCost: 5,
		attack: 4,
		health: 5,
		description: 'Battlecry: Silence all enemy minions. They can\'t gain keywords until your next turn.',
		flavorText: 'A silence so deep it carries the weight of a god\'s unspoken word.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'transform_and_silence',
			targetType: 'all_enemy_minions',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31003,
		name: 'Scales of Forseti',
		manaCost: 6,
		attack: 4,
		health: 7,
		description: 'Battlecry: Both players draw 3 cards. Your cards cost (1) less.',
		flavorText: 'The golden scales of Glitnir weigh all things fairly — but favor the worthy.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'draw',
			value: 3,
			targetType: 'both_players',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31004,
		name: 'Mead of Kvasir',
		manaCost: 3,
		attack: 3,
		health: 3,
		description: 'Battlecry: Foresee a spell from any class. It costs (2) less.',
		flavorText: 'A single sip of the sacred mead grants visions of every spell ever spoken.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'discover',
			discoveryType: 'any_spell',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31005,
		name: 'Ember of Lodur',
		manaCost: 4,
		attack: 3,
		health: 6,
		description: 'At the end of your turn, give your highest-Attack friendly minion +2/+2.',
		flavorText: 'The ember still burns with the warmth the god gave to the first mortals.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		set: 'core',
		collectible: true
	},
	{
		id: 31006,
		name: 'Will of Vili',
		manaCost: 7,
		attack: 5,
		health: 6,
		description: 'Battlecry: Destroy all enemy minions with 2 or less Attack.',
		flavorText: 'The will of Odin\'s brother still echoes — crushing the weak before they rise.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'conditional_damage',
			value: 99,
			targetType: 'enemy_minions_by_attack',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31007,
		name: 'Song of Bragi',
		manaCost: 5,
		attack: 3,
		health: 5,
		description: 'Your spells cost (1) less. Battlecry: Add a random spell from each class to your hand.',
		flavorText: 'The song endures long after the skald has fallen silent.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['battlecry'],
		battlecry: {
			type: 'add_card',
			targetType: 'random_class_spells',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	},
	{
		id: 31008,
		name: 'Oath-Ring of Ull',
		manaCost: 2,
		attack: 2,
		health: 3,
		description: 'Divine Shield. Battlecry: The next spell cast on this minion triggers twice.',
		flavorText: 'Swear upon the ring and your oath becomes unbreakable — as does your shield.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['divine_shield', 'battlecry'],
		battlecry: {
			type: 'grant_persistent_effect',
			targetType: 'self',
			requiresTarget: false
		},
		set: 'core',
		collectible: true
	}
];

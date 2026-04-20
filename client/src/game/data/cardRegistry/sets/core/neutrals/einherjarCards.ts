/**
 * Einherjar Cards
 *
 * Minions with the Einherjar keyword that shuffle a stronger copy
 * into your deck when they die. Norse warriors who fight, die, and
 * rise again in Valhalla — stronger each time. Max 3 returns.
 *
 * ID Range: 30201-30206
 */
import { CardData } from '../../../../../types';

export const einherjarCards: CardData[] = [
	{
		id: 30201,
		name: 'Hadding the Twice-Born',
		manaCost: 1,
		attack: 1,
		health: 2,
		description: 'Einherjar',
		flavorText: 'Raised by Odin himself after his father fell. Saxo Grammaticus records how Hadding died and returned — twice.',
		type: 'minion',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['einherjar'],
		set: 'core',
		collectible: true
	},
	{
		id: 30202,
		name: 'Hervor Shield-Maiden',
		manaCost: 3,
		attack: 2,
		health: 3,
		description: 'Taunt. Einherjar',
		flavorText: 'In the Hervarar saga, Hervor demanded the cursed sword Tyrfing from her father\'s barrow. Death could not hold her then, nor now.',
		type: 'minion',
		rarity: 'common',
		class: 'Warrior',
		keywords: ['einherjar', 'taunt'],
		set: 'core',
		collectible: true
	},
	{
		id: 30203,
		name: 'Bödvar Bjarki',
		manaCost: 2,
		attack: 2,
		health: 2,
		description: 'Einherjar. Battlecry: Draw a card.',
		flavorText: 'The bear-warrior of Hrólfs saga kraka fought in two forms — his spirit-bear raged while his body lay in trance. Each death only freed the bear again.',
		type: 'minion',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['einherjar', 'battlecry'],
		battlecry: {
			type: 'draw',
			value: 1,
			targetType: 'none'
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30204,
		name: 'Einherjar Champion',
		manaCost: 5,
		attack: 4,
		health: 4,
		description: 'Divine Shield. Einherjar',
		flavorText: 'Odin himself blessed this warrior with light that persists beyond death.',
		type: 'minion',
		rarity: 'rare',
		class: 'Paladin',
		keywords: ['einherjar', 'divine_shield'],
		set: 'core',
		collectible: true
	},
	{
		id: 30205,
		name: 'Helgi Hundingsbane',
		manaCost: 4,
		attack: 5,
		health: 2,
		description: 'Rush. Einherjar',
		flavorText: 'Greatest of Odin\'s chosen in the Poetic Edda. Helgi slew King Hunding, died, was reborn, and slew again — the eternal warrior.',
		type: 'minion',
		rarity: 'rare',
		class: 'Berserker',
		keywords: ['einherjar', 'rush'],
		set: 'core',
		collectible: true
	},
	{
		id: 30206,
		name: 'Sigmund the Völsung',
		manaCost: 7,
		attack: 6,
		health: 6,
		description: 'Einherjar. Battlecry: Summon all friendly Einherjar that died this game.',
		flavorText: 'Father of Sigurd, wielder of the sword Odin thrust into the Branstock tree. In the Völsunga saga, his death was merely the beginning.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['einherjar', 'battlecry'],
		battlecry: {
			type: 'summon_dead_einherjar'
		},
		set: 'core',
		collectible: true
	}
];

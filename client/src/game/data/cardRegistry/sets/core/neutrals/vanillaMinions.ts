import { CardData } from '../../../../../types';

/**
 * Vanilla Minions — Pure stat baseline cards with no abilities.
 * These serve as evaluation benchmarks for ability-carrying cards.
 * Stats follow the formula: total stats ≈ (mana cost × 2) + 1 (premium for no text).
 */
export const vanillaMinions: CardData[] = [
	{
		id: 1900,
		name: 'Niflheim Hatchling',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'Born from the mists of Niflheim, it knows only cold silence.',
		type: 'minion',
		rarity: 'basic',
		manaCost: 1,
		attack: 1,
		health: 2,
		class: 'Neutral',
		set: 'core',
		collectible: false
	},
	{
		id: 1901,
		name: 'Midgard Footman',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'Neither god nor giant — just a mortal with a sturdy shield.',
		type: 'minion',
		rarity: 'basic',
		manaCost: 2,
		attack: 2,
		health: 3,
		class: 'Neutral',
		set: 'core',
		collectible: false
	},
	{
		id: 1902,
		name: 'Asgard Recruit',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'Too reckless for the Einherjar, too brave for Midgard.',
		type: 'minion',
		rarity: 'basic',
		manaCost: 2,
		attack: 3,
		health: 2,
		class: 'Neutral',
		set: 'core',
		collectible: false
	},
	{
		id: 1903,
		name: 'Vanaheim Guard',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'The Vanir may prefer peace, but their guards hit hard enough.',
		type: 'minion',
		rarity: 'common',
		manaCost: 3,
		attack: 3,
		health: 4,
		class: 'Neutral',
		set: 'core',
		collectible: false
	},
	{
		id: 1904,
		name: 'Jotunheim Brute',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'Small for a giant. Still bigger than you.',
		type: 'minion',
		rarity: 'common',
		manaCost: 4,
		attack: 4,
		health: 5,
		race: 'Giant',
		class: 'Neutral',
		set: 'core',
		collectible: false
	},
	{
		id: 1905,
		name: 'Muspel Marauder',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'He raids not for treasure, but for the sheer joy of flame.',
		type: 'minion',
		rarity: 'common',
		manaCost: 5,
		attack: 5,
		health: 6,
		class: 'Neutral',
		set: 'core',
		collectible: false
	},
	{
		id: 1906,
		name: 'Svartalfheim Construct',
		description: 'No abilities. Pure stat baseline.',
		flavorText: 'The dwarves of Svartalfheim build, not in flesh, but in stone and rune-forged iron. This one remembers its makers\' commands.',
		type: 'minion',
		rarity: 'common',
		manaCost: 7,
		attack: 7,
		health: 8,
		race: 'Automaton',
		class: 'Neutral',
		set: 'core',
		collectible: false
	}
];

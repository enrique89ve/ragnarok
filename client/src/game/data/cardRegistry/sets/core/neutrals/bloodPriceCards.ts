/**
 * Blood Price Cards
 *
 * Cards that can be played using health instead of mana.
 * Norse sacrifice theme — Odin gave his eye, Tyr gave his hand.
 *
 * ID Range: 30001-30008
 */
import { CardData } from '../../../../../types';

export const bloodPriceCards: CardData[] = [
	{
		id: 30001,
		name: "Odin's Sacrifice",
		manaCost: 5,
		description: 'Draw 3 cards. Gain +2 Spell Damage this turn.',
		flavorText: 'He hung nine days from the World Tree, and in return received all wisdom.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['blood_price'],
		bloodPrice: 8,
		spellEffect: {
			type: 'draw',
			value: 3,
			targetType: 'none',
			bonusEffect: {
				type: 'buff_spell_damage',
				value: 2,
				duration: 1
			}
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30002,
		name: "Tyr's Gambit",
		manaCost: 3,
		attack: 3,
		health: 3,
		description: 'Battlecry: If paid with Blood Price, gain +2/+2.',
		flavorText: 'He placed his hand in the jaws of Fenrir knowing the cost.',
		type: 'minion',
		rarity: 'rare',
		class: 'Warrior',
		keywords: ['blood_price', 'battlecry'],
		bloodPrice: 5,
		battlecry: {
			type: 'conditional_buff',
			condition: 'blood_price_paid',
			buffAttack: 2,
			buffHealth: 2
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30003,
		name: 'Blood Seer',
		manaCost: 2,
		attack: 2,
		health: 3,
		description: 'Battlecry: Foresee a card. If paid with Blood Price, foresee 2.',
		flavorText: 'She reads the future in spilled blood — the more blood, the clearer the vision.',
		type: 'minion',
		rarity: 'rare',
		class: 'Warlock',
		keywords: ['blood_price', 'battlecry'],
		bloodPrice: 4,
		battlecry: {
			type: 'discover',
			requiresTarget: false,
			targetType: 'none'
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30004,
		name: "Norn's Demand",
		manaCost: 4,
		description: 'Restore 6 Health to all friendly minions. Fate demands its price.',
		flavorText: 'The Norns do not bargain. They carve what must be into the trunk of Yggdrasil, and the world obeys.',
		type: 'spell',
		rarity: 'rare',
		class: 'Priest',
		keywords: ['blood_price'],
		bloodPrice: 7,
		spellEffect: {
			type: 'heal',
			value: 6,
			targetType: 'friendly_minions'
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30005,
		name: "Mimir's Eye",
		manaCost: 1,
		description: "Look at your opponent's hand. If paid with Blood Price, copy a random card.",
		flavorText: "Mimir's well holds wisdom — but wisdom always has a price.",
		type: 'spell',
		rarity: 'rare',
		class: 'Mage',
		keywords: ['blood_price'],
		bloodPrice: 3,
		spellEffect: {
			type: 'reveal_hand',
			targetType: 'opponent',
			bonusEffect: {
				type: 'copy_random_card',
				condition: 'blood_price_paid'
			}
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30006,
		name: "Berserker's Oath",
		manaCost: 2,
		attack: 2,
		health: 1,
		description: 'Charge. If paid with Blood Price, gain +3 Attack.',
		flavorText: 'The oath is sealed in blood. The berserker charges without hesitation.',
		type: 'minion',
		rarity: 'common',
		class: 'Berserker',
		keywords: ['blood_price', 'charge'],
		bloodPrice: 4,
		set: 'core',
		collectible: true
	},
	{
		id: 30007,
		name: "Valkyrie's Tithe",
		manaCost: 6,
		attack: 6,
		health: 6,
		description: 'Taunt. Battlecry: If paid with Blood Price, summon a copy. Prove your warrior spirit.',
		flavorText: 'The Valkyries choose only those who bleed willingly. To be taken to Valhalla, one must first offer the tithe.',
		type: 'minion',
		rarity: 'epic',
		class: 'Neutral',
		keywords: ['blood_price', 'taunt', 'battlecry'],
		bloodPrice: 10,
		battlecry: {
			type: 'summon_copy_if_blood',
			condition: 'blood_price_paid'
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30008,
		name: "Hel's Toll",
		manaCost: 3,
		description: 'Destroy a minion. If paid with Blood Price, also resurrect a friendly minion.',
		flavorText: 'Hel collects her toll from both the living and the dead.',
		type: 'spell',
		rarity: 'rare',
		class: 'Necromancer',
		keywords: ['blood_price'],
		bloodPrice: 5,
		spellEffect: {
			type: 'destroy',
			targetType: 'any_minion',
			requiresTarget: true,
			bonusEffect: {
				type: 'resurrect_friendly',
				condition: 'blood_price_paid'
			}
		},
		set: 'core',
		collectible: true
	}
];

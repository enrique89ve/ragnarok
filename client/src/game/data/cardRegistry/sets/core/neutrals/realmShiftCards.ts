/**
 * Realm Shift Cards
 *
 * Spells that change the active realm, creating board-wide rule changes.
 * Only one realm can be active at a time — a new realm replaces the old.
 * Both players are affected by the active realm.
 *
 * ID Range: 30301-30309
 */
import { CardData } from '../../../../../types';

export const realmShiftCards: CardData[] = [
	{
		id: 30301,
		name: 'Gate to Niflheim',
		manaCost: 3,
		description: 'Realm Shift: All minions have -2 Attack. Freeze effects last an extra turn.',
		flavorText: 'The realm of ice and mist. Even the bravest warriors slow to a crawl.',
		type: 'spell',
		rarity: 'common',
		class: 'Shaman',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'niflheim',
			realmName: 'Niflheim',
			realmDescription: 'All minions have -2 Attack.',
			realmEffects: [
				{ type: 'debuff_all_attack', value: 2, target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30302,
		name: 'Gate to Muspelheim',
		manaCost: 3,
		description: 'Realm Shift: All minions take 1 damage at end of each turn.',
		flavorText: 'The realm of fire. Nothing survives the heat for long.',
		type: 'spell',
		rarity: 'common',
		class: 'Mage',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'muspelheim',
			realmName: 'Muspelheim',
			realmDescription: 'All minions take 1 damage at end of turn.',
			realmEffects: [
				{ type: 'damage_all_end_turn', value: 1, target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30303,
		name: 'Gate to Asgard',
		manaCost: 4,
		description: 'Realm Shift: Your minions have +1 Attack. Enemy spells cost (1) more.',
		flavorText: 'The golden realm of the gods shines its favor upon you.',
		type: 'spell',
		rarity: 'rare',
		class: 'Paladin',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'asgard',
			realmName: 'Asgard',
			realmDescription: 'Your minions have +1 Attack. Enemy spells cost (1) more.',
			realmEffects: [
				{ type: 'buff_all_attack', value: 1, target: 'friendly' },
				{ type: 'cost_increase', value: 1, target: 'enemy' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30304,
		name: 'Gate to Helheim',
		manaCost: 4,
		description: 'Realm Shift: Deathrattles don\'t trigger. Dead minions are banished.',
		flavorText: 'Baldur could not return from Helheim. Nothing can. The dead stay dead in Hel\'s domain.',
		type: 'spell',
		rarity: 'rare',
		class: 'Necromancer',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'helheim',
			realmName: 'Helheim',
			realmDescription: 'Deathrattles don\'t trigger. Dead minions are banished.',
			realmEffects: [
				{ type: 'banish_on_death', target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30305,
		name: 'Gate to Vanaheim',
		manaCost: 3,
		description: 'Realm Shift: All minions restore 2 Health at start of each turn.',
		flavorText: 'The realm of the Vanir, where nature heals all wounds.',
		type: 'spell',
		rarity: 'common',
		class: 'Druid',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'vanaheim',
			realmName: 'Vanaheim',
			realmDescription: 'All minions restore 2 Health at start of turn.',
			realmEffects: [
				{ type: 'heal_all_start_turn', value: 2, target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30306,
		name: 'Gate to Jotunheim',
		manaCost: 4,
		description: 'Realm Shift: All minions have +2 Attack but -1 Health.',
		flavorText: 'In the land of giants, only the strong survive.',
		type: 'spell',
		rarity: 'rare',
		class: 'Warrior',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'jotunheim',
			realmName: 'Jotunheim',
			realmDescription: 'All minions have +2 Attack but -1 Health.',
			realmEffects: [
				{ type: 'buff_all_attack', value: 2, target: 'all' },
				{ type: 'debuff_all_health', value: 1, target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30307,
		name: 'Gate to Alfheim',
		manaCost: 4,
		description: 'Realm Shift: All minions have Elusive (can\'t be targeted by spells).',
		flavorText: 'The light elves weave enchantments that shield all living things.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'alfheim',
			realmName: 'Alfheim',
			realmDescription: 'All minions have Elusive.',
			realmEffects: [
				{ type: 'keyword_grant', value: 0, target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30308,
		name: 'Gate to Svartalfheim',
		manaCost: 3,
		description: 'Realm Shift: Newly played minions have Stealth until they attack.',
		flavorText: 'In the realm of dark elves, shadows cling to everything.',
		type: 'spell',
		rarity: 'common',
		class: 'Rogue',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'svartalfheim',
			realmName: 'Svartalfheim',
			realmDescription: 'Newly played minions have Stealth.',
			realmEffects: [
				{ type: 'stealth_on_play', value: 0, target: 'all' }
			]
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30309,
		name: 'Gate to Midgard',
		manaCost: 2,
		description: 'Remove the active realm. Restore all minions to base stats.',
		flavorText: 'The mortal realm rejects the influence of the gods.',
		type: 'spell',
		rarity: 'common',
		class: 'Neutral',
		keywords: [],
		spellEffect: {
			type: 'realm_shift',
			realmId: 'midgard',
			realmName: 'Midgard',
			realmDescription: 'No realm active. Minions restored to base stats.',
			realmEffects: []
		},
		set: 'core',
		collectible: true
	}
];

/**
 * Prophecy Cards
 *
 * Spells that create visible countdown timers. When the countdown reaches 0,
 * the effect triggers — both players can see and plan around them.
 *
 * ID Range: 30101-30107
 */
import { CardData } from '../../../../../types';

export const prophecyCards: CardData[] = [
	{
		id: 30101,
		name: "Norn's Decree",
		manaCost: 3,
		description: 'Prophecy (3): Destroy all minions with 3 or less Attack.',
		flavorText: 'The Norns have spoken. In three turns, the weak shall perish.',
		type: 'spell',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: "Norn's Decree",
			prophecyDescription: 'Destroy all minions with 3 or less Attack',
			turnsRemaining: 3,
			resolveEffect: { type: 'destroy_low_attack', threshold: 3 }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30102,
		name: "Heimdall's Warning",
		manaCost: 4,
		description: 'Prophecy (2): Deal 5 damage to both heroes.',
		flavorText: 'When Heimdall raises Gjallarhorn to his lips, all Nine Realms hear the blast. Ragnarok approaches.',
		type: 'spell',
		rarity: 'common',
		class: 'Neutral',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: "Heimdall's Warning",
			prophecyDescription: 'Deal 5 damage to both heroes',
			turnsRemaining: 2,
			resolveEffect: { type: 'damage_both_heroes', value: 5 }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30103,
		name: 'Fimbulwinter',
		manaCost: 5,
		description: 'Prophecy (3): Freeze ALL minions for 2 turns.',
		flavorText: 'Three winters with no summer between them. The prelude to Ragnarok.',
		type: 'spell',
		rarity: 'rare',
		class: 'Shaman',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: 'Fimbulwinter',
			prophecyDescription: 'Freeze ALL minions for 2 turns',
			turnsRemaining: 3,
			resolveEffect: { type: 'freeze_all_minions', duration: 2 }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30104,
		name: 'Twilight of the Gods',
		manaCost: 8,
		description: 'Prophecy (4): Destroy ALL minions and weapons.',
		flavorText: 'When the stars fall and the sun is swallowed, nothing remains.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: 'Twilight of the Gods',
			prophecyDescription: 'Destroy ALL minions and weapons',
			turnsRemaining: 4,
			resolveEffect: { type: 'destroy_all' }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30105,
		name: "Baldur's Doom",
		manaCost: 3,
		description: 'Prophecy (2): Restore 8 Health to your hero.',
		flavorText: "Even Baldur's death carried the seed of renewal.",
		type: 'spell',
		rarity: 'common',
		class: 'Priest',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: "Baldur's Doom",
			prophecyDescription: 'Restore 8 Health to your hero',
			turnsRemaining: 2,
			resolveEffect: { type: 'heal', value: 8, targetType: 'friendly_hero' }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30106,
		name: 'Fenrir Unbound',
		manaCost: 6,
		description: 'Prophecy (3): Summon an 8/8 Fenrir with Rush.',
		flavorText: 'The chains weaken. Gleipnir frays. When the wolf breaks free, Asgard trembles.',
		type: 'spell',
		rarity: 'rare',
		class: 'Warlock',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: 'Fenrir Unbound',
			prophecyDescription: 'Summon an 8/8 Fenrir with Rush',
			turnsRemaining: 3,
			resolveEffect: { type: 'summon', summonName: 'Fenrir', summonAttack: 8, summonHealth: 8, keywords: ['rush'] }
		},
		set: 'core',
		collectible: true
	},
	{
		id: 30107,
		name: "Surtr's March",
		manaCost: 4,
		description: 'Prophecy (2): Deal 3 damage to all enemy minions.',
		flavorText: 'The fire giant marches from Muspelheim. His arrival is inevitable.',
		type: 'spell',
		rarity: 'rare',
		class: 'Neutral',
		keywords: ['prophecy'],
		spellEffect: {
			type: 'create_prophecy',
			prophecyName: "Surtr's March",
			prophecyDescription: 'Deal 3 damage to all enemy minions',
			turnsRemaining: 2,
			resolveEffect: { type: 'aoe_damage', value: 3, targetType: 'all_enemy_minions' }
		},
		set: 'core',
		collectible: true
	}
];

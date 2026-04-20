/**
 * baseHeroes.ts
 *
 * Free starter heroes — one per chess piece slot (queen, rook, bishop, knight).
 * Lower power than premium heroes but fully playable. 100 HP, no summons.
 * Inspired by legendary Norse mortals rather than gods.
 */

import { NorseHero } from '../../types/NorseTypes';

export const BASE_HEROES: Record<string, NorseHero> = {

	// ==================== QUEEN SLOT — Erik Flameheart (Mage) ====================
	'hero-erik-flameheart': {
		id: 'hero-erik-flameheart',
		name: 'Erik Flameheart',
		title: 'The Scorched',
		element: 'fire',
		weakness: 'water',
		startingHealth: 100,
		description: 'A berserker-mage who channels fire through his own blood, burning brighter as he suffers.',
		lore: 'Cast out from his clan for setting their longhouse ablaze during a nightmare, Erik learned to weaponize his curse. Every scar on his body tells the story of a spell that almost killed him.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'mage',
		heroPower: {
			id: 'erik-flameheart-power',
			name: 'Scorching Burst',
			description: 'Deal 2 damage to an enemy. Take 1 damage.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'damage_single',
			value: 2,
			selfDamage: 1
		},
		weaponUpgrade: {
			id: 90100,
			name: "Ember's Fury",
			heroId: 'hero-erik-flameheart',
			manaCost: 5,
			description: 'Deal 3 damage to all enemies. Take 2 damage. Upgrade your hero power.',
			immediateEffect: {
				type: 'damage_aoe',
				value: 3,
				description: 'Deal 3 damage to all enemies. Take 2 damage.'
			},
			upgradedPowerId: 'erik-flameheart-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'erik-flameheart-power-upgraded',
			name: 'Scorching Burst+',
			description: 'Deal 3 damage to an enemy. Take 1 damage.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'damage_single',
			value: 3,
			selfDamage: 1,
			isUpgraded: true,
			baseHeroPowerId: 'erik-flameheart-power'
		},
		passive: {
			id: 'erik-flameheart-passive',
			name: "Ember's Legacy",
			description: 'After taking damage, your next hero power deals +1 damage.',
			trigger: 'on_hero_damage',
			effectType: 'spell_damage_bonus',
			value: 1
		}
	},

	// ==================== ROOK SLOT — Ragnar Ironside (Warrior) ====================
	'hero-ragnar-ironside': {
		id: 'hero-ragnar-ironside',
		name: 'Ragnar Ironside',
		title: 'Jarl of the North Sea',
		element: 'water',
		weakness: 'electric',
		startingHealth: 100,
		description: 'A legendary raider whose iron will is matched only by his iron shield.',
		lore: 'They say Ragnar sailed through a storm that sank thirty longships, arriving at the enemy shore with his shield arm unbroken. His crew followed him not out of fear, but because he always bled first.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'warrior',
		heroPower: {
			id: 'ragnar-ironside-power',
			name: 'Iron Guard',
			description: 'Gain 3 Armor.',
			cost: 2,
			targetType: 'none',
			effectType: 'gain_armor',
			armorValue: 3
		},
		weaponUpgrade: {
			id: 90101,
			name: 'Tidal Bulwark',
			heroId: 'hero-ragnar-ironside',
			manaCost: 5,
			description: 'Gain 6 Armor. Deal 2 damage to all enemies. Upgrade your hero power.',
			immediateEffect: {
				type: 'gain_armor_and_damage',
				armorValue: 6,
				value: 2,
				description: 'Gain 6 Armor. Deal 2 damage to all enemies.'
			},
			upgradedPowerId: 'ragnar-ironside-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'ragnar-ironside-power-upgraded',
			name: 'Iron Guard+',
			description: 'Gain 4 Armor. Deal 1 damage to a random enemy.',
			cost: 2,
			targetType: 'none',
			effectType: 'gain_armor',
			armorValue: 4,
			secondaryValue: 1,
			isUpgraded: true,
			baseHeroPowerId: 'ragnar-ironside-power'
		},
		passive: {
			id: 'ragnar-ironside-passive',
			name: "Raider's Resolve",
			description: 'After taking damage, gain 1 Armor.',
			trigger: 'on_hero_damage',
			effectType: 'gain_armor',
			value: 1
		}
	},

	// ==================== BISHOP SLOT — Brynhild Shieldmaiden (Priest) ====================
	'hero-brynhild': {
		id: 'hero-brynhild',
		name: 'Brynhild',
		title: 'The Defiant',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'A valkyrie who defied Odin and was cast down, now healing those the gods abandoned.',
		lore: 'Stripped of her wings for sparing a warrior Odin had marked for death, Brynhild walks among mortals. Her light still burns, but dimmer now — enough to mend, never enough to soar.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'priest',
		heroPower: {
			id: 'brynhild-power',
			name: 'Defiant Light',
			description: 'Restore 3 Health to a friendly character.',
			cost: 2,
			targetType: 'friendly_character',
			effectType: 'heal',
			value: 3
		},
		weaponUpgrade: {
			id: 90102,
			name: 'Radiant Chains',
			heroId: 'hero-brynhild',
			manaCost: 5,
			description: 'Restore 4 Health to all friendly characters. Upgrade your hero power.',
			immediateEffect: {
				type: 'heal_all_friendly',
				value: 4,
				description: 'Restore 4 Health to all friendly characters.'
			},
			upgradedPowerId: 'brynhild-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'brynhild-power-upgraded',
			name: 'Defiant Light+',
			description: 'Restore 4 Health to a friendly character. Give it +1 Attack this turn.',
			cost: 2,
			targetType: 'friendly_character',
			effectType: 'heal',
			value: 4,
			secondaryValue: 1,
			isUpgraded: true,
			baseHeroPowerId: 'brynhild-power'
		},
		passive: {
			id: 'brynhild-passive',
			name: "Martyr's Light",
			description: 'When you heal a character, it gains +1 Attack this turn.',
			trigger: 'on_heal',
			effectType: 'buff_attack',
			value: 1
		}
	},

	// ==================== KNIGHT SLOT — Sigurd Dragonbane (Rogue) ====================
	'hero-sigurd': {
		id: 'hero-sigurd',
		name: 'Sigurd',
		title: 'The Dragonbane',
		element: 'fire',
		weakness: 'ice',
		startingHealth: 100,
		description: 'The mortal who slew Fafnir and bathed in dragon blood, gaining near-invulnerability.',
		lore: 'When Sigurd plunged Gram into the dragon Fafnir, he tasted the serpent\'s blood and heard the speech of birds. They warned him of treachery, but a dragonslayer fears nothing that walks on two legs.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'rogue',
		heroPower: {
			id: 'sigurd-power',
			name: "Dragon's Mark",
			description: 'Deal 2 damage to an enemy.',
			cost: 2,
			targetType: 'enemy_character',
			effectType: 'damage_single',
			value: 2
		},
		weaponUpgrade: {
			id: 90103,
			name: "Gram, Odin's Gift",
			heroId: 'hero-sigurd',
			manaCost: 5,
			description: 'Deal 4 damage to an enemy. If it dies, deal 2 damage to adjacent enemies. Upgrade your hero power.',
			immediateEffect: {
				type: 'damage',
				value: 4,
				targetType: 'enemy_character',
				description: 'Deal 4 damage to an enemy. If it dies, deal 2 damage to adjacent enemies.'
			},
			upgradedPowerId: 'sigurd-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'sigurd-power-upgraded',
			name: "Dragon's Mark+",
			description: 'Deal 3 damage to an enemy.',
			cost: 2,
			targetType: 'enemy_character',
			effectType: 'damage_single',
			value: 3,
			isUpgraded: true,
			baseHeroPowerId: 'sigurd-power'
		},
		passive: {
			id: 'sigurd-passive',
			name: "Dragonblood",
			description: 'When a friendly minion attacks, it deals +1 damage.',
			trigger: 'on_minion_attack',
			effectType: 'damage_bonus',
			value: 1
		}
	}
};

export function getBaseHeroById(id: string): NorseHero | undefined {
	return BASE_HEROES[id];
}

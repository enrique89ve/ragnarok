/**
 * egyptianHeroes.ts
 *
 * Definitions for Egyptian Heroes in Ragnarok Poker.
 * These heroes draw from ancient Egyptian mythology with unique mechanics.
 */

import { NorseHero } from '../../types/NorseTypes';

// ==================== EGYPTIAN HEROES (5 Heroes) ====================

export const EGYPTIAN_HEROES: Record<string, NorseHero> = {

	// ==================== 1. AMMIT - Conditional Destruction ====================
	'hero-ammit': {
		id: 'hero-ammit',
		name: 'Ammit',
		title: 'Devourer of the Dead',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'The fearsome chimera who waits beside the Scales of Ma\'at, ready to consume the hearts of the unworthy.',
		lore: 'Ammit has the head of a crocodile, the forequarters of a lion, and the hindquarters of a hippopotamus — three of the largest man-eating animals known to the ancient Egyptians. She crouches beside Anubis during the Weighing of the Heart ceremony. If a soul\'s heart is heavier than the Feather of Truth, Ammit devours it whole, and that soul ceases to exist forever. She is not evil — she is the final consequence of a life lived without virtue.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'warlock',
		heroPower: {
			id: 'ammit-power',
			name: 'Devour the Unworthy',
			description: 'Destroy an enemy minion with 2 or less Attack.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'conditional_destroy',
			condition: { maxAttack: 2 }
		},
		weaponUpgrade: {
			id: 90050,
			name: 'Jaws of Judgment',
			heroId: 'hero-ammit',
			manaCost: 5,
			description: 'Destroy all enemy minions with 3 or less Attack. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'conditional_destroy_all',
				condition: { maxAttack: 3 },
				description: 'Destroy all enemy minions with 3 or less Attack.'
			},
			upgradedPowerId: 'ammit-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'ammit-power-upgraded',
			name: 'Devour the Unworthy+',
			description: 'Destroy an enemy minion with 3 or less Attack.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'conditional_destroy',
			condition: { maxAttack: 3 },
			isUpgraded: true,
			baseHeroPowerId: 'ammit-power'
		},
		passive: {
			id: 'ammit-passive',
			name: 'Soul Feast',
			description: 'Restore 1 health to your hero when an enemy minion dies.',
			trigger: 'on_enemy_death',
			effectType: 'heal_hero',
			value: 1
		}
	},

	// ==================== 2. MA'AT - Stat Transformation ====================
	'hero-maat': {
		id: 'hero-maat',
		name: "Ma'at",
		title: 'Goddess of Truth and Balance',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'The goddess who personifies cosmic order, truth, justice, and the fundamental balance of the universe.',
		lore: 'Ma\'at is not merely a goddess — she is the concept of cosmic order itself made divine. Her feather is placed on the Scales of Justice against the hearts of the dead. Pharaohs ruled in her name, and the collapse of Ma\'at meant the collapse of civilization. She does not punish or reward — she simply is. All things in her presence are reduced to their true measure, neither more nor less than they deserve.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'priest',
		heroPower: {
			id: 'maat-power',
			name: 'Scales of Truth',
			description: 'Set a minion\'s Attack and Health to 2.',
			cost: 2,
			targetType: 'any_minion',
			effectType: 'set_stats',
			value: 2
		},
		weaponUpgrade: {
			id: 90051,
			name: 'Feather of Justice',
			heroId: 'hero-maat',
			manaCost: 5,
			description: 'Set all enemy minions\' Attack and Health to 2. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'set_stats_all_enemies',
				value: 2,
				description: 'Set all enemy minions\' Attack and Health to 2.'
			},
			upgradedPowerId: 'maat-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'maat-power-upgraded',
			name: 'Scales of Truth+',
			description: 'Set a minion\'s Attack and Health to 3.',
			cost: 2,
			targetType: 'any_minion',
			effectType: 'set_stats',
			value: 3,
			isUpgraded: true,
			baseHeroPowerId: 'maat-power'
		},
		passive: {
			id: 'maat-passive',
			name: 'Cosmic Equilibrium',
			description: 'At the end of your turn, if you have an even number of minions, draw a card.',
			trigger: 'end_of_turn',
			condition: { evenMinions: true },
			effectType: 'draw_card',
			value: 1
		}
	},

	// ==================== 3. SERQET - Poison Application ====================
	'hero-serqet': {
		id: 'hero-serqet',
		name: 'Serqet',
		title: 'Scorpion Goddess',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'The goddess of scorpions, venom, and healing — she who tightens the throat and also loosens it.',
		lore: 'Serqet guards the canopic jars that hold the organs of the dead and protects against venomous bites. Her priests were the first physicians, for to command poison is to command its cure. Seven scorpions accompany her wherever she walks, and those who cross her path find their breath stolen away. But she is also invoked by the desperate — for she can withdraw the venom as easily as she delivers it.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'rogue',
		heroPower: {
			id: 'serqet-power',
			name: "Scorpion's Sting",
			description: 'Deal 1 damage to an enemy minion and apply Poison (destroy it if damaged again this turn).',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'damage_and_poison',
			value: 1
		},
		weaponUpgrade: {
			id: 90052,
			name: 'Venomous Tail',
			heroId: 'hero-serqet',
			manaCost: 5,
			description: 'Deal 2 damage to all enemy minions and apply Poison. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'aoe_damage_poison',
				value: 2,
				description: 'Deal 2 damage to all enemy minions and apply Poison.'
			},
			upgradedPowerId: 'serqet-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'serqet-power-upgraded',
			name: "Scorpion's Sting+",
			description: 'Deal 2 damage to an enemy minion and apply Poison.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'damage_and_poison',
			value: 2,
			isUpgraded: true,
			baseHeroPowerId: 'serqet-power'
		},
		passive: {
			id: 'serqet-passive',
			name: 'Venom Siphon',
			description: 'Restore 1 health to your hero when an enemy minion has Poison applied.',
			trigger: 'on_poison_applied',
			effectType: 'heal_hero',
			value: 1
		}
	},

	// ==================== 4. KHEPRI - Dawn Regeneration ====================
	'hero-khepri': {
		id: 'hero-khepri',
		name: 'Khepri',
		title: 'Scarab of Wrath',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'The scarab-headed god reborn as a hunter of fiends, consuming enemy souls to fuel his burning radiance.',
		lore: 'Each morning Khepri rolls the newborn sun across the horizon. But when the fiends of the Duat spilled forth, Khepri turned his solar fire inward — burning away his gentle nature to become a weapon of blinding wrath. Now the scarab devours darkness itself.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'berserker',
		heroPower: {
			id: 'khepri-power',
			name: 'Soul Devour',
			description: 'Deal 1 damage to an enemy minion. If it dies, gain +1 Attack permanently.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'damage_single',
			value: 1,
			secondaryValue: 1
		},
		weaponUpgrade: {
			id: 90053,
			name: 'Wings of the Burning Scarab',
			heroId: 'hero-khepri',
			manaCost: 5,
			description: 'Deal 3 damage to all enemy minions. Gain +1 Attack for each killed. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'damage_aoe',
				value: 3,
				description: 'Deal 3 damage to all enemy minions. Gain +1 Attack for each killed.'
			},
			upgradedPowerId: 'khepri-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'khepri-power-upgraded',
			name: 'Soul Devour+',
			description: 'Deal 2 damage to an enemy minion. If it dies, gain +2 Attack permanently.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'damage_single',
			value: 2,
			secondaryValue: 2,
			isUpgraded: true,
			baseHeroPowerId: 'khepri-power'
		},
		passive: {
			id: 'khepri-passive',
			name: 'Devouring Light',
			description: 'Whenever an enemy minion dies, deal 1 damage to the enemy hero.',
			trigger: 'on_enemy_minion_death',
			effectType: 'damage_hero',
			value: 1
		}
	},

};

// Export hero count for validation
export const EGYPTIAN_HERO_COUNT = Object.keys(EGYPTIAN_HEROES).length;

// Helper function to get Egyptian hero by ID
export function getEgyptianHeroById(id: string): NorseHero | undefined {
	return EGYPTIAN_HEROES[id];
}

// Get all Egyptian heroes as an array
export function getAllEgyptianHeroes(): NorseHero[] {
	return Object.values(EGYPTIAN_HEROES);
}

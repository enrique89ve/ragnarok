/**
 * japaneseHeroes.ts
 *
 * Definitions for Japanese (Shinto) Heroes in Ragnarok Poker.
 * These heroes draw from Shinto mythology with unique mechanics.
 */

import { NorseHero } from '../../types/NorseTypes';

// ==================== JAPANESE (SHINTO) HEROES (5 Heroes) ====================

export const JAPANESE_HEROES: Record<string, NorseHero> = {

	// ==================== 1. IZANAMI - Sacrifice Mechanic ====================
	'hero-izanami': {
		id: 'hero-izanami',
		name: 'Izanami',
		title: 'She Who Invites',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'The primordial goddess of creation and death, ruler of Yomi, the land of the dead.',
		lore: 'Izanami and her husband Izanagi stirred the primordial ocean with a jeweled spear, creating the islands of Japan. When she died giving birth to the fire god Kagutsuchi, she descended to Yomi. Izanagi followed her, but found her rotting corpse crawling with maggots. She swore to kill a thousand mortals each day in rage at his horror. In death, she commands the shikigami — spirits bound to her will.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'warlock',
		heroPower: {
			id: 'izanami-power',
			name: "Yomi's Embrace",
			description: 'Destroy a friendly minion and summon a 2/2 Shikigami in its place.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'sacrifice_summon',
			value: 2,
			summonData: {
				name: 'Shikigami',
				attack: 2,
				health: 2,
				keywords: []
			}
		},
		weaponUpgrade: {
			id: 90040,
			name: 'Spear of Creation',
			heroId: 'hero-izanami',
			manaCost: 5,
			description: 'Destroy all friendly minions and summon 3/3 Shikigami in their place. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'sacrifice_all_summon',
				value: 3,
				description: 'Destroy all friendly minions and summon 3/3 Shikigami in their place.'
			},
			upgradedPowerId: 'izanami-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'izanami-power-upgraded',
			name: "Yomi's Embrace+",
			description: 'Destroy a friendly minion and summon a 3/3 Shikigami in its place.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'sacrifice_summon',
			value: 3,
			summonData: {
				name: 'Shikigami',
				attack: 3,
				health: 3,
				keywords: []
			},
			isUpgraded: true,
			baseHeroPowerId: 'izanami-power'
		},
		passive: {
			id: 'izanami-passive',
			name: "Death's Lament",
			description: 'When a friendly Dark minion dies, give your other minions +1 Attack.',
			trigger: 'on_friendly_death',
			condition: { minionElement: 'dark' },
			effectType: 'buff_attack',
			value: 1
		}
	},

	// ==================== 2. TSUKUYOMI - Stealth Granting ====================
	'hero-tsukuyomi': {
		id: 'hero-tsukuyomi',
		name: 'Tsukuyomi',
		title: 'God of the Moon',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'The Shinto god of the moon, born from the right eye of Izanagi as he purified himself after escaping Yomi.',
		lore: 'Tsukuyomi once shared the sky with his sister Amaterasu, the sun goddess. But when he slew the food goddess Uke Mochi in disgust at her methods of producing food, Amaterasu banished him to the opposite side of the sky. Now the moon and sun never meet — day and night forever separated by his crime. His silver light conceals those who walk in shadow.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'rogue',
		heroPower: {
			id: 'tsukuyomi-power',
			name: 'Moonlit Veil',
			description: 'Give a friendly minion Stealth until your next turn.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'grant_keyword',
			grantKeyword: 'stealth',
			duration: 'next_turn'
		},
		weaponUpgrade: {
			id: 90041,
			name: "Tsukuyomi's Mirror",
			heroId: 'hero-tsukuyomi',
			manaCost: 5,
			description: 'Give all friendly minions Stealth and +1 Attack. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'stealth_and_buff_all',
				value: 1,
				description: 'Give all friendly minions Stealth and +1 Attack.'
			},
			upgradedPowerId: 'tsukuyomi-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'tsukuyomi-power-upgraded',
			name: 'Moonlit Veil+',
			description: 'Give a friendly minion Stealth and +2 Attack until your next turn.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'grant_keyword',
			grantKeyword: 'stealth',
			value: 2,
			duration: 'next_turn',
			isUpgraded: true,
			baseHeroPowerId: 'tsukuyomi-power'
		},
		passive: {
			id: 'tsukuyomi-passive',
			name: 'Veil of Night',
			description: 'Dark minions have +1 Health.',
			trigger: 'always',
			condition: { minionElement: 'dark' },
			effectType: 'buff_health',
			value: 1
		}
	},

	// ==================== 3. FUJIN - Bounce Mechanic ====================
	'hero-fujin': {
		id: 'hero-fujin',
		name: 'Fujin',
		title: 'God of Wind',
		element: 'electric',
		weakness: 'grass',
		startingHealth: 100,
		description: 'The Shinto god of wind who carries the winds of the world in a great bag slung over his shoulders.',
		lore: 'Fujin was present at the creation of the world. When he first opened his bag of winds, he swept away the morning mists that clung between heaven and earth, letting the sun illuminate the land for the first time. His brother Raijin commands thunder, but Fujin commands the invisible force that topples mountains and scatters armies. Those struck by his gales are hurled back to where they came from.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'mage',
		heroPower: {
			id: 'fujin-power',
			name: 'Divine Wind',
			description: 'Return an enemy minion to its owner\'s hand.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'bounce_to_hand'
		},
		weaponUpgrade: {
			id: 90042,
			name: 'Bag of Winds',
			heroId: 'hero-fujin',
			manaCost: 5,
			description: 'Return all enemy minions to their owner\'s hand. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'bounce_all_enemies',
				description: 'Return all enemy minions to their owner\'s hand.'
			},
			upgradedPowerId: 'fujin-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'fujin-power-upgraded',
			name: 'Divine Wind+',
			description: 'Return an enemy minion to its owner\'s hand and deal 2 damage to their hero.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'bounce_and_damage_hero',
			value: 2,
			isUpgraded: true,
			baseHeroPowerId: 'fujin-power'
		},
		passive: {
			id: 'fujin-passive',
			name: "Stormcaller's Fury",
			description: 'Electric minions have +1 Attack.',
			trigger: 'always',
			condition: { minionElement: 'electric' },
			effectType: 'buff_attack',
			value: 1
		}
	},

	// ==================== 4. SARUTAHIKO - Taunt Granting ====================
	'hero-sarutahiko': {
		id: 'hero-sarutahiko',
		name: 'Sarutahiko',
		title: 'Great Kami of the Crossroads',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'The chief of the earthly kami, guardian of the crossroads between the mortal world and the heavens.',
		lore: 'When the grandson of Amaterasu descended from heaven to rule the earth, Sarutahiko stood at the crossroads between worlds, his blazing eyes and towering form blocking the path. He was not an enemy — he was a guide. He led the divine procession safely through the celestial bridge and into the mortal realm. His devotees pray to him at every fork in the road, for he ensures travelers reach their rightful destination.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'paladin',
		heroPower: {
			id: 'sarutahiko-power',
			name: "Guardian's Blessing",
			description: 'Give a friendly minion +1 Attack and Taunt.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'buff_single',
			value: 1,
			grantKeyword: 'taunt'
		},
		weaponUpgrade: {
			id: 90043,
			name: 'Earthen Halberd',
			heroId: 'hero-sarutahiko',
			manaCost: 5,
			description: 'Give all friendly minions +2 Attack and Taunt. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'buff_and_taunt_all',
				value: 2,
				description: 'Give all friendly minions +2 Attack and Taunt.'
			},
			upgradedPowerId: 'sarutahiko-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'sarutahiko-power-upgraded',
			name: "Guardian's Blessing+",
			description: 'Give a friendly minion +2 Attack and Taunt.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'buff_single',
			value: 2,
			grantKeyword: 'taunt',
			isUpgraded: true,
			baseHeroPowerId: 'sarutahiko-power'
		},
		passive: {
			id: 'sarutahiko-passive',
			name: 'Guiding Light',
			description: 'Light minions have +1 Health.',
			trigger: 'always',
			condition: { minionElement: 'light' },
			effectType: 'buff_health',
			value: 1
		}
	},

	// ==================== 5. KAMIMUSUBI - Heal + Buff Combo ====================
	'hero-kamimusubi': {
		id: 'hero-kamimusubi',
		name: 'Kamimusubi',
		title: 'Divine Creator',
		element: 'water',
		weakness: 'electric',
		startingHealth: 100,
		description: 'One of the three primordial kami of creation, embodying the sacred power of musubi — the binding force that ties all living things together.',
		lore: 'Kamimusubi appeared at the very beginning, alongside Ame-no-Minakanushi and Takamimusubi. While the other two shaped heaven and earth, Kamimusubi breathed life into creation itself. When the storm god Susanoo slew a great serpent, it was Kamimusubi who restored the dead to life. The thread of musubi connects all things — healing the wounded, mending the broken, and strengthening what survives.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'shaman',
		heroPower: {
			id: 'kamimusubi-power',
			name: "Musubi's Gift",
			description: 'Restore 2 Health to a friendly minion and give it +1 Attack this turn.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'heal_and_buff',
			value: 2,
			secondaryValue: 1,
			duration: 'this_turn'
		},
		weaponUpgrade: {
			id: 90044,
			name: 'Thread of Creation',
			heroId: 'hero-kamimusubi',
			manaCost: 5,
			description: 'Restore 4 Health to all friendly minions and give them +2 Attack this turn. Permanently upgrade your hero power.',
			immediateEffect: {
				type: 'heal_and_buff_all',
				value: 4,
				description: 'Restore 4 Health to all friendly minions and give them +2 Attack this turn.'
			},
			upgradedPowerId: 'kamimusubi-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'kamimusubi-power-upgraded',
			name: "Musubi's Gift+",
			description: 'Restore 3 Health to a friendly minion and give it +2 Attack this turn.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'heal_and_buff',
			value: 3,
			secondaryValue: 2,
			duration: 'this_turn',
			isUpgraded: true,
			baseHeroPowerId: 'kamimusubi-power'
		},
		passive: {
			id: 'kamimusubi-passive',
			name: 'Creative Force',
			description: 'When a friendly minion is healed, it gains +1 Health permanently.',
			trigger: 'on_heal',
			condition: { targetType: 'friendly' },
			effectType: 'buff_health',
			value: 1
		}
	}
};

// Helper function to get Japanese hero by ID
export function getJapaneseHeroById(id: string): NorseHero | undefined {
	return JAPANESE_HEROES[id];
}

// Get all Japanese heroes as an array
export function getAllJapaneseHeroes(): NorseHero[] {
	return Object.values(JAPANESE_HEROES);
}

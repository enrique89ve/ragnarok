/**
 * commonHeroes.ts
 *
 * Common-tier heroes — Norse demigods, saga mortals, and lesser mythological figures.
 * 2 per chess piece slot (queen, rook, bishop, knight). 100 HP, no summons.
 * Slightly stronger than base heroes but still accessible starter-tier.
 */

import { NorseHero } from '../../types/NorseTypes';

export const COMMON_HEROES: Record<string, NorseHero> = {

	// ==================== QUEEN SLOT #1 — Gullveig (Warlock) ====================
	'hero-gullveig': {
		id: 'hero-gullveig',
		name: 'Gullveig',
		title: 'The Thrice-Burned',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'A Vanir sorceress burned three times by the Aesir, reborn each time with darker power.',
		lore: 'The Aesir stabbed her with spears and burned her in their hall — three times she was consumed, three times she rose. After the third burning, she walked out as Heidr, the shining one, and the world was never the same.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'warlock',
		heroPower: {
			id: 'gullveig-power',
			name: 'Pyre Rebirth',
			description: 'Deal 1 damage to your hero. Draw a card.',
			cost: 2,
			targetType: 'none',
			effectType: 'draw_and_damage',
			value: 1,
			selfDamage: 1
		},
		weaponUpgrade: {
			id: 90110,
			name: 'Seidr of the Thrice-Burned',
			heroId: 'hero-gullveig',
			manaCost: 5,
			description: 'Draw 2 cards. Deal 2 damage to all enemies. Upgrade your hero power.',
			immediateEffect: {
				type: 'draw_and_damage_aoe',
				value: 2,
				drawValue: 2,
				description: 'Draw 2 cards. Deal 2 damage to all enemies.'
			},
			upgradedPowerId: 'gullveig-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'gullveig-power-upgraded',
			name: 'Pyre Rebirth+',
			description: 'Deal 1 damage to your hero. Draw 2 cards.',
			cost: 2,
			targetType: 'none',
			effectType: 'draw_and_damage',
			value: 2,
			selfDamage: 1,
			isUpgraded: true,
			baseHeroPowerId: 'gullveig-power'
		},
		passive: {
			id: 'gullveig-passive',
			name: 'Undying Flame',
			description: 'When you draw a card, deal 1 damage to the enemy hero.',
			trigger: 'on_draw',
			effectType: 'damage_hero',
			value: 1
		}
	},

	// ==================== QUEEN SLOT #2 — Groa (Mage) ====================
	'hero-groa': {
		id: 'hero-groa',
		name: 'Groa',
		title: 'The Seeress',
		element: 'ice',
		weakness: 'fire',
		startingHealth: 100,
		description: 'A völva whose healing chants nearly freed Mjolnir from Thor\'s skull.',
		lore: 'Groa sang galdr charms over Thor to loosen the whetstone lodged in his head. She nearly succeeded, but Thor spoke of her lost husband Aurvandil and her joy shattered her concentration forever.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'mage',
		heroPower: {
			id: 'groa-power',
			name: 'Galdr Chant',
			description: 'Freeze an enemy minion.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'freeze',
			value: 1
		},
		weaponUpgrade: {
			id: 90111,
			name: 'Aurvandil\'s Toe-Star',
			heroId: 'hero-groa',
			manaCost: 5,
			description: 'Freeze all enemy minions. Upgrade your hero power.',
			immediateEffect: {
				type: 'freeze_all',
				description: 'Freeze all enemy minions.'
			},
			upgradedPowerId: 'groa-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'groa-power-upgraded',
			name: 'Galdr Chant+',
			description: 'Freeze an enemy minion. Deal 1 damage to it.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'freeze',
			value: 1,
			secondaryValue: 1,
			isUpgraded: true,
			baseHeroPowerId: 'groa-power'
		},
		passive: {
			id: 'groa-passive',
			name: 'Seeress\'s Sight',
			description: 'After casting a spell, reduce the cost of your next spell by 1.',
			trigger: 'after_spell_cast',
			effectType: 'cost_reduction',
			value: 1
		}
	},

	// ==================== ROOK SLOT #1 — Hervor (Warrior) ====================
	'hero-hervor': {
		id: 'hero-hervor',
		name: 'Hervor',
		title: 'Bearer of Tyrfing',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'A shieldmaiden who entered a burial mound to claim the cursed sword Tyrfing from her dead father.',
		lore: 'She stood before the barrow of Angantyr and called his shade forth, demanding the blade that could never be sheathed without drawing blood. The dead warned her. She took it anyway.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'warrior',
		heroPower: {
			id: 'hervor-power',
			name: 'Tyrfing\'s Edge',
			description: 'Gain 2 Attack this turn.',
			cost: 2,
			targetType: 'none',
			effectType: 'buff_hero',
			value: 2
		},
		weaponUpgrade: {
			id: 90112,
			name: 'Tyrfing Unsheathed',
			heroId: 'hero-hervor',
			manaCost: 5,
			description: 'Gain 4 Attack this turn. Deal 2 damage to all enemies. Upgrade your hero power.',
			immediateEffect: {
				type: 'buff_hero_and_damage_aoe',
				value: 4,
				description: 'Gain 4 Attack this turn. Deal 2 damage to all enemies.'
			},
			upgradedPowerId: 'hervor-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'hervor-power-upgraded',
			name: 'Tyrfing\'s Edge+',
			description: 'Gain 3 Attack this turn.',
			cost: 2,
			targetType: 'none',
			effectType: 'buff_hero',
			value: 3,
			isUpgraded: true,
			baseHeroPowerId: 'hervor-power'
		},
		passive: {
			id: 'hervor-passive',
			name: 'Cursed Blade',
			description: 'When you attack, deal 1 damage to a random enemy.',
			trigger: 'on_minion_attack',
			effectType: 'damage_bonus',
			value: 1
		}
	},

	// ==================== ROOK SLOT #2 — Bjorn Ironside (Paladin) ====================
	'hero-bjorn-ironside': {
		id: 'hero-bjorn-ironside',
		name: 'Bjorn Ironside',
		title: 'Son of Ragnar',
		element: 'water',
		weakness: 'electric',
		startingHealth: 100,
		description: 'Son of Ragnar Lodbrok, said to be invulnerable in battle as if his skin were iron.',
		lore: 'His mother Aslaug cast a spell upon him as a child. No blade could bite his flesh, no arrow could pierce his side. He led the Great Heathen Army and carved a kingdom from the sea.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'paladin',
		heroPower: {
			id: 'bjorn-ironside-power',
			name: 'Iron Skin',
			description: 'Grant a friendly minion Divine Shield.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'grant_divine_shield',
			value: 1
		},
		weaponUpgrade: {
			id: 90113,
			name: 'Shield of the Iron Legion',
			heroId: 'hero-bjorn-ironside',
			manaCost: 5,
			description: 'Grant all friendly minions Divine Shield. Upgrade your hero power.',
			immediateEffect: {
				type: 'grant_divine_shield_all',
				description: 'Grant all friendly minions Divine Shield.'
			},
			upgradedPowerId: 'bjorn-ironside-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'bjorn-ironside-power-upgraded',
			name: 'Iron Skin+',
			description: 'Grant a friendly minion Divine Shield and +1 Health.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'grant_divine_shield',
			value: 1,
			secondaryValue: 1,
			isUpgraded: true,
			baseHeroPowerId: 'bjorn-ironside-power'
		},
		passive: {
			id: 'bjorn-ironside-passive',
			name: 'Ironclad',
			description: 'When a friendly minion loses Divine Shield, gain 1 Armor.',
			trigger: 'on_minion_death',
			effectType: 'gain_armor',
			value: 1
		}
	},

	// ==================== BISHOP SLOT #1 — Nanna (Priest) ====================
	'hero-nanna': {
		id: 'hero-nanna',
		name: 'Nanna',
		title: 'Wife of Baldur',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'Goddess of devotion who died of grief at Baldur\'s funeral and followed him to Helheim.',
		lore: 'When Baldur was slain by the mistletoe arrow, Nanna\'s heart burst with sorrow. She was placed beside him on his funeral pyre, choosing death over a world without love.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'priest',
		heroPower: {
			id: 'nanna-power',
			name: 'Devoted Heart',
			description: 'Restore 2 Health to a friendly character. Draw a card if it was fully healed.',
			cost: 2,
			targetType: 'friendly_character',
			effectType: 'heal',
			value: 2,
			secondaryValue: 1
		},
		weaponUpgrade: {
			id: 90114,
			name: 'Baldur\'s Funeral Ring',
			heroId: 'hero-nanna',
			manaCost: 5,
			description: 'Restore 3 Health to all friendly characters. Upgrade your hero power.',
			immediateEffect: {
				type: 'heal_all_friendly',
				value: 3,
				description: 'Restore 3 Health to all friendly characters.'
			},
			upgradedPowerId: 'nanna-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'nanna-power-upgraded',
			name: 'Devoted Heart+',
			description: 'Restore 3 Health to a friendly character.',
			cost: 2,
			targetType: 'friendly_character',
			effectType: 'heal',
			value: 3,
			isUpgraded: true,
			baseHeroPowerId: 'nanna-power'
		},
		passive: {
			id: 'nanna-passive',
			name: 'Undying Devotion',
			description: 'When a friendly minion dies, restore 2 Health to your hero.',
			trigger: 'on_friendly_death',
			effectType: 'heal_hero',
			value: 2
		}
	},

	// ==================== BISHOP SLOT #2 — Volva (Shaman) ====================
	'hero-volva': {
		id: 'hero-volva',
		name: 'Völva',
		title: 'The Prophetess',
		element: 'grass',
		weakness: 'fire',
		startingHealth: 100,
		description: 'A wandering seeress whose visions shaped the fates of gods and mortals alike.',
		lore: 'She was old when the world was young. Odin himself sought her counsel, and she told him of the beginning and the end — of Ragnarok, when the sun would darken and the stars would fall.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'shaman',
		heroPower: {
			id: 'volva-power',
			name: 'Vision of Fate',
			description: 'Look at the top 2 cards of your deck. Draw one.',
			cost: 2,
			targetType: 'none',
			effectType: 'scry',
			value: 2
		},
		weaponUpgrade: {
			id: 90115,
			name: 'Staff of the Völuspá',
			heroId: 'hero-volva',
			manaCost: 5,
			description: 'Look at the top 4 cards of your deck. Draw 2. Upgrade your hero power.',
			immediateEffect: {
				type: 'scry_and_draw',
				value: 4,
				drawValue: 2,
				description: 'Look at the top 4 cards of your deck. Draw 2.'
			},
			upgradedPowerId: 'volva-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'volva-power-upgraded',
			name: 'Vision of Fate+',
			description: 'Look at the top 3 cards of your deck. Draw one.',
			cost: 2,
			targetType: 'none',
			effectType: 'scry',
			value: 3,
			isUpgraded: true,
			baseHeroPowerId: 'volva-power'
		},
		passive: {
			id: 'volva-passive',
			name: 'Threads of Wyrd',
			description: 'At end of turn, if your hand has 5+ cards, gain +1 Spell Damage.',
			trigger: 'end_of_turn',
			effectType: 'spell_damage_bonus',
			value: 1
		}
	},

	// ==================== KNIGHT SLOT #1 — Gudrun (Hunter) ====================
	'hero-gudrun': {
		id: 'hero-gudrun',
		name: 'Gudrun',
		title: 'The Avenger',
		element: 'fire',
		weakness: 'water',
		startingHealth: 100,
		description: 'A legendary heroine of the Volsung saga who avenged her brothers through cunning and fire.',
		lore: 'She married Atli the Hun and served him a feast of their own sons\' flesh, then set his hall ablaze while he slept. Vengeance was the only language her grief could speak.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'hunter',
		heroPower: {
			id: 'gudrun-power',
			name: 'Vengeful Arrow',
			description: 'Deal 2 damage to the enemy hero.',
			cost: 2,
			targetType: 'enemy_hero',
			effectType: 'damage_hero',
			value: 2
		},
		weaponUpgrade: {
			id: 90116,
			name: 'Pyre of Vengeance',
			heroId: 'hero-gudrun',
			manaCost: 5,
			description: 'Deal 3 damage to the enemy hero and 2 damage to all enemy minions. Upgrade your hero power.',
			immediateEffect: {
				type: 'damage_hero_and_aoe',
				value: 3,
				description: 'Deal 3 damage to the enemy hero and 2 damage to all enemy minions.'
			},
			upgradedPowerId: 'gudrun-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'gudrun-power-upgraded',
			name: 'Vengeful Arrow+',
			description: 'Deal 3 damage to the enemy hero.',
			cost: 2,
			targetType: 'enemy_hero',
			effectType: 'damage_hero',
			value: 3,
			isUpgraded: true,
			baseHeroPowerId: 'gudrun-power'
		},
		passive: {
			id: 'gudrun-passive',
			name: 'Blood Feud',
			description: 'When a friendly minion dies, deal 1 damage to the enemy hero.',
			trigger: 'on_friendly_death',
			effectType: 'damage_hero',
			value: 1
		}
	},

	// ==================== QUEEN SLOT #3 — Frigg (Priest) ====================
	'hero-frigg': {
		id: 'hero-frigg',
		name: 'Frigg',
		title: 'All-Mother of Asgard',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'Wife of Odin, queen of the Aesir, weaver of fates. She knows all destinies but speaks none.',
		lore: 'Frigg sat at her spinning wheel in Fensalir and saw the threads of every life in the Nine Realms. When Baldur dreamed of death, she traveled to every creature, every stone, every drop of poison and extracted an oath never to harm her son. She asked everything — everything except the mistletoe, too young and small to swear. That single oversight unraveled the world. She is the only being besides Odin permitted to sit upon Hlidskjalf and gaze across all realms, yet she chooses silence over prophecy, for she learned that knowing the future does not mean you can change it.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'priest',
		heroPower: {
			id: 'frigg-power',
			name: 'Mother\'s Oath',
			description: 'Give a friendly minion an Oath: prevents the next damage dealt to it and heals 1 when broken.',
			cost: 2,
			targetType: 'friendly_minion',
			effectType: 'grant_divine_shield',
			value: 1,
			healOnBreak: 1
		},
		weaponUpgrade: {
			id: 90118,
			name: 'Fensalir\'s Spindle',
			heroId: 'hero-frigg',
			manaCost: 5,
			description: 'Restore 4 Health to all friendly minions. Give your hero an Oath. Upgrade your hero power.',
			immediateEffect: {
				type: 'heal_all_and_shield',
				value: 4,
				description: 'Restore 4 Health to all friendly minions. Give your hero an Oath.'
			},
			upgradedPowerId: 'frigg-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'frigg-power-upgraded',
			name: 'All-Mother\'s Vow',
			description: 'Give ALL friendly minions an Oath.',
			cost: 2,
			targetType: 'none',
			effectType: 'grant_divine_shield',
			value: 1,
			healOnBreak: 1,
			isUpgraded: true,
			baseHeroPowerId: 'frigg-power'
		},
		passive: {
			id: 'frigg-passive',
			name: 'Foresight of Fensalir',
			description: 'When a friendly minion\'s Divine Shield is broken, draw a card.',
			trigger: 'on_shield_break',
			effectType: 'draw',
			value: 1
		}
	},

	// ==================== BISHOP SLOT #3 — Bestla (Shaman) ====================
	'hero-bestla': {
		id: 'hero-bestla',
		name: 'Bestla',
		title: 'Primordial Frost-Mother',
		element: 'ice',
		weakness: 'fire',
		startingHealth: 100,
		description: 'Jotun giantess, wife of Borr, mother of Odin, Vili, and Ve. Without her blood, no Aesir would exist.',
		lore: 'Bestla was a daughter of the frost giant Bolthorn, born in the age before the gods. When Borr, son of Buri, found her in the ice wastes of Niflheim, they forged an alliance between the first of men and the eldest of giants. From their union came three sons who would slay Ymir and build the world from his corpse. Bestla taught her sons the runes of creation — the secret names of ice and void that predate the Nine Realms themselves. She is the grandmother of all the Aesir, the primordial bridge between giant-kind and godhood, and it is said that the frost in Odin\'s single eye is hers.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'shaman',
		heroPower: {
			id: 'bestla-power',
			name: 'Primordial Frost',
			description: 'Freeze an enemy minion. Give a friendly minion +1 Health.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'freeze',
			value: 1,
			secondaryValue: 1
		},
		weaponUpgrade: {
			id: 90120,
			name: 'Bolthorn\'s Rime',
			heroId: 'hero-bestla',
			manaCost: 5,
			description: 'Freeze all enemy minions. Give all friendly minions +2 Health. Upgrade your hero power.',
			immediateEffect: {
				type: 'freeze_all_and_buff',
				value: 2,
				description: 'Freeze all enemy minions. Give all friendly minions +2 Health.'
			},
			upgradedPowerId: 'bestla-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'bestla-power-upgraded',
			name: 'Primordial Frost+',
			description: 'Freeze an enemy minion. Give a friendly minion +1/+1.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'freeze',
			value: 1,
			secondaryValue: 1,
			buffAttack: 1,
			isUpgraded: true,
			baseHeroPowerId: 'bestla-power'
		},
		passive: {
			id: 'bestla-passive',
			name: 'Ancient Lineage',
			description: 'When you Freeze an enemy, gain 2 Armor.',
			trigger: 'on_freeze',
			effectType: 'gain_armor',
			value: 2
		}
	},

	// ==================== KNIGHT SLOT #3 — Hermod (Rogue) ====================
	'hero-hermod': {
		id: 'hero-hermod',
		name: 'Hermod',
		title: 'The Brave',
		element: 'dark',
		weakness: 'light',
		startingHealth: 100,
		description: 'Son of Odin who rode Sleipnir nine nights through darkness to beg Hel for Baldur\'s return.',
		lore: 'When Baldur fell to the mistletoe arrow and the gods stood weeping, Odin asked who among them would ride to Hel\'s domain and offer ransom for his son. Only Hermod stepped forward. He mounted Sleipnir and rode nine nights through ever-deepening valleys of shadow until he reached the river Gjoll. The maiden Modgud at the bridge said a whole army of the dead had crossed that morning, yet Sleipnir\'s hooves thundered louder than all of them. Hermod leapt the gates of Hel itself and found Baldur seated in the hall of honor. Hel agreed: if every living thing in the world would weep for Baldur, she would release him. Hermod rode back with hope — but Loki, disguised as the giantess Thokk, refused to weep, and Baldur remained in death. Hermod\'s journey was the bravest act in all the sagas, and the most futile.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'rogue',
		heroPower: {
			id: 'hermod-power',
			name: 'Ride to Hel',
			description: 'Return a friendly minion that died this game to your hand. Pay Health equal to its mana cost.',
			cost: 1,
			targetType: 'graveyard',
			effectType: 'resurrect_to_hand',
			value: 1,
			costHealth: true
		},
		weaponUpgrade: {
			id: 90119,
			name: 'Sleipnir\'s Reins',
			heroId: 'hero-hermod',
			manaCost: 5,
			description: 'Deal 3 damage. Return the last friendly minion that died to your hand (no HP cost). Upgrade your hero power.',
			immediateEffect: {
				type: 'damage_and_resurrect',
				value: 3,
				description: 'Deal 3 damage. Return the last friendly minion that died to your hand.'
			},
			upgradedPowerId: 'hermod-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'hermod-power-upgraded',
			name: 'Hel\'s Passage',
			description: 'Return a friendly minion that died this game to your hand. It costs (2) less. Pay Health equal to its original cost minus 2.',
			cost: 1,
			targetType: 'graveyard',
			effectType: 'resurrect_to_hand',
			value: 1,
			costHealth: true,
			costReduction: 2,
			isUpgraded: true,
			baseHeroPowerId: 'hermod-power'
		},
		passive: {
			id: 'hermod-passive',
			name: 'Swift Messenger',
			description: 'The first card you play each turn that was returned from death costs (1) less.',
			trigger: 'on_card_play',
			effectType: 'cost_reduction',
			value: 1
		}
	},

	// ==================== KNIGHT SLOT #2 — Starkad (Berserker) ====================
	'hero-starkad': {
		id: 'hero-starkad',
		name: 'Starkad',
		title: 'The Eight-Armed',
		element: 'fire',
		weakness: 'ice',
		startingHealth: 100,
		description: 'A legendary berserker blessed by Odin and cursed by Thor, destined to commit three great sins.',
		lore: 'Thor tore away six of his arms, but Odin granted him three lifetimes of battle. Each life he fought with inhuman fury, and each life he committed an act of treachery he could not escape.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'berserker',
		heroPower: {
			id: 'starkad-power',
			name: 'Berserker Rage',
			description: 'Deal 1 damage to a minion. If it survives, deal 1 damage to adjacent minions.',
			cost: 2,
			targetType: 'any_minion',
			effectType: 'damage_single',
			value: 1,
			secondaryValue: 1
		},
		weaponUpgrade: {
			id: 90117,
			name: 'Odin\'s Three Lives',
			heroId: 'hero-starkad',
			manaCost: 5,
			description: 'Deal 2 damage to all minions. Gain 3 Attack this turn. Upgrade your hero power.',
			immediateEffect: {
				type: 'damage_all_and_buff',
				value: 2,
				description: 'Deal 2 damage to all minions. Gain 3 Attack this turn.'
			},
			upgradedPowerId: 'starkad-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'starkad-power-upgraded',
			name: 'Berserker Rage+',
			description: 'Deal 2 damage to a minion. If it survives, deal 1 damage to adjacent minions.',
			cost: 2,
			targetType: 'any_minion',
			effectType: 'damage_single',
			value: 2,
			secondaryValue: 1,
			isUpgraded: true,
			baseHeroPowerId: 'starkad-power'
		},
		passive: {
			id: 'starkad-passive',
			name: 'Odin\'s Fury',
			description: 'When you deal damage with your hero power, gain +1 Attack this turn.',
			trigger: 'on_damage_dealt',
			effectType: 'buff_hero_attack',
			value: 1
		}
	},

	// ==================== BISHOP SLOT — Verdandi (Priest, Combo) ====================
	'hero-verdandi': {
		id: 'hero-verdandi',
		name: 'Verdandi',
		title: 'Norn of the Present',
		element: 'light',
		weakness: 'dark',
		startingHealth: 100,
		description: 'The Norn who carves the present into the World Tree. She weaves Fate Strands — threads of destiny that can be spent in rapid succession.',
		lore: 'Verdandi sits at Urd\'s Well, carving runes into Yggdrasil. Each rune is a moment in time — and she can hand you several at once, if you dare act on them all.',
		gender: 'female',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'priest',
		heroPower: {
			id: 'verdandi-power',
			name: 'Fate Strand',
			description: 'Add a 0-cost spell to your hand that deals 1 damage to a random enemy.',
			cost: 2,
			targetType: 'none',
			effectType: 'generate_fate_strand',
			value: 1
		},
		weaponUpgrade: {
			id: 90122,
			name: 'Loom of Fate',
			heroId: 'hero-verdandi',
			manaCost: 5,
			description: 'Add 3 Fate Strands to your hand. Upgrade your hero power.',
			immediateEffect: {
				type: 'generate_fate_strand_multiple',
				value: 3,
				description: 'Add 3 Fate Strands to your hand.'
			},
			upgradedPowerId: 'verdandi-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'verdandi-power-upgraded',
			name: 'Fate Strand+',
			description: 'Add a 0-cost spell to your hand that deals 2 damage to a random enemy.',
			cost: 2,
			targetType: 'none',
			effectType: 'generate_fate_strand',
			value: 2,
			isUpgraded: true,
			baseHeroPowerId: 'verdandi-power'
		},
		passive: {
			id: 'verdandi-passive',
			name: 'Weaver\'s Rush',
			description: 'After you play 3+ cards in a single turn, draw a card.',
			trigger: 'on_cards_played_3',
			effectType: 'draw',
			value: 1
		}
	},

	// ==================== KNIGHT SLOT — Vali (Berserker, Escalating) ====================
	'hero-vali': {
		id: 'hero-vali',
		name: 'Vali',
		title: 'Son of Vengeance',
		element: 'fire',
		weakness: 'water',
		startingHealth: 100,
		description: 'Born to avenge Baldr\'s death. Each blow he strikes grows fiercer — but his weapon can be unleashed for one devastating strike that resets the cycle.',
		lore: 'Vali was born in the morning and by evening had slain Hodr. The gods marvelled — not at his speed, but at how each subsequent strike landed harder than the last. Vengeance, it seems, compounds.',
		gender: 'male',
		hasSpells: true,
		fixedCardIds: [],
		heroClass: 'berserker',
		heroPower: {
			id: 'vali-power',
			name: 'Blood Debt',
			description: 'Deal 1 damage to an enemy minion. Increases by +1 each use this game.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'escalating_damage',
			value: 1
		},
		weaponUpgrade: {
			id: 90123,
			name: 'Vali\'s Oath-Spear',
			heroId: 'hero-vali',
			manaCost: 5,
			description: 'Deal damage equal to Blood Debt\'s current level to all enemies. Reset counter. Upgrade hero power.',
			immediateEffect: {
				type: 'escalating_aoe_reset',
				description: 'Deal current Blood Debt damage to all enemies, then reset.'
			},
			upgradedPowerId: 'vali-power-upgraded'
		},
		upgradedHeroPower: {
			id: 'vali-power-upgraded',
			name: 'Blood Debt+',
			description: 'Deal 2 damage to an enemy minion. Increases by +1 each use this game.',
			cost: 2,
			targetType: 'enemy_minion',
			effectType: 'escalating_damage',
			value: 2,
			isUpgraded: true,
			baseHeroPowerId: 'vali-power'
		},
		passive: {
			id: 'vali-passive',
			name: 'Undying Grudge',
			description: 'When you take damage from an enemy minion, your next hero power costs (1) less.',
			trigger: 'on_take_minion_damage',
			effectType: 'cost_reduction',
			value: 1
		}
	}
};

export function getCommonHeroById(id: string): NorseHero | undefined {
	return COMMON_HEROES[id];
}

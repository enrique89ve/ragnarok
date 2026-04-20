import { ArmorCardData } from '../../../../types';

const norseArmorCards: ArmorCardData[] = [
	// ============================================
	// NEUTRAL ARMOR (Available to all heroes)
	// ============================================
	{
		id: 29810, name: 'Iron Helm', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'helm', armorValue: 1, collectible: true,
		description: '+1 Armor. Your first spell each turn costs (1) less.',
		flavorText: 'Forged in Midgard. Nothing fancy — just honest iron between you and an axe.',
		armorPassive: { type: 'spell_cost_reduction', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29811, name: 'Chainmail Vest', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'Each link was hammered by hand. The smith\'s patience is your protection.',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29812, name: 'Leather Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. Spell Damage +1.',
		flavorText: 'Tanned from the hide of a Jotunheim elk. Light, supple, and strangely warm.',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29813, name: 'Runic Circlet', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Status effects on your hero last 1 less turn.',
		flavorText: 'The runes etched into the band hum softly. They were old when the gods were young.',
		armorPassive: { type: 'status_resistance', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29814, name: 'Reinforced Plate', manaCost: 4, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'chest', armorValue: 3, collectible: true,
		description: '+3 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'Dwarf-hammered steel, layered thrice. Even a giant\'s club leaves only dents.',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29815, name: 'Traveler\'s Boots', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. When a minion dies, gain 1 Mana next turn.',
		flavorText: 'They have walked every road between the Nine Realms and remember each one.',
		armorPassive: { type: 'on_death_mana', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29816, name: 'Dwarf-Forged Helm', manaCost: 3, type: 'armor', rarity: 'rare',
		heroClass: 'neutral', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Your hero gains +1 Attack while damaged.',
		flavorText: 'The dwarves of Nidavellir forge in darkness. Their work shines brighter for it.',
		armorPassive: { type: 'attack_while_damaged', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29817, name: 'Uru Breastplate', manaCost: 4, type: 'armor', rarity: 'rare',
		heroClass: 'neutral', armorSlot: 'chest', armorValue: 3, collectible: true,
		description: '+3 Armor. Overkill damage to minions also hits the enemy hero.',
		flavorText: 'Cast from the same metal as Mjolnir. It drinks lightning and gives nothing back.',
		armorPassive: { type: 'overkill_to_hero' },
		categories: ['norse_armor']
	},
	{
		id: 29818, name: 'Valkyrie Sabatons', manaCost: 3, type: 'armor', rarity: 'rare',
		heroClass: 'neutral', armorSlot: 'greaves', armorValue: 2, collectible: true,
		description: '+2 Armor. First minion summoned each turn gets +1/+1.',
		flavorText: 'She wore them when she chose the slain. Now they carry a new warrior into battle.',
		armorPassive: { type: 'first_summon_buff', value: 1 },
		categories: ['norse_armor']
	},
	{
		id: 29819, name: 'Asgardian Warhelm', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'neutral', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Spell Damage +1.',
		flavorText: 'Standard issue for the Einherjar. The gold trim is purely ceremonial.',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor']
	},

	// ============================================
	// STORMCALLER SET (Zeus — Mage)
	// ============================================
	{
		id: 29820, name: 'Stormcaller Crown', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'mage', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Spell Damage +1.',
		flavorText: 'Thunder answers when the wearer speaks. Best to choose your words carefully.',
		setId: 'stormcaller',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor', 'stormcaller_set']
	},
	{
		id: 29821, name: 'Stormcaller Robes', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'mage', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Your first spell each turn costs (1) less.',
		flavorText: 'Woven from cloud-thread by the daughters of Njord. They crackle in dry weather.',
		setId: 'stormcaller',
		armorPassive: { type: 'spell_cost_reduction', value: 1 },
		categories: ['norse_armor', 'stormcaller_set']
	},
	{
		id: 29822, name: 'Stormcaller Treads', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'mage', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. Spell Damage +1.',
		flavorText: 'The ground sparks beneath each step. Puddles are inadvisable.',
		setId: 'stormcaller',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor', 'stormcaller_set']
	},

	// ============================================
	// VALHALLA SET (Odin — Mage)
	// ============================================
	{
		id: 29823, name: 'Valhalla Visor', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'mage', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Your first spell each turn costs (1) less.',
		flavorText: 'The visor shows the world as the Einherjar see it — every weakness, every opening.',
		setId: 'valhalla',
		armorPassive: { type: 'spell_cost_reduction', value: 1 },
		categories: ['norse_armor', 'valhalla_set']
	},
	{
		id: 29824, name: 'Valhalla Mantle', manaCost: 4, type: 'armor', rarity: 'rare',
		heroClass: 'mage', armorSlot: 'chest', armorValue: 3, collectible: true,
		description: '+3 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'Worn by those who have died in battle and returned. It bears the scars of a thousand afterlives.',
		setId: 'valhalla',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor', 'valhalla_set']
	},
	{
		id: 29825, name: 'Valhalla Sandals', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'mage', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. Spell Damage +1.',
		flavorText: 'Light enough to run on Bifrost. Sturdy enough to stand on a giant\'s shoulders.',
		setId: 'valhalla',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor', 'valhalla_set']
	},

	// ============================================
	// BERSERKER SET (Ares — Warrior)
	// ============================================
	{
		id: 29826, name: 'Berserker Helm', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'warrior', armorSlot: 'helm', armorValue: 1, collectible: true,
		description: '+1 Armor. Your hero gains +1 Attack while damaged.',
		flavorText: 'The horns are decorative. The bloodstains are not.',
		setId: 'berserker',
		armorPassive: { type: 'attack_while_damaged', value: 1 },
		categories: ['norse_armor', 'berserker_set']
	},
	{
		id: 29827, name: 'Berserker Warplate', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'warrior', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Overkill damage to minions also hits the enemy hero.',
		flavorText: 'It bears no insignia. Berserkers need no banner — their fury announces them.',
		setId: 'berserker',
		armorPassive: { type: 'overkill_to_hero' },
		categories: ['norse_armor', 'berserker_set']
	},
	{
		id: 29828, name: 'Berserker Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'warrior', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. Your hero gains +1 Attack while damaged.',
		flavorText: 'Scored by a hundred blades. The wearer felt none of them.',
		setId: 'berserker',
		armorPassive: { type: 'attack_while_damaged', value: 1 },
		categories: ['norse_armor', 'berserker_set']
	},

	// ============================================
	// THUNDERGUARD SET (Thor — Warrior)
	// ============================================
	{
		id: 29829, name: 'Thunderguard Helm', manaCost: 3, type: 'armor', rarity: 'rare',
		heroClass: 'warrior', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Your hero gains +1 Attack while damaged.',
		flavorText: 'Blessed by Thor himself. Or so the merchant claimed.',
		setId: 'thunderguard',
		armorPassive: { type: 'attack_while_damaged', value: 1 },
		categories: ['norse_armor', 'thunderguard_set']
	},
	{
		id: 29830, name: 'Thunderguard Plate', manaCost: 4, type: 'armor', rarity: 'rare',
		heroClass: 'warrior', armorSlot: 'chest', armorValue: 3, collectible: true,
		description: '+3 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'When lightning strikes the wearer, the armor drinks it in and asks for more.',
		setId: 'thunderguard',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor', 'thunderguard_set']
	},
	{
		id: 29831, name: 'Thunderguard Boots', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'warrior', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. Overkill damage to minions also hits the enemy hero.',
		flavorText: 'The ground trembles with each step. It might be the boots. It might be the wearer.',
		setId: 'thunderguard',
		armorPassive: { type: 'overkill_to_hero' },
		categories: ['norse_armor', 'thunderguard_set']
	},

	// ============================================
	// SPECTRAL SET (Hades — Warlock)
	// ============================================
	{
		id: 29832, name: 'Spectral Crown', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'warlock', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. When a minion dies, gain 1 Mana next turn.',
		flavorText: 'It sits heavy on the brow. The whispers of the dead are not a light burden.',
		setId: 'spectral',
		armorPassive: { type: 'on_death_mana', value: 1 },
		categories: ['norse_armor', 'spectral_set']
	},
	{
		id: 29833, name: 'Spectral Shroud', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'warlock', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'The living cannot see it. The dead cannot look away.',
		setId: 'spectral',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor', 'spectral_set']
	},
	{
		id: 29834, name: 'Spectral Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'warlock', armorSlot: 'greaves', armorValue: 2, collectible: true,
		description: '+2 Armor. When a minion dies, gain 1 Mana next turn.',
		flavorText: 'They leave no footprints. Those who wear them walk between worlds.',
		setId: 'spectral',
		armorPassive: { type: 'on_death_mana', value: 1 },
		categories: ['norse_armor', 'spectral_set']
	},

	// ============================================
	// ABYSSAL SET (Poseidon — Shaman)
	// ============================================
	{
		id: 29835, name: 'Abyssal Crown', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'shaman', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Freeze effects last +1 turn.',
		flavorText: 'Dredged from the deepest trench of Ran\'s domain. It still drips, even in sunlight.',
		setId: 'abyssal',
		armorPassive: { type: 'freeze_extend', value: 1 },
		categories: ['norse_armor', 'abyssal_set']
	},
	{
		id: 29836, name: 'Abyssal Mail', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'shaman', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Spell Damage +1.',
		flavorText: 'The scales belong to no fish that swims in mortal waters.',
		setId: 'abyssal',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor', 'abyssal_set']
	},
	{
		id: 29837, name: 'Tidecaller Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'shaman', armorSlot: 'greaves', armorValue: 2, collectible: true,
		description: '+2 Armor. Freeze effects last +1 turn.',
		flavorText: 'The tides obey the wearer\'s stride. Forward is flood; backward is ebb.',
		setId: 'abyssal',
		armorPassive: { type: 'freeze_extend', value: 1 },
		categories: ['norse_armor', 'abyssal_set']
	},

	// ============================================
	// AEGIS SET (Athena — Paladin)
	// ============================================
	{
		id: 29838, name: 'Aegis Helm', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'paladin', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. First minion summoned each turn gets +1/+1.',
		flavorText: 'Modeled after Athena\'s own. The gorgon\'s visage on the brow turns courage to stone.',
		setId: 'aegis',
		armorPassive: { type: 'first_summon_buff', value: 1 },
		categories: ['norse_armor', 'aegis_set']
	},
	{
		id: 29839, name: 'Aegis Breastplate', manaCost: 4, type: 'armor', rarity: 'rare',
		heroClass: 'paladin', armorSlot: 'chest', armorValue: 3, collectible: true,
		description: '+3 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'Hephaestus forged the original for Zeus. This copy serves mortals nearly as well.',
		setId: 'aegis',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor', 'aegis_set']
	},
	{
		id: 29840, name: 'Aegis Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'paladin', armorSlot: 'greaves', armorValue: 2, collectible: true,
		description: '+2 Armor. Spell Damage +1.',
		flavorText: 'Golden greaves, fitted by a god\'s hand. They never rust, never scratch, never fail.',
		setId: 'aegis',
		armorPassive: { type: 'spell_power', value: 1 },
		categories: ['norse_armor', 'aegis_set']
	},

	// ============================================
	// VANIR SET (Freya — Priest)
	// ============================================
	{
		id: 29841, name: 'Vanir Circlet', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'priest', armorSlot: 'helm', armorValue: 1, collectible: true,
		description: '+1 Armor. First minion summoned each turn gets +1/+1.',
		flavorText: 'Woven from Vanaheim wildflowers that never wilt. Beauty and war are not opposites.',
		setId: 'vanir',
		armorPassive: { type: 'first_summon_buff', value: 1 },
		categories: ['norse_armor', 'vanir_set']
	},
	{
		id: 29842, name: 'Enchanted Vestment', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'priest', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Your healing effects restore 1 additional Health.',
		flavorText: 'The Vanir weave healing into fabric. Every thread is a prayer answered.',
		setId: 'vanir',
		armorPassive: { type: 'lifesteal_percent', value: 1 },
		categories: ['norse_armor', 'vanir_set']
	},
	{
		id: 29843, name: 'Vanir Sandals', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'priest', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. First minion summoned each turn gets +1/+1.',
		flavorText: 'They grow moss where they walk. Even barren ground blooms in a Vanir\'s wake.',
		setId: 'vanir',
		armorPassive: { type: 'first_summon_buff', value: 1 },
		categories: ['norse_armor', 'vanir_set']
	},

	// ============================================
	// SHADOW SET (Loki — Rogue)
	// ============================================
	{
		id: 29844, name: 'Mask of Mirrors', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'rogue', armorSlot: 'helm', armorValue: 1, collectible: true,
		description: '+1 Armor. Illusions gain Rush.',
		flavorText: 'Loki wore a hundred faces. This mask remembers three of them.',
		setId: 'shadow',
		armorPassive: { type: 'illusion_rush' },
		categories: ['norse_armor', 'shadow_set']
	},
	{
		id: 29845, name: 'Shadow Cloak', manaCost: 3, type: 'armor', rarity: 'common',
		heroClass: 'rogue', armorSlot: 'chest', armorValue: 2, collectible: true,
		description: '+2 Armor. Your first spell each turn costs (1) less.',
		flavorText: 'Darkness clings to it like a living thing. In shadow, the wearer simply ceases to exist.',
		setId: 'shadow',
		armorPassive: { type: 'spell_cost_reduction', value: 1 },
		categories: ['norse_armor', 'shadow_set']
	},
	{
		id: 29846, name: 'Shadow Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'rogue', armorSlot: 'greaves', armorValue: 1, collectible: true,
		description: '+1 Armor. First minion summoned each turn gets +1/+1.',
		flavorText: 'Silent as falling snow. The svartálfar craft nothing that makes a sound.',
		setId: 'shadow',
		armorPassive: { type: 'first_summon_buff', value: 1 },
		categories: ['norse_armor', 'shadow_set']
	},

	// ============================================
	// OATHKEEPER SET (Tyr — Paladin)
	// ============================================
	{
		id: 29847, name: 'Oathkeeper Helm', manaCost: 3, type: 'armor', rarity: 'rare',
		heroClass: 'paladin', armorSlot: 'helm', armorValue: 2, collectible: true,
		description: '+2 Armor. Your hero gains +1 Attack while damaged.',
		flavorText: 'Those who swear upon it cannot break their word. Those who try do not survive the attempt.',
		setId: 'oathkeeper',
		armorPassive: { type: 'attack_while_damaged', value: 1 },
		categories: ['norse_armor', 'oathkeeper_set']
	},
	{
		id: 29848, name: 'Oathkeeper Plate', manaCost: 4, type: 'armor', rarity: 'rare',
		heroClass: 'paladin', armorSlot: 'chest', armorValue: 3, collectible: true,
		description: '+3 Armor. Reduce AoE damage taken by 1.',
		flavorText: 'Tyr wore its likeness when he placed his hand in Fenrir\'s mouth. He knew the cost.',
		setId: 'oathkeeper',
		armorPassive: { type: 'aoe_damage_reduction', value: 1 },
		categories: ['norse_armor', 'oathkeeper_set']
	},
	{
		id: 29849, name: 'Oathkeeper Greaves', manaCost: 2, type: 'armor', rarity: 'common',
		heroClass: 'paladin', armorSlot: 'greaves', armorValue: 2, collectible: true,
		description: '+2 Armor. Status effects on your hero last 1 less turn.',
		flavorText: 'They hold the wearer upright when courage fails. Honor is heavier than steel.',
		setId: 'oathkeeper',
		armorPassive: { type: 'status_resistance', value: 1 },
		categories: ['norse_armor', 'oathkeeper_set']
	},
];

export default norseArmorCards;

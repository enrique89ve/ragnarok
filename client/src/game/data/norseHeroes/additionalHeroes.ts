/**
 * additionalHeroes.ts
 * 
 * Definitions for 14 additional Norse Heroes in Ragnarok Poker.
 * These are Tier 2 heroes with simplified power sets.
 */

import { NorseHero } from '../../types/NorseTypes';

// ==================== ADDITIONAL HEROES (14 Heroes) ====================

export const ADDITIONAL_HEROES: Record<string, NorseHero> = {

  // ==================== 23. THORGRIM ====================
  'hero-thorgrim': {
    id: 'hero-thorgrim',
    name: 'Thorgrim',
    title: 'Thunder Warrior',
    element: 'electric',
    weakness: 'grass',
    startingHealth: 100,
    description: 'A mortal champion blessed by Thor.',
    lore: 'A warrior who stood against a lightning bolt to prove his worth. Thor\'s thunder now courses through his veins, marking him as the storm\'s chosen champion.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [5309], // Frey's Thunder - lightning legendary
    heroPower: {
      id: 'thorgrim-power',
      name: 'Lightning Strike',
      description: 'Deal 1 damage and Freeze target.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      grantKeyword: 'frozen'
    },
    weaponUpgrade: {
      id: 90023,
      name: 'Storm Hammer',
      heroId: 'hero-thorgrim',
      manaCost: 5,
      description: 'Deal 2 damage and Freeze all enemies. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_and_freeze_all', value: 2, description: 'Deal 2 damage and Freeze all enemies.' },
      upgradedPowerId: 'thorgrim-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'thorgrim-power-upgraded',
      name: 'Lightning Strike+',
      description: 'Deal 2 damage and Freeze target.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      grantKeyword: 'frozen',
      isUpgraded: true,
      baseHeroPowerId: 'thorgrim-power'
    },
    passive: {
      id: 'thorgrim-passive',
      name: 'Static Field',
      description: 'Electric minions deal +1 damage to Frozen enemies.',
      trigger: 'on_minion_attack',
      condition: { minionElement: 'electric', requiresFrozen: true },
      effectType: 'buff_damage',
      value: 1
    }
  },

  // ==================== 24. GEFJON — Fortune's Edge ====================
  'hero-gefjon': {
    id: 'hero-gefjon',
    name: 'Gefjon',
    title: "Fortune's Edge",
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The Norse goddess of fortune and gambling. She ploughed Zealand from Sweden with four disguised oxen sons — a gambler who bets everything on one bold move.',
    lore: 'Gefjon laughed when Gylfi offered her as much land as four oxen could plough in a day and night. She transformed her four sons into oxen and carved Zealand from the earth. The gods learned: never wager against Gefjon.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [],
    heroPower: {
      id: 'gefjon-power',
      name: 'Roll the Dice',
      description: 'Deal 1-6 damage to a random enemy (like a dice roll).',
      cost: 2,
      targetType: 'none',
      effectType: 'roll_the_dice',
      value: 6,
    },
    weaponUpgrade: {
      id: 90024,
      name: "Gefjon's Golden Plough",
      heroId: 'hero-gefjon',
      manaCost: 5,
      description: 'Roll the Dice twice, keep the highest. Permanently upgrade your hero power.',
      immediateEffect: { type: 'roll_the_dice_double', value: 6, description: 'Roll the Dice twice, keep the highest damage.' },
      upgradedPowerId: 'gefjon-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'gefjon-power-upgraded',
      name: "Fortune's Favor",
      description: 'Roll 1-6 twice, deal the higher result as damage to a random enemy.',
      cost: 2,
      targetType: 'none',
      effectType: 'roll_the_dice_double',
      value: 6,
      isUpgraded: true,
      baseHeroPowerId: 'gefjon-power'
    },
    passive: {
      id: 'gefjon-passive',
      name: 'Fortune Favors the Bold',
      description: 'Whenever you roll a 6, draw a card.',
      trigger: 'on_roll_six',
      effectType: 'draw',
      value: 1
    }
  },

  // ==================== 25. LOGI ====================
  'hero-logi': {
    id: 'hero-logi',
    name: 'Logi',
    title: 'Fire Giant',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'The personification of fire itself.',
    lore: 'The consuming flame given form, who once devoured an entire feast faster than Loki could eat. He is fire\'s hunger incarnate, never satisfied, always spreading.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4352], // Flameheart Behemoth
    heroPower: {
      id: 'logi-power',
      name: 'Blazing Spark',
      description: 'Deal 2 damage to a random enemy minion.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 2
    },
    weaponUpgrade: {
      id: 90025,
      name: 'Flame of Consumption',
      heroId: 'hero-logi',
      manaCost: 5,
      description: 'Deal 3 damage to all enemy minions. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_aoe', value: 3, description: 'Deal 3 damage to all enemy minions.' },
      upgradedPowerId: 'logi-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'logi-power-upgraded',
      name: 'Blazing Spark+',
      description: 'Deal 3 damage to a random enemy minion.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'logi-power'
    },
    passive: {
      id: 'logi-passive',
      name: 'Consuming Flame',
      description: 'Fire minions have +1 Attack.',
      trigger: 'always',
      condition: { minionElement: 'fire' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 26. FJORGYN ====================
  'hero-fjorgyn': {
    id: 'hero-fjorgyn',
    name: 'Fjorgyn',
    title: 'Earth Mother',
    element: 'grass',
    weakness: 'fire',
    startingHealth: 100,
    description: "Thor's mother, goddess of the earth.",
    lore: 'The ancient earth goddess who bore the thunder god himself. Her embrace is the soil beneath all living things, her heartbeat the rumble of distant storms.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [6211], // Gefjon's Ox - earth/grass rare
    heroPower: {
      id: 'fjorgyn-power',
      name: "Thunder's Call",
      description: 'Deal 1 damage to all enemy minions.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_aoe',
      value: 1
    },
    weaponUpgrade: {
      id: 90026,
      name: 'Staff of the Earth',
      heroId: 'hero-fjorgyn',
      manaCost: 5,
      description: 'Deal 2 damage to all enemies and restore 5 HP to hero. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_and_heal', value: 2, description: 'Deal 2 damage to all enemies and restore 5 HP.' },
      upgradedPowerId: 'fjorgyn-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'fjorgyn-power-upgraded',
      name: "Thunder's Call+",
      description: 'Deal 2 damage to all enemy minions.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_aoe',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'fjorgyn-power'
    },
    passive: {
      id: 'fjorgyn-passive',
      name: 'Earthen Shield',
      description: 'Grass minions have +1 Health.',
      trigger: 'always',
      condition: { minionElement: 'grass' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 27. VALTHRUD ====================
  'hero-valthrud': {
    id: 'hero-valthrud',
    name: 'Valthrud',
    title: 'Storm Shaman',
    element: 'electric',
    weakness: 'grass',
    startingHealth: 100,
    description: 'A wise shaman who speaks with thunder.',
    lore: 'An ancient völva who learned to interpret the voice of storms themselves. Each thunderclap carries prophecy to those with ears to hear the storm\'s wisdom.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [5307], // Skoll's Storm - lightning legendary
    heroPower: {
      id: 'valthrud-power',
      name: 'Thunder Whisper',
      description: 'Deal 1 damage and give -1 Attack this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      secondaryValue: 1,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90027,
      name: 'Thunder Staff',
      heroId: 'hero-valthrud',
      manaCost: 5,
      description: 'Deal 2 damage to all enemies and give them -1 Attack. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_and_debuff', value: 2, description: 'Deal 2 damage to all enemies and give them -1 Attack.' },
      upgradedPowerId: 'valthrud-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'valthrud-power-upgraded',
      name: 'Thunder Whisper+',
      description: 'Deal 2 damage and give -1 Attack permanently.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      secondaryValue: 1,
      duration: 'permanent',
      isUpgraded: true,
      baseHeroPowerId: 'valthrud-power'
    },
    passive: {
      id: 'valthrud-passive',
      name: 'Storm Calling',
      description: 'Electric minions have +1 Attack.',
      trigger: 'always',
      condition: { minionElement: 'electric' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 28. YLVA ====================
  'hero-ylva': {
    id: 'hero-ylva',
    name: 'Ylva',
    title: 'Wolf Mother',
    element: 'grass',
    weakness: 'fire',
    startingHealth: 100,
    description: 'A fierce huntress who runs with wolves.',
    lore: 'Raised by wolves after her village fell to plague, she leads the greatest pack in Midgard. Her howl can summon any wolf within a hundred leagues to her side.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [6220], // Thorn Warden - protector of the forest
    heroPower: {
      id: 'ylva-power',
      name: 'Pack Call',
      description: 'Summon a 1/1 Wolf with Rush.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: { name: 'Wolf', attack: 1, health: 1, keywords: ['rush'] }
    },
    weaponUpgrade: {
      id: 90028,
      name: "Fenrir's Fang",
      heroId: 'hero-ylva',
      manaCost: 5,
      description: 'Summon two 2/2 Wolves with Rush. Permanently upgrade your hero power.',
      immediateEffect: { type: 'summon_multiple', value: 2, description: 'Summon two 2/2 Wolves with Rush.' },
      upgradedPowerId: 'ylva-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'ylva-power-upgraded',
      name: 'Pack Call+',
      description: 'Summon a 2/1 Wolf with Rush.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: { name: 'Wolf', attack: 2, health: 1, keywords: ['rush'] },
      isUpgraded: true,
      baseHeroPowerId: 'ylva-power'
    },
    passive: {
      id: 'ylva-passive',
      name: 'Pack Tactics',
      description: 'Grass minions have +1 Attack when attacking.',
      trigger: 'on_minion_attack',
      condition: { minionElement: 'grass' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 29. BRAKKI ====================
  'hero-brakki': {
    id: 'hero-brakki',
    name: 'Brakki',
    title: 'Forge Master',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'A dwarf smith of legendary skill.',
    lore: 'His forge burns hotter than Surtr\'s flames, and his hammer never strikes false. The dwarven masters of Nidavellir whisper that his work rivals even Brokkr and Sindri.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4353], // Gullinbursti, Golden Boar
    heroPower: {
      id: 'brakki-power',
      name: 'Forge Spark',
      description: 'Give a friendly minion +1/+1.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1
    },
    weaponUpgrade: {
      id: 90029,
      name: "Brakki's Anvil",
      heroId: 'hero-brakki',
      manaCost: 5,
      description: 'Give all friendly minions +2/+2. Permanently upgrade your hero power.',
      immediateEffect: { type: 'buff_aoe', value: 2, description: 'Give all friendly minions +2/+2.' },
      upgradedPowerId: 'brakki-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'brakki-power-upgraded',
      name: 'Forge Spark+',
      description: 'Give a friendly minion +2/+2.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'brakki-power'
    },
    passive: {
      id: 'brakki-passive',
      name: "Smith's Blessing",
      description: 'Fire minions have +1 Health.',
      trigger: 'always',
      condition: { minionElement: 'fire' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 30. LIRIEN ====================
  'hero-lirien': {
    id: 'hero-lirien',
    name: 'Lirien',
    title: 'Wave Priestess',
    element: 'water',
    weakness: 'grass',
    startingHealth: 100,
    description: 'A healer who draws power from the sea.',
    lore: 'A priestess of the deep who learned Aegir\'s healing arts beneath the waves. Saltwater runs through her veins, and her touch carries the ocean\'s restorative power.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4380], // Abyssal Kraken
    heroPower: {
      id: 'lirien-power',
      name: 'Wave Thread',
      description: 'Restore 3 health to a friendly minion.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'heal_single',
      value: 3
    },
    weaponUpgrade: {
      id: 90030,
      name: 'Trident of Tides',
      heroId: 'hero-lirien',
      manaCost: 5,
      description: 'Restore 5 health to all friendly minions. Permanently upgrade your hero power.',
      immediateEffect: { type: 'heal_aoe', value: 5, description: 'Restore 5 health to all friendly minions.' },
      upgradedPowerId: 'lirien-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'lirien-power-upgraded',
      name: 'Wave Thread+',
      description: 'Restore 5 health to a friendly minion.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'heal_single',
      value: 5,
      isUpgraded: true,
      baseHeroPowerId: 'lirien-power'
    },
    passive: {
      id: 'lirien-passive',
      name: 'Tidal Healing',
      description: 'Water minions restore 1 HP to themselves at end of turn.',
      trigger: 'end_of_turn',
      condition: { minionElement: 'water' },
      effectType: 'heal',
      value: 1
    }
  },

  // ==================== 31. SOLVI ====================
  'hero-solvi': {
    id: 'hero-solvi',
    name: 'Solvi',
    title: 'Dawn Knight',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'A holy knight who fights at dawn.',
    lore: 'Blessed by Sol herself, his armor blazes with dawn\'s first light. He has sworn to stand against darkness until Ragnarok claims the sun forever.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4395], // Valkyrie Commander
    heroPower: {
      id: 'solvi-power',
      name: 'Morning Glow',
      description: 'Give a friendly minion +1 Attack and Divine Shield.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1,
      grantKeyword: 'divine_shield'
    },
    weaponUpgrade: {
      id: 90031,
      name: 'Blade of Dawn',
      heroId: 'hero-solvi',
      manaCost: 5,
      description: 'Give all friendly minions +2 Attack and Divine Shield. Permanently upgrade your hero power.',
      immediateEffect: { type: 'buff_and_shield_all', value: 2, description: 'Give all friendly minions +2 Attack and Divine Shield.' },
      upgradedPowerId: 'solvi-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'solvi-power-upgraded',
      name: 'Morning Glow+',
      description: 'Give a friendly minion +2 Attack and Divine Shield.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      grantKeyword: 'divine_shield',
      isUpgraded: true,
      baseHeroPowerId: 'solvi-power'
    },
    passive: {
      id: 'solvi-passive',
      name: 'Radiant Aura',
      description: 'Light minions have +1 Attack.',
      trigger: 'always',
      condition: { minionElement: 'light' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 32. GORMR ====================
  'hero-gormr': {
    id: 'hero-gormr',
    name: 'Gormr',
    title: 'Venom Wyrm',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'A serpentine creature of darkness.',
    lore: 'A spawn of Nidhogg\'s venom, this wyrm slithers through the roots of Yggdrasil. Its poison corrodes both flesh and spirit, leaving only darkness in its wake.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4301], // Garm, the Hellhound
    heroPower: {
      id: 'gormr-power',
      name: 'Venom Fang',
      description: 'Deal 1 damage and apply Poisonous this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      grantKeyword: 'poisonous_temp'
    },
    weaponUpgrade: {
      id: 90032,
      name: 'Fang of Nidhogg',
      heroId: 'hero-gormr',
      manaCost: 5,
      description: 'Deal 2 damage to all enemies and give your minions Poisonous this turn. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_and_poison_all', value: 2, description: 'Deal 2 damage to all enemies and give your minions Poisonous.' },
      upgradedPowerId: 'gormr-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'gormr-power-upgraded',
      name: 'Venom Fang+',
      description: 'Deal 2 damage and apply Poisonous this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      grantKeyword: 'poisonous_temp',
      isUpgraded: true,
      baseHeroPowerId: 'gormr-power'
    },
    passive: {
      id: 'gormr-passive',
      name: 'Toxic Blood',
      description: 'Dark minions have Poisonous.',
      trigger: 'always',
      condition: { minionElement: 'dark' },
      effectType: 'grant_keyword',
      value: 0,
      grantKeyword: 'poisonous'
    }
  },

  // ==================== 33. THRYMA ====================
  'hero-thryma': {
    id: 'hero-thryma',
    name: 'Thryma',
    title: 'Storm Caller',
    element: 'electric',
    weakness: 'grass',
    startingHealth: 100,
    description: 'A mage who commands the storm.',
    lore: 'Born during the worst tempest in a thousand years, lightning struck her cradle. Now storms answer to her will, and thunder speaks her name across the sky.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [5308], // Sleipnir's Charge - lightning legendary
    heroPower: {
      id: 'thryma-power',
      name: 'Storm Step',
      description: 'Deal 2 damage; if target survives, return it to hand.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2
    },
    weaponUpgrade: {
      id: 90033,
      name: 'Storm Orb',
      heroId: 'hero-thryma',
      manaCost: 5,
      description: 'Deal 3 damage to all enemies and return the weakest to hand. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_and_bounce', value: 3, description: 'Deal 3 damage to all enemies and return the weakest to hand.' },
      upgradedPowerId: 'thryma-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'thryma-power-upgraded',
      name: 'Storm Step+',
      description: 'Deal 3 damage; if target survives, return it to hand.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'thryma-power'
    },
    passive: {
      id: 'thryma-passive',
      name: 'Electrified',
      description: 'Electric minions have +1 Attack.',
      trigger: 'always',
      condition: { minionElement: 'electric' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 34. ELDRIN ====================
  'hero-eldrin': {
    id: 'hero-eldrin',
    name: 'Eldrin',
    title: 'Ember Mage',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'A fire mage of great power.',
    lore: 'He walked into Muspelheim and emerged with fire in his soul. Flames dance at his fingertips, and even Surtr\'s servants pause at the heat of his presence.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4354], // Magma Leviathan
    heroPower: {
      id: 'eldrin-power',
      name: 'Cinder Trail',
      description: 'Deal 1 damage and give -1 Health this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      secondaryValue: 1,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90034,
      name: 'Phoenix Feather',
      heroId: 'hero-eldrin',
      manaCost: 5,
      description: 'Deal 2 damage to all enemies and give them -1 Health. Permanently upgrade your hero power.',
      immediateEffect: { type: 'damage_and_debuff', value: 2, description: 'Deal 2 damage to all enemies and give them -1 Health.' },
      upgradedPowerId: 'eldrin-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'eldrin-power-upgraded',
      name: 'Cinder Trail+',
      description: 'Deal 2 damage and give -1 Health permanently.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      secondaryValue: 1,
      duration: 'permanent',
      isUpgraded: true,
      baseHeroPowerId: 'eldrin-power'
    },
    passive: {
      id: 'eldrin-passive',
      name: 'Burning Aura',
      description: 'Fire minions deal +1 damage.',
      trigger: 'always',
      condition: { minionElement: 'fire' },
      effectType: 'buff_damage',
      value: 1
    }
  },

  // ==================== 35. MYRKA ====================
  'hero-myrka': {
    id: 'hero-myrka',
    name: 'Myrka',
    title: 'Bog Witch',
    element: 'water',
    weakness: 'grass',
    startingHealth: 100,
    description: 'A witch who dwells in the marshes.',
    lore: 'The swamps whisper secrets to those who listen, and she has listened for centuries. Her cauldron bubbles with waters from every bog in Midgard.',
    hasSpells: true,
    fixedCardIds: [4383], // Nokken, the Water Spirit
    heroPower: {
      id: 'myrka-power',
      name: 'Bog Grasp',
      description: 'Reduce an enemy minion\'s Attack by 2 this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'debuff_single',
      value: 2,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90035,
      name: 'Swamp Cauldron',
      heroId: 'hero-myrka',
      manaCost: 5,
      description: 'Reduce all enemy Attack by 2 and Freeze them. Permanently upgrade your hero power.',
      immediateEffect: { type: 'debuff_and_freeze_all', value: 2, description: 'Reduce all enemy Attack by 2 and Freeze them.' },
      upgradedPowerId: 'myrka-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'myrka-power-upgraded',
      name: 'Bog Grasp+',
      description: 'Reduce an enemy minion\'s Attack by 3 permanently.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'debuff_single',
      value: 3,
      duration: 'permanent',
      isUpgraded: true,
      baseHeroPowerId: 'myrka-power'
    },
    passive: {
      id: 'myrka-passive',
      name: 'Murky Waters',
      description: 'Water minions have +1 Health.',
      trigger: 'always',
      condition: { minionElement: 'water' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 36. FJORA ====================
  'hero-fjora': {
    id: 'hero-fjora',
    name: 'Fjora',
    title: 'Nature Oracle',
    element: 'grass',
    weakness: 'fire',
    startingHealth: 100,
    description: 'A seer who communes with nature.',
    lore: 'Her visions flow through the roots of Yggdrasil itself. Every tree, every flower, every blade of grass carries memories she alone can read.',
    hasSpells: true,
    fixedCardIds: [6210], // Leaf Stag - grass rare
    heroPower: {
      id: 'fjora-power',
      name: 'Root Sight',
      description: 'Foresee a Grass minion and give it +1/+1.',
      cost: 2,
      targetType: 'none',
      effectType: 'scry',
      value: 1
    },
    weaponUpgrade: {
      id: 90036,
      name: 'Yggdrasil Branch',
      heroId: 'hero-fjora',
      manaCost: 5,
      description: 'Foresee 2 Grass minions and give them +2/+2. Permanently upgrade your hero power.',
      immediateEffect: { type: 'discover_and_buff', value: 2, description: 'Foresee 2 Grass minions and give them +2/+2.' },
      upgradedPowerId: 'fjora-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'fjora-power-upgraded',
      name: 'Root Sight+',
      description: 'Foresee a Grass minion and give it +2/+2.',
      cost: 2,
      targetType: 'none',
      effectType: 'scry',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'fjora-power'
    },
    passive: {
      id: 'fjora-passive',
      name: 'Deep Roots',
      description: 'Grass minions have +1/+1 when played.',
      trigger: 'on_minion_play',
      condition: { minionElement: 'grass' },
      effectType: 'buff',
      value: 1
    }
  },

  // ==================== GREEK HEROES (Alt-skins — preserved from mythology expansion) ====================

  // ==================== 15. SELENE ====================
  'hero-selene': {
    id: 'hero-selene',
    name: 'Selene',
    title: 'Titaness of the Moon',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'The Greek Titaness who personifies the moon and drives her silver chariot across the night sky.',
    lore: 'Selene rises each night to illuminate the world with her gentle silver light. Her moonbeams grant concealment to those who walk in shadow, and her love for the mortal Endymion led her to beg Zeus to grant him eternal sleep — that she might gaze upon his beauty forever.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [],
    heroClass: 'rogue',
    heroPower: {
      id: 'selene-power',
      name: 'Lunar Veil',
      description: 'Give a friendly minion Stealth until your next turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'grant_keyword',
      grantKeyword: 'stealth',
      duration: 'next_turn'
    },
    weaponUpgrade: {
      id: 90060,
      name: 'Silver Chariot',
      heroId: 'hero-selene',
      manaCost: 5,
      description: 'Give all friendly minions Stealth and +1 Attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'stealth_and_buff_all',
        value: 1,
        description: 'Give all friendly minions Stealth and +1 Attack.'
      },
      upgradedPowerId: 'selene-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'selene-power-upgraded',
      name: 'Lunar Veil+',
      description: 'Give a friendly minion Stealth and +2 Attack until your next turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'grant_keyword',
      grantKeyword: 'stealth',
      value: 2,
      duration: 'next_turn',
      isUpgraded: true,
      baseHeroPowerId: 'selene-power'
    },
    passive: {
      id: 'selene-passive',
      name: "Selene's Shroud",
      description: 'Dark minions have +1 Health.',
      trigger: 'always',
      condition: { minionElement: 'dark' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 16. HECATE ====================
  'hero-hecate': {
    id: 'hero-hecate',
    name: 'Hecate',
    title: 'Goddess of Magic',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'The Greek goddess of magic, crossroads, and the restless dead.',
    lore: 'Hecate stands at the crossroads between worlds, wielding power over magic and spirits. She guides lost souls and punishes the wicked with her spectral torches. Even Zeus honored her authority, for her power predates the Olympians.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [],
    heroClass: 'warlock',
    heroPower: {
      id: 'hecate-power',
      name: 'Claim Soul',
      description: 'Destroy an enemy minion with 2 or less Attack.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'conditional_destroy',
      condition: { maxAttack: 2 }
    },
    weaponUpgrade: {
      id: 90061,
      name: 'Torches of Hecate',
      heroId: 'hero-hecate',
      manaCost: 5,
      description: 'Destroy all enemy minions with 3 or less Attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'conditional_destroy_all',
        condition: { maxAttack: 3 },
        description: 'Destroy all enemy minions with 3 or less Attack.'
      },
      upgradedPowerId: 'hecate-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hecate-power-upgraded',
      name: 'Claim Soul+',
      description: 'Destroy an enemy minion with 3 or less Attack.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'conditional_destroy',
      condition: { maxAttack: 3 },
      isUpgraded: true,
      baseHeroPowerId: 'hecate-power'
    },
    passive: {
      id: 'hecate-passive',
      name: "Crossroads' Curse",
      description: 'Restore 1 health to your hero when an enemy minion dies.',
      trigger: 'on_enemy_death',
      effectType: 'heal_hero',
      value: 1
    }
  },

  // ==================== 17. HELIOS ====================
  'hero-helios': {
    id: 'hero-helios',
    name: 'Helios',
    title: 'Titan of the Sun',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The Greek Titan who drives the sun chariot across the sky each day, seeing all from his golden vantage.',
    lore: 'Helios sees all from his golden chariot. Each dawn he rises from the east, bringing light and warmth to the world, and each night he descends into the western sea. He bore witness to the abduction of Persephone and the affairs of Ares, for nothing escapes his burning gaze.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [],
    heroClass: 'priest',
    heroPower: {
      id: 'helios-power',
      name: 'Divine Radiance',
      description: 'Restore 2 health to a friendly minion.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'heal',
      value: 2
    },
    weaponUpgrade: {
      id: 90062,
      name: 'Chariot of the Sun',
      heroId: 'hero-helios',
      manaCost: 5,
      description: 'Restore 4 health to all friendly minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'heal_all_friendly',
        value: 4,
        description: 'Restore 4 health to all friendly minions.'
      },
      upgradedPowerId: 'helios-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'helios-power-upgraded',
      name: 'Divine Radiance+',
      description: 'Restore 3 health to a friendly minion.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'heal',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'helios-power'
    },
    passive: {
      id: 'helios-passive',
      name: 'Solar Blessing',
      description: 'At the start of your turn, restore 1 health to all friendly minions.',
      trigger: 'start_of_turn',
      effectType: 'heal_all_friendly',
      value: 1
    }
  }
};

export const ADDITIONAL_HERO_LIST = Object.values(ADDITIONAL_HEROES);

export const getAdditionalHeroById = (id: string): NorseHero | undefined => {
  return ADDITIONAL_HEROES[id];
};

export const getAllAdditionalHeroes = (): NorseHero[] => {
  return ADDITIONAL_HERO_LIST;
};

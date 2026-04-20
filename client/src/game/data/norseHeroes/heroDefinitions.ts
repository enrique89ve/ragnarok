/**
 * heroDefinitions.ts
 * 
 * Definitions for Norse Heroes in Ragnarok Poker.
 * Each hero has: Hero Power, Weapon Upgrade, Personal Passive, Fixed Cards.
 */

import { NorseHero, NorseHeroPower, NorseWeaponUpgrade, NorseHeroPowerUpgrade, NorseHeroPassive } from '../../types/NorseTypes';

// ==================== PRIMARY GODS (22 Heroes) ====================

export const NORSE_HEROES: Record<string, NorseHero> = {

  // ==================== 1. ODIN ====================
  'hero-odin': {
    id: 'hero-odin',
    name: 'Odin',
    title: 'The Allfather',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The king of the Aesir gods, known for his wisdom and sacrifice.',
    lore: 'The primordial king who sacrificed his eye for infinite wisdom. He hangs from Yggdrasil to learn the secrets of the runes, commanding Huginn and Muninn to see all.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4390], // Huginn, Odin's Raven of Thought
    heroPower: {
      id: 'odin-power',
      name: 'Wisdom of the Ravens',
      description: 'Reveal a random card in opponent\'s hand and draw a card.',
      cost: 2,
      targetType: 'none',
      effectType: 'draw',
      value: 1,
      secondaryValue: 1 // Reveal count
    },
    weaponUpgrade: {
      id: 90001,
      name: 'Gungnir',
      heroId: 'hero-odin',
      manaCost: 5,
      description: 'Reveal opponent\'s entire hand. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'reveal_all',
        description: 'Reveal opponent\'s entire hand this turn.'
      },
      upgradedPowerId: 'odin-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'odin-power-upgraded',
      name: 'Wisdom of the Ravens+',
      description: 'Reveal 2 random cards in opponent\'s hand and draw 2 cards.',
      cost: 2,
      targetType: 'none',
      effectType: 'draw',
      value: 2,
      secondaryValue: 2,
      isUpgraded: true,
      baseHeroPowerId: 'odin-power'
    },
    passive: {
      id: 'odin-passive',
      name: 'Illuminated Path',
      description: 'Playing a Light minion reveals a random opponent card.',
      trigger: 'on_minion_play',
      condition: { minionElement: 'light' },
      effectType: 'reveal',
      value: 1
    }
  },

  // ==================== 2. THOR ====================
  'hero-thor': {
    id: 'hero-thor',
    name: 'Thor',
    title: 'God of Thunder',
    element: 'electric',
    weakness: 'light',
    startingHealth: 100,
    description: 'The mighty god of thunder, wielder of Mjolnir.',
    lore: 'The mightiest warrior of Asgard whose hammer Mjolnir was forged from a dying star. When thunder roars, the Nine Realms tremble before his unstoppable wrath.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4355], // Skoll, Sun-Chaser
    heroPower: {
      id: 'thor-power',
      name: "Mjolnir's Wrath",
      description: 'Deal 1 damage to all enemy minions.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_aoe',
      value: 1
    },
    weaponUpgrade: {
      id: 90002,
      name: 'Mjolnir',
      heroId: 'hero-thor',
      manaCost: 5,
      description: 'Deal 5 damage to all enemy minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_aoe',
        value: 5,
        description: 'Deal 5 damage to all enemy minions.'
      },
      upgradedPowerId: 'thor-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'thor-power-upgraded',
      name: "Mjolnir's Wrath+",
      description: 'Deal 2 damage to all enemy minions.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_aoe',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'thor-power'
    },
    passive: {
      id: 'thor-passive',
      name: 'Thunderous Presence',
      description: 'Electric minions have +1 Attack.',
      trigger: 'always',
      condition: { minionElement: 'electric' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 3. LOKI ====================
  'hero-loki': {
    id: 'hero-loki',
    name: 'Loki',
    title: 'The Trickster',
    element: 'dark',
    weakness: 'grass',
    startingHealth: 100,
    description: 'The cunning god of mischief and deception.',
    lore: 'The silver-tongued trickster who walks between worlds, father of monsters and chaos incarnate. His schemes weave through the fates of gods and men alike.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4300, 95077], // Fenrir (Bound Wolf) and Jormungandr (World Serpent)
    heroPower: {
      id: 'loki-power',
      name: 'Deceptive Grasp',
      description: 'Copy a random card from opponent\'s hand.',
      cost: 2,
      targetType: 'none',
      effectType: 'copy',
      value: 1
    },
    weaponUpgrade: {
      id: 90003,
      name: 'Laevateinn',
      heroId: 'hero-loki',
      manaCost: 5,
      description: 'Copy 2 random cards from opponent\'s hand. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'copy',
        value: 2,
        description: 'Copy 2 random cards from opponent\'s hand.'
      },
      upgradedPowerId: 'loki-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'loki-power-upgraded',
      name: 'Deceptive Grasp+',
      description: 'Copy 2 random cards from opponent\'s hand.',
      cost: 2,
      targetType: 'none',
      effectType: 'copy',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'loki-power'
    },
    passive: {
      id: 'loki-passive',
      name: "Shadow's Trick",
      description: 'Playing a Dark minion copies a random card from opponent\'s deck.',
      trigger: 'on_minion_play',
      condition: { minionElement: 'dark' },
      effectType: 'copy',
      value: 1
    }
  },

  // ==================== 4. FREYA ====================
  'hero-freya': {
    id: 'hero-freya',
    name: 'Freya',
    title: 'Goddess of Love and War',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'The goddess of love, beauty, and battle.',
    lore: 'The most beautiful of all goddesses, she claims half of the fallen warriors for her halls in Folkvangr. Her tears turn to gold, and her fury in battle rivals even the Aesir.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4371, 95080], // Eikthyrnir, the Stag of Valhalla + Hildisvíni, the Battle Boar
    heroPower: {
      id: 'freya-power',
      name: 'Blessing of Valhalla',
      description: 'Give a friendly minion +1/+1 and restore 2 HP to hero.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1,
      secondaryValue: 2 // Hero heal
    },
    weaponUpgrade: {
      id: 90004,
      name: 'Brísingamen',
      heroId: 'hero-freya',
      manaCost: 5,
      description: 'Give all friendly minions +2/+2 and restore 10 HP. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe',
        value: 2,
        description: 'Give all friendly minions +2/+2 and restore 10 HP.'
      },
      upgradedPowerId: 'freya-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'freya-power-upgraded',
      name: 'Blessing of Valhalla+',
      description: 'Give a friendly minion +2/+2 and restore 4 HP to hero.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      secondaryValue: 4,
      isUpgraded: true,
      baseHeroPowerId: 'freya-power'
    },
    passive: {
      id: 'freya-passive',
      name: "Nature's Embrace",
      description: 'End of turn: Restore 1 HP to all Grass minions.',
      trigger: 'end_of_turn',
      condition: { minionElement: 'grass' },
      effectType: 'heal',
      value: 1
    }
  },

  // ==================== 5. BRAGI ====================
  'hero-bragi': {
    id: 'hero-bragi',
    name: 'Bragi',
    title: 'God of Poetry',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The god of poetry and music, inspiring all with his words.',
    lore: 'His tongue was carved with sacred runes at birth, making his voice the very essence of poetry. When Bragi speaks, even the Norns pause their weaving to listen.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4391], // Muninn, Odin's Raven of Memory
    heroPower: {
      id: 'bragi-power',
      name: 'Inspiring Verse',
      description: 'Give a random friendly minion +2 Attack this turn.',
      cost: 2,
      targetType: 'random_friendly',
      effectType: 'buff_single',
      value: 2,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90005,
      name: 'Harp of Harmony',
      heroId: 'hero-bragi',
      manaCost: 5,
      description: 'Give all friendly minions +2/+2 until next turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe',
        value: 2,
        description: 'Give all friendly minions +2/+2 until next turn.'
      },
      upgradedPowerId: 'bragi-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'bragi-power-upgraded',
      name: 'Inspiring Verse+',
      description: 'Give a random friendly minion +3 Attack and +1 Health permanently.',
      cost: 2,
      targetType: 'random_friendly',
      effectType: 'buff_single',
      value: 3,
      secondaryValue: 1,
      duration: 'permanent',
      isUpgraded: true,
      baseHeroPowerId: 'bragi-power'
    },
    passive: {
      id: 'bragi-passive',
      name: 'Luminous Words',
      description: 'Light minions gain +1 Attack when you cast a spell.',
      trigger: 'on_spell_cast',
      condition: { minionElement: 'light' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 6. EIR ====================
  'hero-eir': {
    id: 'hero-eir',
    name: 'Eir',
    title: 'Goddess of Healing',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'The divine healer who tends to the wounded.',
    lore: 'The divine physician whose hands have mended the wounds of countless gods. She alone knows the sacred herbs that can restore life from death\'s very threshold.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4370], // Audhumla, the Primeval Cow - representing life and nature
    heroPower: {
      id: 'eir-power',
      name: 'Herbal Remedy',
      description: 'Restore 3 health to hero or a friendly minion.',
      cost: 2,
      targetType: 'friendly_character',
      effectType: 'heal_single',
      value: 3
    },
    weaponUpgrade: {
      id: 90006,
      name: 'Staff of Renewal',
      heroId: 'hero-eir',
      manaCost: 5,
      description: 'Restore 10 HP to hero and summon a 3/3 Healing Bloom with Taunt. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'heal_and_summon',
        value: 10,
        description: 'Restore 10 HP and summon a 3/3 Healing Bloom with Taunt.'
      },
      upgradedPowerId: 'eir-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'eir-power-upgraded',
      name: 'Herbal Remedy+',
      description: 'Restore 5 health to hero or a friendly minion.',
      cost: 2,
      targetType: 'friendly_character',
      effectType: 'heal_single',
      value: 5,
      isUpgraded: true,
      baseHeroPowerId: 'eir-power'
    },
    passive: {
      id: 'eir-passive',
      name: 'Vital Growth',
      description: 'Grass minions restore 2 HP to themselves when they attack.',
      trigger: 'on_minion_attack',
      condition: { minionElement: 'grass' },
      effectType: 'heal',
      value: 2
    }
  },

  // ==================== 7. FORSETI ====================
  'hero-forseti': {
    id: 'hero-forseti',
    name: 'Forseti',
    title: 'God of Justice',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The god of justice and reconciliation.',
    lore: 'The incorruptible arbiter whose judgments are absolute law in all Nine Realms. None who enter his golden hall Glitnir leave without justice being served.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4392], // Baldur, God of Light
    heroPower: {
      id: 'forseti-power',
      name: 'Balanced Verdict',
      description: 'Deal 1 damage to an enemy minion and restore 1 HP to a friendly minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      secondaryValue: 1 // Heal amount
    },
    weaponUpgrade: {
      id: 90007,
      name: 'Axe of Truth',
      heroId: 'hero-forseti',
      manaCost: 5,
      description: 'Deal 3 damage to an enemy and restore 3 HP to all friendlies. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_and_heal',
        value: 3,
        description: 'Deal 3 damage to an enemy and restore 3 HP to all friendlies.'
      },
      upgradedPowerId: 'forseti-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'forseti-power-upgraded',
      name: 'Balanced Verdict+',
      description: 'Deal 2 damage to an enemy minion and restore 2 HP to a friendly minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      secondaryValue: 2,
      isUpgraded: true,
      baseHeroPowerId: 'forseti-power'
    },
    passive: {
      id: 'forseti-passive',
      name: 'Just Radiance',
      description: 'Light minions have +1 Health when attacked.',
      trigger: 'always',
      condition: { minionElement: 'light' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 8. FREY ====================
  'hero-frey': {
    id: 'hero-frey',
    name: 'Frey',
    title: 'God of Fertility',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'The god of fertility, prosperity, and sunshine.',
    lore: 'The radiant lord of Alfheim who surrendered his sword for love, yet still commands the sun\'s warmth. Harvests flourish and life blooms wherever his gaze falls.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4372], // Fafnir, the Gold-Hoarding Dragon
    heroPower: {
      id: 'frey-power',
      name: 'Bountiful Seed',
      description: 'Summon a 1/1 Sapling with Deathrattle: Summon a 2/2 Treant.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: {
        name: 'Sapling',
        attack: 1,
        health: 1,
        deathrattle: {
          summonName: 'Treant',
          summonAttack: 2,
          summonHealth: 2
        }
      }
    },
    weaponUpgrade: {
      id: 90008,
      name: 'Gullinbursti',
      heroId: 'hero-frey',
      manaCost: 5,
      description: 'Transform a friendly minion into a 5/5 Golden Boar with Charge. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'transform',
        value: 5,
        description: 'Transform a friendly minion into a 5/5 Golden Boar with Charge.'
      },
      upgradedPowerId: 'frey-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'frey-power-upgraded',
      name: 'Bountiful Seed+',
      description: 'Summon a 2/2 Treant with Deathrattle: Summon a 3/3 Ancient.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: {
        name: 'Treant',
        attack: 2,
        health: 2,
        deathrattle: {
          summonName: 'Ancient',
          summonAttack: 3,
          summonHealth: 3
        }
      },
      isUpgraded: true,
      baseHeroPowerId: 'frey-power'
    },
    passive: {
      id: 'frey-passive',
      name: 'Fertile Roots',
      description: 'Grass minions gain +1/+1 when summoned.',
      trigger: 'on_minion_play',
      condition: { minionElement: 'grass' },
      effectType: 'buff',
      value: 1
    }
  },

  // ==================== 9. IDUNN ====================
  'hero-idunn': {
    id: 'hero-idunn',
    name: 'Idunn',
    title: 'Goddess of Youth',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'The goddess who tends the apples of immortality.',
    lore: 'The eternal maiden who tends the golden apples of immortality in her sacred garden. Without her divine fruit, even the gods would wither and fade into dust.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4373], // Rootbound Stag
    heroPower: {
      id: 'idunn-power',
      name: 'Apple of Eternity',
      description: 'Give a friendly minion Deathrattle: Restore 3 HP to hero.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'grant_keyword',
      grantKeyword: 'deathrattle_heal_3'
    },
    weaponUpgrade: {
      id: 90009,
      name: "Orchard's Bounty",
      heroId: 'hero-idunn',
      manaCost: 5,
      description: 'Give all friendly minions Deathrattle: Summon a 2/2 Apple Tree. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'grant_deathrattle_all',
        description: 'Give all friendly minions Deathrattle: Summon a 2/2 Apple Tree.'
      },
      upgradedPowerId: 'idunn-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'idunn-power-upgraded',
      name: 'Apple of Eternity+',
      description: 'Give a friendly minion Deathrattle: Restore 5 HP and draw a card.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'grant_keyword',
      grantKeyword: 'deathrattle_heal_5_draw',
      isUpgraded: true,
      baseHeroPowerId: 'idunn-power'
    },
    passive: {
      id: 'idunn-passive',
      name: 'Evergreen Youth',
      description: 'Grass minions have +2 Health.',
      trigger: 'always',
      condition: { minionElement: 'grass' },
      effectType: 'buff_health',
      value: 2
    }
  },

  // ==================== 10. RAN ====================
  'hero-ran': {
    id: 'hero-ran',
    name: 'Ran',
    title: 'Goddess of the Drowned',
    element: 'water',
    weakness: 'electric',
    startingHealth: 100,
    description: 'The goddess of the sea who captures drowned sailors.',
    lore: 'She drags sailors to their watery graves with her gleaming golden net. In the lightless depths of her domain, the drowned serve her for all eternity.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4382], // Ran, Goddess of the Sea
    heroPower: {
      id: 'ran-power',
      name: 'Net of Fate',
      description: 'Reduce an enemy minion\'s Attack by 2 this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'debuff_single',
      value: 2,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90010,
      name: 'Golden Net',
      heroId: 'hero-ran',
      manaCost: 5,
      description: 'Silence all enemy minions and deal 1 damage to them. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'silence_and_damage',
        value: 1,
        description: 'Silence all enemy minions and deal 1 damage to them.'
      },
      upgradedPowerId: 'ran-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'ran-power-upgraded',
      name: 'Net of Fate+',
      description: 'Reduce an enemy minion\'s Attack by 3 permanently.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'debuff_single',
      value: 3,
      duration: 'permanent',
      isUpgraded: true,
      baseHeroPowerId: 'ran-power'
    },
    passive: {
      id: 'ran-passive',
      name: 'Drowned Souls',
      description: 'When an enemy minion dies, Water minions gain +1 Attack this turn.',
      trigger: 'on_minion_death',
      condition: { minionElement: 'water', targetType: 'enemy' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 11. SOL ====================
  'hero-sol': {
    id: 'hero-sol',
    name: 'Sol',
    title: 'Goddess of the Sun',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'The goddess who drives the chariot of the sun.',
    lore: 'She drives her blazing chariot across the sky, forever chased by the ravenous wolf Skoll. The light of all Nine Realms depends on her endless flight.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4351], // Cinderstorm Wyrm
    heroPower: {
      id: 'sol-power',
      name: 'Solar Flare',
      description: 'Deal 2 damage to a random enemy minion.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 2
    },
    weaponUpgrade: {
      id: 90011,
      name: 'Chariot of Flame',
      heroId: 'hero-sol',
      manaCost: 5,
      description: 'Deal 3 damage to all enemy minions and 5 to enemy hero. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_all_and_hero',
        value: 3,
        description: 'Deal 3 damage to all enemy minions and 5 to enemy hero.'
      },
      upgradedPowerId: 'sol-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'sol-power-upgraded',
      name: 'Solar Flare+',
      description: 'Deal 3 damage to a random enemy minion and 1 to all others.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 3,
      secondaryValue: 1,
      isUpgraded: true,
      baseHeroPowerId: 'sol-power'
    },
    passive: {
      id: 'sol-passive',
      name: 'Burning Light',
      description: 'Fire minions deal +1 damage to enemy hero when attacking.',
      trigger: 'on_minion_attack',
      condition: { minionElement: 'fire' },
      effectType: 'damage_hero',
      value: 1
    }
  },

  // ==================== 12. MANI ====================
  'hero-mani': {
    id: 'hero-mani',
    name: 'Mani',
    title: 'God of the Moon',
    element: 'dark',
    weakness: 'grass',
    startingHealth: 100,
    description: 'The god who guides the moon across the sky.',
    lore: 'The keeper of the moon who guides the stars through the endless night. Hati pursues him across the heavens until Ragnarok\'s final hour arrives.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4302], // Hati, the Moon-Devourer
    heroPower: {
      id: 'mani-power',
      name: 'Lunar Shadow',
      description: 'Give a friendly minion Stealth until your next turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'stealth',
      duration: 'next_turn'
    },
    weaponUpgrade: {
      id: 90012,
      name: 'Sickle of Night',
      heroId: 'hero-mani',
      manaCost: 5,
      description: 'Deal 4 damage to an enemy and give all friendlies Stealth this turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_and_stealth',
        value: 4,
        description: 'Deal 4 damage to an enemy and give all friendlies Stealth.'
      },
      upgradedPowerId: 'mani-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'mani-power-upgraded',
      name: 'Lunar Shadow+',
      description: 'Give a friendly minion Stealth and +2 Attack until next turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'stealth',
      value: 2,
      duration: 'next_turn',
      isUpgraded: true,
      baseHeroPowerId: 'mani-power'
    },
    passive: {
      id: 'mani-passive',
      name: 'Moonlit Prowl',
      description: 'Dark minions have +1/+1 while they have Stealth.',
      trigger: 'always',
      condition: { minionElement: 'dark', requiresStealth: true },
      effectType: 'buff',
      value: 1
    }
  },

  // ==================== 13. HODER ====================
  'hero-hoder': {
    id: 'hero-hoder',
    name: 'Hoder',
    title: 'Blind God of Winter',
    element: 'dark',
    weakness: 'grass',
    startingHealth: 100,
    description: 'The blind god who unknowingly slew Baldr.',
    lore: 'The blind god whose mistletoe arrow slew the beloved Baldur, guided by Loki\'s treachery. Cursed by fate, his darkness became the catalyst for Ragnarok itself.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4303], // Nidhogg, the Root-Gnawer
    heroPower: {
      id: 'hoder-power',
      name: 'Blind Shot',
      description: 'Deal 3 damage to a random enemy character.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 3
    },
    weaponUpgrade: {
      id: 90013,
      name: 'Bow of Misfortune',
      heroId: 'hero-hoder',
      manaCost: 5,
      description: 'Deal 5 damage randomly split among all enemies. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_split',
        value: 5,
        description: 'Deal 5 damage randomly split among all enemies.'
      },
      upgradedPowerId: 'hoder-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hoder-power-upgraded',
      name: 'Blind Shot+',
      description: 'Deal 4 damage to a random enemy and 1 to enemy hero.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 4,
      secondaryValue: 1,
      isUpgraded: true,
      baseHeroPowerId: 'hoder-power'
    },
    passive: {
      id: 'hoder-passive',
      name: 'Shroud of Gloom',
      description: 'Dark minions take 1 less damage from abilities.',
      trigger: 'always',
      condition: { minionElement: 'dark' },
      effectType: 'damage_reduction',
      value: 1
    }
  },

  // ==================== 14. KVASIR ====================
  'hero-kvasir': {
    id: 'hero-kvasir',
    name: 'Kvasir',
    title: 'God of Wisdom',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The wisest of beings, created from the saliva of the gods.',
    lore: 'Born from the mingled saliva of all the gods, his wisdom has no equal in any realm. From his blood was brewed the Mead of Poetry that grants divine inspiration.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [5504], // Luminos Hart - radiant stag of wisdom
    heroPower: {
      id: 'kvasir-power',
      name: 'Sip of Insight',
      description: 'Look at the top card of your deck; may put it on bottom.',
      cost: 2,
      targetType: 'none',
      effectType: 'scry',
      value: 1
    },
    weaponUpgrade: {
      id: 90014,
      name: 'Horn of Knowledge',
      heroId: 'hero-kvasir',
      manaCost: 5,
      description: 'Draw 3 cards, discard 1 at random. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'draw_discard',
        value: 3,
        description: 'Draw 3 cards, discard 1 at random.'
      },
      upgradedPowerId: 'kvasir-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'kvasir-power-upgraded',
      name: 'Sip of Insight+',
      description: 'Look at top 2 cards, draw 1, put the other on bottom.',
      cost: 2,
      targetType: 'none',
      effectType: 'scry',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'kvasir-power'
    },
    passive: {
      id: 'kvasir-passive',
      name: 'Wise Brew',
      description: 'Light minions cost 1 less after you draw a card.',
      trigger: 'on_draw',
      condition: { minionElement: 'light' },
      effectType: 'cost_reduction',
      value: 1
    }
  },

  // ==================== 15. MAGNI ====================
  'hero-magni': {
    id: 'hero-magni',
    name: 'Magni',
    title: 'God of Strength',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'Son of Thor, destined to survive Ragnarok.',
    lore: 'Thor\'s mighty son who lifted the giant Hrungnir\'s corpse when even his father could not. He is destined to inherit Mjolnir and rebuild the world after Ragnarok.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4350], // Surtr, Flame Giant - legendary fire giant
    heroPower: {
      id: 'magni-power',
      name: 'Hammer Strike',
      description: 'Deal 1 damage to an enemy minion and give a random friendly +1 Attack.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      secondaryValue: 1 // Attack buff
    },
    weaponUpgrade: {
      id: 90015,
      name: 'Forge Maul',
      heroId: 'hero-magni',
      manaCost: 5,
      description: 'Deal 3 damage to an enemy minion and summon a 3/3 Golem with Rush. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_and_summon',
        value: 3,
        description: 'Deal 3 damage to enemy minion and summon a 3/3 Golem with Rush.'
      },
      upgradedPowerId: 'magni-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'magni-power-upgraded',
      name: 'Hammer Strike+',
      description: 'Deal 2 damage to an enemy minion and give a random friendly +2 Attack.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      secondaryValue: 2,
      isUpgraded: true,
      baseHeroPowerId: 'magni-power'
    },
    passive: {
      id: 'magni-passive',
      name: 'Molten Craft',
      description: 'Fire minions gain +1 Attack after you play a Rush minion.',
      trigger: 'on_minion_play',
      condition: { minionElement: 'fire' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 16. SINMARA ====================
  'hero-sinmara': {
    id: 'hero-sinmara',
    name: 'Sinmara',
    title: 'Giantess of Muspelheim',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'The fire giantess, wife of Surtr.',
    lore: 'The fire giantess who guards the flaming sword Lævateinn in the scorching realm of Muspelheim. Her blazing form rivals her husband Surtr in terrifying splendor.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [5009], // Muspelheim's Fury - fire legendary for Surtr's wife
    heroPower: {
      id: 'sinmara-power',
      name: 'Burning Gaze',
      description: 'Deal 1 damage to an enemy minion and give it -1 Attack this turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 1,
      secondaryValue: 1, // Attack debuff
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90016,
      name: 'Blade of Embers',
      heroId: 'hero-sinmara',
      manaCost: 5,
      description: 'Deal 4 damage to an enemy minion and give all enemies -2 Attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_and_debuff',
        value: 4,
        description: 'Deal 4 damage to enemy minion and give all enemies -2 Attack.'
      },
      upgradedPowerId: 'sinmara-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'sinmara-power-upgraded',
      name: 'Burning Gaze+',
      description: 'Deal 2 damage to an enemy minion and give it -1 Attack permanently.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2,
      secondaryValue: 1,
      duration: 'permanent',
      isUpgraded: true,
      baseHeroPowerId: 'sinmara-power'
    },
    passive: {
      id: 'sinmara-passive',
      name: 'Blazing Dominion',
      description: 'Fire minions have +1 Attack while an enemy has reduced Attack.',
      trigger: 'always',
      condition: { minionElement: 'fire' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 17. SKADI ====================
  'hero-skadi': {
    id: 'hero-skadi',
    name: 'Skadi',
    title: 'Goddess of Winter',
    element: 'ice',
    weakness: 'fire',
    startingHealth: 100,
    description: 'The goddess of winter, skiing, and hunting.',
    lore: 'The giantess who hunts through frozen peaks with wolf and bow, bringing winter\'s wrath. She chose her husband by his feet alone and brought eternal frost to the mountains.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4381], // Frostfang Serpent
    heroPower: {
      id: 'skadi-power',
      name: 'Frostbite Strike',
      description: 'Freeze an enemy minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'freeze'
    },
    weaponUpgrade: {
      id: 90017,
      name: 'Spear of Icewind',
      heroId: 'hero-skadi',
      manaCost: 5,
      description: 'Freeze all enemy minions and deal 2 damage to them. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'freeze_and_damage_all',
        value: 2,
        description: 'Freeze all enemy minions and deal 2 damage to them.'
      },
      upgradedPowerId: 'skadi-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'skadi-power-upgraded',
      name: 'Frostbite Strike+',
      description: 'Freeze an enemy minion and deal 1 damage to it.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'freeze',
      value: 1,
      isUpgraded: true,
      baseHeroPowerId: 'skadi-power'
    },
    passive: {
      id: 'skadi-passive',
      name: 'Glacial Chill',
      description: 'Ice minions have +1 Attack while an enemy is Frozen.',
      trigger: 'always',
      condition: { minionElement: 'ice', requiresFrozen: true },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 18. HEIMDALL ====================
  'hero-heimdall': {
    id: 'hero-heimdall',
    name: 'Heimdall',
    title: 'The Watchful Guardian',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The vigilant guardian of Bifrost, the rainbow bridge.',
    lore: 'The ever-vigilant guardian who never sleeps, seeing and hearing all across the Nine Realms. His horn Gjallarhorn will sound the doom of Ragnarok when giants march.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4394, 95078], // Heimdall, Guardian of Bifrost + Gulltoppr, the Golden-Maned
    heroPower: {
      id: 'heimdall-power',
      name: "Guardian's Call",
      description: 'Give a friendly minion +2 Health and Taunt.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      grantKeyword: 'taunt'
    },
    weaponUpgrade: {
      id: 90018,
      name: 'Gjallarhorn',
      heroId: 'hero-heimdall',
      manaCost: 5,
      description: 'Give all friendly minions Taunt and take 2 less damage until next turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'grant_taunt_and_armor',
        value: 2,
        description: 'Give all friendly minions Taunt and damage reduction.'
      },
      upgradedPowerId: 'heimdall-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'heimdall-power-upgraded',
      name: "Guardian's Call+",
      description: 'Give a friendly minion +3 Health and Taunt.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 3,
      grantKeyword: 'taunt',
      isUpgraded: true,
      baseHeroPowerId: 'heimdall-power'
    },
    passive: {
      id: 'heimdall-passive',
      name: 'Vigilant Watch',
      description: 'When a friendly minion is attacked, the attacker gets -1 Attack permanently.',
      trigger: 'on_minion_attack',
      condition: { targetType: 'friendly' },
      effectType: 'debuff_attack',
      value: 1
    }
  },

  // ==================== 19. VILI ====================
  'hero-vili': {
    id: 'hero-vili',
    name: 'Vili',
    title: 'God of Will',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Brother of Odin who helped slay Ymir.',
    lore: 'Brother of Odin who helped slay the primordial giant Ymir at the dawn of creation. He granted will and consciousness to the first humans, Ask and Embla.',
    gender: 'male',
    hasSpells: true,
    fixedCardIds: [4393], // Sol, the Sun Goddess
    heroPower: {
      id: 'vili-power',
      name: 'Strategic Insight',
      description: 'Look at top card; may draw it or put on bottom.',
      cost: 2,
      targetType: 'none',
      effectType: 'scry',
      value: 1
    },
    weaponUpgrade: {
      id: 90019,
      name: 'Spear of Will',
      heroId: 'hero-vili',
      manaCost: 5,
      description: 'Give all friendly minions +2 Attack this turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe',
        value: 2,
        description: 'Give all friendly minions +2 Attack this turn.'
      },
      upgradedPowerId: 'vili-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'vili-power-upgraded',
      name: 'Strategic Insight+',
      description: 'Look at top 2 cards, draw 1, put the other on bottom.',
      cost: 2,
      targetType: 'none',
      effectType: 'scry',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'vili-power'
    },
    passive: {
      id: 'vili-passive',
      name: 'Illuminated Mind',
      description: 'Playing a spell gives a random friendly minion +1 Attack.',
      trigger: 'on_spell_cast',
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 20. VE ====================
  'hero-ve': {
    id: 'hero-ve',
    name: 'Ve',
    title: 'God of Sacred Fury',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Brother of Odin who channels divine wrath to purge darkness.',
    lore: 'The third creator god who gave humanity the gift of speech and the five senses. But Ve\'s true nature was always war — a burning fury tempered by divine purpose. When dark spirits crawled from the cracks between worlds, Ve took up the blade.',
    gender: 'male',
    hasSpells: true,
    heroClass: 'berserker',
    fixedCardIds: [],
    heroPower: {
      id: 've-power',
      name: 'Sacred Strike',
      description: 'Give your hero +2 Attack this turn.',
      cost: 2,
      targetType: 'none',
      effectType: 'buff_hero',
      value: 2
    },
    weaponUpgrade: {
      id: 90020,
      name: 'Blade of the Third God',
      heroId: 'hero-ve',
      manaCost: 5,
      description: 'Give your hero +4 Attack this turn. Deal 2 damage to all enemy minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_aoe',
        value: 2,
        description: 'Give your hero +4 Attack this turn. Deal 2 damage to all enemy minions.'
      },
      upgradedPowerId: 've-power-upgraded'
    },
    upgradedHeroPower: {
      id: 've-power-upgraded',
      name: 'Sacred Strike+',
      description: 'Give your hero +3 Attack this turn.',
      cost: 2,
      targetType: 'none',
      effectType: 'buff_hero',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 've-power'
    },
    passive: {
      id: 've-passive',
      name: 'Fury of the Creator',
      description: 'After your hero attacks, gain +1 Attack permanently.',
      trigger: 'on_damage_dealt',
      effectType: 'buff_hero_attack',
      value: 1
    }
  },

  // ==================== 21. GERD ====================
  'hero-gerd': {
    id: 'hero-gerd',
    name: 'Gerd',
    title: 'Giantess of Fertile Earth',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'A beautiful giantess, wife of Frey.',
    lore: 'The beautiful giantess who won the heart of the god Freyr. Her presence brings the warmth of spring to the frozen earth, bridging the gap between gods and giants.',
    gender: 'female',
    hasSpells: true,
    fixedCardIds: [4375], // Verdant Leviathan
    heroPower: {
      id: 'gerd-power',
      name: 'Bounty of the Soil',
      description: 'Summon a 1/2 Plant with Taunt.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: {
        name: 'Plant',
        attack: 1,
        health: 2,
        keywords: ['taunt']
      }
    },
    weaponUpgrade: {
      id: 90021,
      name: 'Sickle of Growth',
      heroId: 'hero-gerd',
      manaCost: 5,
      description: 'Summon three 2/3 Plants with Taunt. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'summon_multiple',
        value: 3,
        description: 'Summon three 2/3 Plants with Taunt.'
      },
      upgradedPowerId: 'gerd-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'gerd-power-upgraded',
      name: 'Bounty of the Soil+',
      description: 'Summon a 2/3 Plant with Taunt.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: {
        name: 'Plant',
        attack: 2,
        health: 3,
        keywords: ['taunt']
      },
      isUpgraded: true,
      baseHeroPowerId: 'gerd-power'
    },
    passive: {
      id: 'gerd-passive',
      name: 'Verdant Roots',
      description: 'Grass minions have +1 Health per friendly Taunt minion.',
      trigger: 'always',
      condition: { minionElement: 'grass' },
      effectType: 'buff_health',
      value: 1 // Per Taunt minion
    }
  },

  // ==================== 22. AEGIR ====================
  'hero-aegir': {
    id: 'hero-aegir',
    name: 'Aegir',
    title: 'God of the Brewing Sea',
    element: 'water',
    weakness: 'electric',
    startingHealth: 100,
    description: 'The god of the sea who hosts feasts for the gods.',
    lore: 'The jovial sea giant whose golden hall beneath the waves hosts the legendary feasts of the gods. His nine daughters are the living waves that carry ships to glory or doom.',
    hasSpells: true,
    fixedCardIds: [4384], // Aegir, Lord of the Deep
    heroPower: {
      id: 'aegir-power',
      name: "Brewmaster's Toast",
      description: 'Give a friendly minion +2 Attack this turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90022,
      name: 'Tankard of Storms',
      heroId: 'hero-aegir',
      manaCost: 5,
      description: 'Give all friendlies +3 Attack this turn and +1 Health permanently. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe',
        value: 3,
        description: 'Give all friendlies +3 Attack this turn and +1 Health permanently.'
      },
      upgradedPowerId: 'aegir-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'aegir-power-upgraded',
      name: "Brewmaster's Toast+",
      description: 'Give a friendly minion +3 Attack this turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 3,
      duration: 'this_turn',
      isUpgraded: true,
      baseHeroPowerId: 'aegir-power'
    },
    passive: {
      id: 'aegir-passive',
      name: 'Tidal Brew',
      description: 'Water minions have +1 Health after they attack.',
      trigger: 'on_minion_attack',
      condition: { minionElement: 'water' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== NEW NORSE GODS (23-30) ====================

  // ==================== 23. HEL ====================
  'hero-hel': {
    id: 'hero-hel',
    name: 'Hel',
    title: 'Goddess of the Underworld',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'Ruler of Helheim, daughter of Loki, half-living and half-dead.',
    lore: 'Born of trickery and chaos, her body split between living flesh and rotting death. She rules the dishonored dead with cold authority, awaiting Ragnarok to lead her army of the damned.',
    hasSpells: true,
    heroClass: 'necromancer',
    fixedCardIds: [4000, 4001, 4002, 4003, 4004, 4100, 4101, 4102, 4103, 4105],
    heroPower: {
      id: 'hel-power',
      name: 'Soul Harvest',
      description: 'Take 2 damage. Summon a 2/1 Draugr with Rush.',
      cost: 2,
      targetType: 'none',
      effectType: 'self_damage_and_summon',
      value: 2,
      summonData: { name: 'Draugr', attack: 2, health: 1, keywords: ['rush'] }
    },
    weaponUpgrade: {
      id: 90023,
      name: 'Scythe of Helheim',
      heroId: 'hero-hel',
      manaCost: 5,
      description: 'Summon three 2/2 Draugr with Rush. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'summon_multiple',
        value: 3,
        description: 'Summon three 2/2 Draugr with Rush.'
      },
      upgradedPowerId: 'hel-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hel-power-upgraded',
      name: 'Soul Harvest+',
      description: 'Take 2 damage. Summon a 3/2 Draugr with Rush.',
      cost: 2,
      targetType: 'none',
      effectType: 'self_damage_and_summon',
      value: 2,
      summonData: { name: 'Draugr', attack: 3, health: 2, keywords: ['rush'] },
      isUpgraded: true,
      baseHeroPowerId: 'hel-power'
    },
    passive: {
      id: 'hel-passive',
      name: 'Queen of the Dead',
      description: 'When a friendly minion dies, restore 1 HP to your hero.',
      trigger: 'on_minion_death',
      condition: { targetType: 'friendly' },
      effectType: 'heal_hero',
      value: 1
    }
  },

  // ==================== 24. NJORD ====================
  'hero-njord': {
    id: 'hero-njord',
    name: 'Njord',
    title: 'God of Sea and Wind',
    element: 'water',
    weakness: 'electric',
    startingHealth: 100,
    description: 'Father of Frey and Freya, god of the sea, wind, and wealth.',
    lore: 'The Vanir lord of wind and wave, father to the most beloved gods. Sailors invoke his name for calm seas and fair winds, while merchants pray for his blessing of abundance.',
    hasSpells: true,
    heroClass: 'shaman',
    fixedCardIds: [5201, 5202, 5221, 5222, 5223, 5224, 5225, 5115, 5116, 5117],
    heroPower: {
      id: 'njord-power',
      name: 'Totemic Call',
      description: 'Summon a random Elemental Totem.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon_random',
      summonPool: ['healing_totem', 'searing_totem', 'stoneclaw_totem', 'wrath_of_air_totem']
    },
    weaponUpgrade: {
      id: 90024,
      name: 'Trident of the Tides',
      heroId: 'hero-njord',
      manaCost: 5,
      description: 'Summon all 4 basic Totems. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'summon_all_totems',
        description: 'Summon all 4 basic Totems.'
      },
      upgradedPowerId: 'njord-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'njord-power-upgraded',
      name: 'Totemic Call+',
      description: 'Summon a random Elemental Totem with +1/+1.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon_random',
      summonPool: ['healing_totem', 'searing_totem', 'stoneclaw_totem', 'wrath_of_air_totem'],
      bonusStats: { attack: 1, health: 1 },
      isUpgraded: true,
      baseHeroPowerId: 'njord-power'
    },
    passive: {
      id: 'njord-passive',
      name: 'Ocean\'s Blessing',
      description: 'Your Totems have +1 Health.',
      trigger: 'always',
      condition: { minionType: 'totem' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 25. BALDUR ====================
  'hero-baldur': {
    id: 'hero-baldur',
    name: 'Baldur',
    title: 'God of Light and Purity',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The most beloved god, invulnerable to all things except mistletoe.',
    lore: 'The shining god whose beauty brought joy to all creation, made invincible by his mother\'s magic. Only a humble mistletoe arrow, guided by fate, could pierce his divine protection.',
    hasSpells: true,
    heroClass: 'paladin',
    fixedCardIds: [8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010],
    heroPower: {
      id: 'baldur-power',
      name: 'Divine Protection',
      description: 'Give a friendly minion Divine Shield.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'grant_divine_shield',
      grantKeyword: 'divine_shield'
    },
    weaponUpgrade: {
      id: 90025,
      name: 'Armor of Invincibility',
      heroId: 'hero-baldur',
      manaCost: 5,
      description: 'Give all friendly minions Divine Shield. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'grant_divine_shield_all',
        description: 'Give all friendly minions Divine Shield.'
      },
      upgradedPowerId: 'baldur-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'baldur-power-upgraded',
      name: 'Divine Protection+',
      description: 'Give a friendly minion Divine Shield and +1/+1.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'grant_divine_shield',
      grantKeyword: 'divine_shield',
      secondaryValue: 1,
      isUpgraded: true,
      baseHeroPowerId: 'baldur-power'
    },
    passive: {
      id: 'baldur-passive',
      name: 'Aura of Purity',
      description: 'Light minions take 1 less damage from spells.',
      trigger: 'always',
      condition: { minionElement: 'light' },
      effectType: 'spell_damage_reduction',
      value: 1
    }
  },

  // ==================== 26. TYR ====================
  'hero-tyr': {
    id: 'hero-tyr',
    name: 'Tyr',
    title: 'God of War and Justice',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'The bravest god who sacrificed his hand to bind Fenrir.',
    lore: 'The one-handed god of war whose courage exceeds even Odin\'s wisdom. He placed his hand in Fenrir\'s jaws as a pledge of honor, sacrificing his sword arm to save the Nine Realms.',
    hasSpells: true,
    heroClass: 'warrior',
    fixedCardIds: [5001, 5009, 5012, 5013, 5014, 5015, 5016, 5017, 5018, 5019],
    heroPower: {
      id: 'tyr-power',
      name: 'One-Handed Strike',
      description: 'Deal 3 damage to a minion.',
      cost: 2,
      targetType: 'any_minion',
      effectType: 'damage_single',
      value: 3
    },
    weaponUpgrade: {
      id: 90026,
      name: 'Blade of Justice',
      heroId: 'hero-tyr',
      manaCost: 5,
      description: 'Deal 3 damage to all enemy minions. Gain 5 Armor. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_aoe_and_armor',
        value: 3,
        armorValue: 5,
        description: 'Deal 3 damage to all enemy minions and gain 5 Armor.'
      },
      upgradedPowerId: 'tyr-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'tyr-power-upgraded',
      name: 'One-Handed Strike+',
      description: 'Deal 4 damage to a minion. Gain 1 Armor.',
      cost: 2,
      targetType: 'any_minion',
      effectType: 'damage_single',
      value: 4,
      secondaryValue: 1,
      isUpgraded: true,
      baseHeroPowerId: 'tyr-power'
    },
    passive: {
      id: 'tyr-passive',
      name: 'Warrior\'s Resolve',
      description: 'After your hero takes damage, gain +1 Attack this turn.',
      trigger: 'on_hero_damage',
      effectType: 'buff_hero_attack',
      value: 1
    }
  },

  // ==================== 27. VIDAR ====================
  'hero-vidar': {
    id: 'hero-vidar',
    name: 'Vidar',
    title: 'God of Vengeance',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'The silent god who avenges his father Odin by tearing Fenrir\'s jaw apart with his bare hands and his iron shoe.',
    lore: 'Víðarr speaks no word until the moment he drives his thick-soled shoe into Fenrir\'s lower jaw and rips the wolf apart. His silence is not weakness — it is patience forged across an age of waiting. (Völuspá 54, Gylfaginning 51)',
    gender: 'male',
    hasSpells: true,
    heroClass: 'rogue',
    fixedCardIds: [12101, 12102, 12103, 12104, 12105, 12106, 12107, 12108, 12109, 12110],
    heroPower: {
      id: 'vidar-power',
      name: 'Silent Strike',
      description: 'Equip a 1/2 Dagger.',
      cost: 2,
      targetType: 'none',
      effectType: 'equip_weapon',
      weaponData: { name: 'Víðarr\'s Blade', attack: 1, durability: 2 }
    },
    weaponUpgrade: {
      id: 90027,
      name: 'Vengeance Blade',
      heroId: 'hero-vidar',
      manaCost: 5,
      description: 'Equip a 3/3 weapon. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'equip_weapon',
        weaponData: { attack: 3, durability: 3 },
        description: 'Equip a 3/3 weapon.'
      },
      upgradedPowerId: 'vidar-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'vidar-power-upgraded',
      name: 'Avenger\'s Strike',
      description: 'Equip a 2/2 Dagger.',
      cost: 2,
      targetType: 'none',
      effectType: 'equip_weapon',
      weaponData: { name: 'Víðarr\'s Blade', attack: 2, durability: 2 },
      isUpgraded: true,
      baseHeroPowerId: 'vidar-power'
    },
    passive: {
      id: 'vidar-passive',
      name: 'Patient Vengeance',
      description: 'Your weapon has +1 Attack while you have a minion with Stealth.',
      trigger: 'always',
      condition: { hasStealth: true },
      effectType: 'buff_weapon_attack',
      value: 1
    }
  },

  // ==================== 28. HOENIR ====================
  'hero-hoenir': {
    id: 'hero-hoenir',
    name: 'Hoenir',
    title: 'God of Silence',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The mysterious god who gave humans understanding and spirit.',
    lore: 'The silent one who granted the first humans the gift of thought and understanding. His wisdom runs so deep that words cannot contain it, making his silence more profound than any speech.',
    hasSpells: true,
    heroClass: 'priest',
    fixedCardIds: [9013, 9014, 9016, 9017, 9019, 9021, 9022, 6003, 6004, 6005],
    heroPower: {
      id: 'hoenir-power',
      name: 'Silencing Touch',
      description: 'Silence a minion.',
      cost: 2,
      targetType: 'any_minion',
      effectType: 'silence'
    },
    weaponUpgrade: {
      id: 90028,
      name: 'Staff of Quietude',
      heroId: 'hero-hoenir',
      manaCost: 5,
      description: 'Silence all enemy minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'silence_all_enemies',
        description: 'Silence all enemy minions.'
      },
      upgradedPowerId: 'hoenir-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hoenir-power-upgraded',
      name: 'Silencing Touch+',
      description: 'Silence a minion and deal 1 damage to it.',
      cost: 2,
      targetType: 'any_minion',
      effectType: 'silence',
      value: 1,
      isUpgraded: true,
      baseHeroPowerId: 'hoenir-power'
    },
    passive: {
      id: 'hoenir-passive',
      name: 'Veil of Mystery',
      description: 'Silenced enemy minions have -1 Attack.',
      trigger: 'always',
      condition: { targetSilenced: true },
      effectType: 'debuff_attack',
      value: 1
    }
  },

  // ==================== 29. ULLR ====================
  'hero-ullr': {
    id: 'hero-ullr',
    name: 'Ullr',
    title: 'God of the Hunt',
    element: 'ice',
    weakness: 'fire',
    startingHealth: 100,
    description: 'Master archer and skier, god of winter hunting.',
    lore: 'The peerless hunter whose arrows never miss their mark across the frozen wastes. On skis carved from ancient ice, he glides through blizzards with deadly grace.',
    hasSpells: true,
    heroClass: 'hunter',
    fixedCardIds: [7001, 7002, 7003, 7005, 7010, 7011, 7012, 7013, 7014, 7015],
    heroPower: {
      id: 'ullr-power',
      name: 'Aimed Shot',
      description: 'Deal 2 damage to the enemy hero.',
      cost: 2,
      targetType: 'enemy_hero',
      effectType: 'damage_hero',
      value: 2
    },
    weaponUpgrade: {
      id: 90029,
      name: 'Bow of the Hunt',
      heroId: 'hero-ullr',
      manaCost: 5,
      description: 'Deal 3 damage to the enemy hero and all their minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_all_enemies',
        value: 3,
        description: 'Deal 3 damage to the enemy hero and all their minions.'
      },
      upgradedPowerId: 'ullr-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'ullr-power-upgraded',
      name: 'Aimed Shot+',
      description: 'Deal 3 damage to the enemy hero.',
      cost: 2,
      targetType: 'enemy_hero',
      effectType: 'damage_hero',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'ullr-power'
    },
    passive: {
      id: 'ullr-passive',
      name: 'Hunter\'s Mark',
      description: 'Your Beasts have +1 Attack.',
      trigger: 'always',
      condition: { minionRace: 'beast' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 30. SIGYN ====================
  'hero-sigyn': {
    id: 'hero-sigyn',
    name: 'Sigyn',
    title: 'Goddess of Loyalty',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'Devoted wife of Loki who shields him from the serpent\'s venom.',
    lore: 'The embodiment of devotion who holds a bowl over her bound husband to catch the serpent\'s burning venom. When she turns to empty it, his thrashing causes earthquakes across Midgard.',
    hasSpells: true,
    heroClass: 'druid',
    fixedCardIds: [11003, 11015, 11016, 11020, 11040, 11041, 11042, 11043, 11044, 11050],
    heroPower: {
      id: 'sigyn-power',
      name: 'Shapeshift',
      description: 'Gain 1 Attack this turn and 1 Armor.',
      cost: 2,
      targetType: 'none',
      effectType: 'buff_hero',
      value: 1,
      armorValue: 1
    },
    weaponUpgrade: {
      id: 90030,
      name: 'Bowl of Protection',
      heroId: 'hero-sigyn',
      manaCost: 5,
      description: 'Gain 10 Armor. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'gain_armor',
        value: 10,
        description: 'Gain 10 Armor.'
      },
      upgradedPowerId: 'sigyn-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'sigyn-power-upgraded',
      name: 'Shapeshift+',
      description: 'Gain 2 Attack this turn and 2 Armor.',
      cost: 2,
      targetType: 'none',
      effectType: 'buff_hero',
      value: 2,
      armorValue: 2,
      isUpgraded: true,
      baseHeroPowerId: 'sigyn-power'
    },
    passive: {
      id: 'sigyn-passive',
      name: 'Protective Shield',
      description: 'At the end of your turn, if you have Armor, gain +1 Armor.',
      trigger: 'end_of_turn',
      condition: { hasArmor: true },
      effectType: 'gain_armor',
      value: 1
    }
  },

  // ==================== GREEK GODS (31-42) ====================

  // ==================== 31. ZEUS ====================
  'hero-zeus': {
    id: 'hero-zeus',
    name: 'Zeus',
    title: 'King of the Gods',
    element: 'electric',
    weakness: 'light',
    startingHealth: 100,
    description: 'Supreme ruler of Mount Olympus, master of thunder and lightning.',
    lore: 'The almighty king who overthrew the Titans and claimed dominion over sky and storm. His thunderbolts split mountains, and his judgment shapes the fates of gods and mortals alike.',
    hasSpells: true,
    heroClass: 'mage',
    fixedCardIds: [14001, 14002, 14003, 14004, 14005, 14006, 14009, 14010, 14012, 14013],
    heroPower: {
      id: 'zeus-power',
      name: 'Chain Lightning',
      description: 'Deal 2 damage to a minion, then 1 damage to adjacent minions.',
      cost: 2,
      targetType: 'any_minion',
      effectType: 'chain_damage',
      value: 2,
      secondaryValue: 1
    },
    weaponUpgrade: {
      id: 90031,
      name: 'Master Bolt',
      heroId: 'hero-zeus',
      manaCost: 5,
      description: 'Deal 6 damage to an enemy. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_single',
        value: 6,
        description: 'Deal 6 damage to an enemy.'
      },
      upgradedPowerId: 'zeus-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'zeus-power-upgraded',
      name: 'Chain Lightning+',
      description: 'Deal 3 damage to a minion, then 2 damage to adjacent minions.',
      cost: 2,
      targetType: 'any_minion',
      effectType: 'chain_damage',
      value: 3,
      secondaryValue: 2,
      isUpgraded: true,
      baseHeroPowerId: 'zeus-power'
    },
    passive: {
      id: 'zeus-passive',
      name: 'Thunder God',
      description: 'Your spells deal +1 damage.',
      trigger: 'always',
      effectType: 'spell_damage_bonus',
      value: 1
    }
  },

  // ==================== 32. POSEIDON ====================
  'hero-poseidon': {
    id: 'hero-poseidon',
    name: 'Poseidon',
    title: 'God of the Sea',
    element: 'water',
    weakness: 'electric',
    startingHealth: 100,
    description: 'Lord of the oceans, earthquakes, and horses.',
    lore: 'The earth-shaker whose trident commands every wave and tremor. When his wrath rises, entire civilizations sink beneath the churning seas.',
    hasSpells: true,
    heroClass: 'shaman',
    fixedCardIds: [5251, 5252, 5201, 5202, 5221, 5222, 5223, 5224, 5225, 5115, 95081], // Shaman cards + Hippocampus, Steed of the Depths
    heroPower: {
      id: 'poseidon-power',
      name: 'Tidal Wave',
      description: 'Freeze an enemy minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'freeze'
    },
    weaponUpgrade: {
      id: 90032,
      name: 'Trident of the Seas',
      heroId: 'hero-poseidon',
      manaCost: 5,
      description: 'Freeze all enemy minions and deal 2 damage to them. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'freeze_and_damage_all',
        value: 2,
        description: 'Freeze all enemy minions and deal 2 damage to them.'
      },
      upgradedPowerId: 'poseidon-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'poseidon-power-upgraded',
      name: 'Tidal Wave+',
      description: 'Freeze an enemy minion and deal 1 damage to it.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'freeze',
      value: 1,
      isUpgraded: true,
      baseHeroPowerId: 'poseidon-power'
    },
    passive: {
      id: 'poseidon-passive',
      name: 'Ocean\'s Wrath',
      description: 'Frozen enemies take +1 damage from all sources.',
      trigger: 'always',
      condition: { targetFrozen: true },
      effectType: 'damage_amplify',
      value: 1
    }
  },

  // ==================== 33. HADES ====================
  'hero-hades': {
    id: 'hero-hades',
    name: 'Hades',
    title: 'God of the Underworld',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'Ruler of the dead, guardian of the underworld\'s treasures.',
    lore: 'The unseen lord who drew the underworld as his domain when Olympus was divided. His helm of darkness makes him invisible to all, and none escape his kingdom of shadows.',
    hasSpells: true,
    heroClass: 'warlock',
    fixedCardIds: [17001, 17002, 17003, 17004, 17005, 17006, 17007, 17008, 17009, 17010],
    heroPower: {
      id: 'hades-power',
      name: 'Life Tap',
      description: 'Draw a card. Take 2 damage.',
      cost: 2,
      targetType: 'none',
      effectType: 'draw_and_damage',
      value: 1,
      selfDamage: 2
    },
    weaponUpgrade: {
      id: 90033,
      name: 'Helm of Darkness',
      heroId: 'hero-hades',
      manaCost: 5,
      description: 'Draw 3 cards. Your hero is Immune this turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'draw_and_immune',
        value: 3,
        description: 'Draw 3 cards. Your hero is Immune this turn.'
      },
      upgradedPowerId: 'hades-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hades-power-upgraded',
      name: 'Life Tap+',
      description: 'Draw a card. Take 1 damage.',
      cost: 2,
      targetType: 'none',
      effectType: 'draw_and_damage',
      value: 1,
      selfDamage: 1,
      isUpgraded: true,
      baseHeroPowerId: 'hades-power'
    },
    passive: {
      id: 'hades-passive',
      name: 'Lord of Souls',
      description: 'When an enemy minion dies, gain 1 HP.',
      trigger: 'on_enemy_minion_death',
      effectType: 'heal_hero',
      value: 1
    }
  },

  // ==================== 34. APOLLO ====================
  'hero-apollo': {
    id: 'hero-apollo',
    name: 'Apollo',
    title: 'God of the Sun',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'God of light, music, poetry, and archery.',
    lore: 'The radiant archer whose golden chariot brings dawn to the mortal realm. His arrows carry plagues or healing at his whim, and his lyre\'s melody moves the very cosmos.',
    hasSpells: true,
    heroClass: 'hunter',
    fixedCardIds: [7016, 7017, 7018, 7019, 7020, 7021, 7022, 7023, 7100, 7101],
    heroPower: {
      id: 'apollo-power',
      name: 'Solar Arrow',
      description: 'Deal 2 damage to a random enemy.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 2
    },
    weaponUpgrade: {
      id: 90034,
      name: 'Golden Bow',
      heroId: 'hero-apollo',
      manaCost: 5,
      description: 'Deal 4 damage to two random enemies. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_random_multiple',
        value: 4,
        count: 2,
        description: 'Deal 4 damage to two random enemies.'
      },
      upgradedPowerId: 'apollo-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'apollo-power-upgraded',
      name: 'Solar Arrow+',
      description: 'Deal 3 damage to a random enemy.',
      cost: 2,
      targetType: 'random_enemy',
      effectType: 'damage_random',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'apollo-power'
    },
    passive: {
      id: 'apollo-passive',
      name: 'Radiant Light',
      description: 'Fire minions deal +1 damage when attacking.',
      trigger: 'on_minion_attack',
      condition: { minionElement: 'fire' },
      effectType: 'damage_bonus',
      value: 1
    }
  },

  // ==================== 35. ARES ====================
  'hero-ares': {
    id: 'hero-ares',
    name: 'Ares',
    title: 'God of War',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'The brutal and violent god of war.',
    lore: 'The blood-soaked god who revels in the chaos of battle without honor or restraint. Where Athena represents strategic warfare, Ares embodies pure, savage carnage.',
    hasSpells: true,
    heroClass: 'warrior',
    fixedCardIds: [5020, 5021, 5022, 5023, 5024, 5001, 5009, 5012, 5013, 5014],
    heroPower: {
      id: 'ares-power',
      name: 'War Cry',
      description: 'Give a friendly minion Rush and +1 Attack.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1,
      grantKeyword: 'rush'
    },
    weaponUpgrade: {
      id: 90035,
      name: 'Spear of War',
      heroId: 'hero-ares',
      manaCost: 5,
      description: 'Give all friendly minions Rush and +2 Attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe_with_rush',
        value: 2,
        description: 'Give all friendly minions Rush and +2 Attack.'
      },
      upgradedPowerId: 'ares-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'ares-power-upgraded',
      name: 'War Cry+',
      description: 'Give a friendly minion Rush and +2 Attack.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      grantKeyword: 'rush',
      isUpgraded: true,
      baseHeroPowerId: 'ares-power'
    },
    passive: {
      id: 'ares-passive',
      name: 'Berserker Fury',
      description: 'Minions with Rush have +1 Health.',
      trigger: 'always',
      condition: { hasKeyword: 'rush' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 36. HERMES ====================
  'hero-hermes': {
    id: 'hero-hermes',
    name: 'Hermes',
    title: 'Messenger of the Gods',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Swift messenger god, patron of thieves and travelers.',
    lore: 'The swift-footed trickster who flies between worlds on winged sandals. He guides souls to the underworld and steals from gods themselves with unmatched cunning.',
    hasSpells: true,
    heroClass: 'rogue',
    fixedCardIds: [12201, 12202, 12203, 12204, 12404, 12101, 12102, 12103, 12104, 12105],
    heroPower: {
      id: 'hermes-power',
      name: 'Swift Fingers',
      description: 'Add a random card from your opponent\'s class to your hand.',
      cost: 2,
      targetType: 'none',
      effectType: 'generate_enemy_class_card'
    },
    weaponUpgrade: {
      id: 90036,
      name: 'Winged Sandals',
      heroId: 'hero-hermes',
      manaCost: 5,
      description: 'Draw 2 cards. All cards cost (1) less this turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'draw_and_discount',
        value: 2,
        discount: 1,
        description: 'Draw 2 cards. All cards cost (1) less this turn.'
      },
      upgradedPowerId: 'hermes-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hermes-power-upgraded',
      name: 'Swift Fingers+',
      description: 'Add 2 random cards from your opponent\'s class to your hand.',
      cost: 2,
      targetType: 'none',
      effectType: 'generate_enemy_class_card',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'hermes-power'
    },
    passive: {
      id: 'hermes-passive',
      name: 'Fleet Footed',
      description: 'Cards from another class cost (1) less.',
      trigger: 'always',
      condition: { cardFromAnotherClass: true },
      effectType: 'cost_reduction',
      value: 1
    }
  },

  // ==================== 37. ATHENA ====================
  'hero-athena': {
    id: 'hero-athena',
    name: 'Athena',
    title: 'Goddess of Wisdom',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Goddess of wisdom, warfare strategy, and crafts.',
    lore: 'Born fully armored from Zeus\'s skull, she is the patron of heroes and master of strategy. Her aegis shield bears Medusa\'s head, turning enemies to stone with a glance.',
    hasSpells: true,
    heroClass: 'mage',
    fixedCardIds: [31002, 31004, 32001, 32002, 32003, 14001, 14002, 14003, 14004, 14005],
    heroPower: {
      id: 'athena-power',
      name: 'Strategic Insight',
      description: 'Foresee a spell.',
      cost: 2,
      targetType: 'none',
      effectType: 'discover',
      discoverType: 'spell'
    },
    weaponUpgrade: {
      id: 90037,
      name: 'Aegis Shield',
      heroId: 'hero-athena',
      manaCost: 5,
      description: 'Foresee a spell. It costs (0) this turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'discover_free',
        discoverType: 'spell',
        description: 'Foresee a spell. It costs (0) this turn.'
      },
      upgradedPowerId: 'athena-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'athena-power-upgraded',
      name: 'Strategic Insight+',
      description: 'Foresee a spell. It costs (1) less.',
      cost: 2,
      targetType: 'none',
      effectType: 'discover',
      discoverType: 'spell',
      costReduction: 1,
      isUpgraded: true,
      baseHeroPowerId: 'athena-power'
    },
    passive: {
      id: 'athena-passive',
      name: 'Tactical Brilliance',
      description: 'After you cast a spell, your next spell costs (1) less.',
      trigger: 'after_spell_cast',
      effectType: 'cost_reduction',
      value: 1
    }
  },

  // ==================== 38. APHRODITE ====================
  'hero-aphrodite': {
    id: 'hero-aphrodite',
    name: 'Aphrodite',
    title: 'Goddess of Love',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'Goddess of love, beauty, and desire.',
    lore: 'Born from sea foam, her beauty surpasses all mortal and divine imagination. Wars have been fought for her favor, and her enchanted girdle makes any wearer irresistibly alluring.',
    hasSpells: true,
    heroClass: 'priest',
    fixedCardIds: [5112, 5113, 5114, 70001, 6006, 9013, 9014, 9016, 9017, 9019],
    heroPower: {
      id: 'aphrodite-power',
      name: 'Healing Touch',
      description: 'Restore 3 Health to any character.',
      cost: 2,
      targetType: 'any_character',
      effectType: 'heal',
      value: 3
    },
    weaponUpgrade: {
      id: 90038,
      name: 'Girdle of Enchantment',
      heroId: 'hero-aphrodite',
      manaCost: 5,
      description: 'Take control of an enemy minion with 3 or less Attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'mind_control',
        condition: 'attack_less_than_4',
        description: 'Take control of an enemy minion with 3 or less Attack.'
      },
      upgradedPowerId: 'aphrodite-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'aphrodite-power-upgraded',
      name: 'Healing Touch+',
      description: 'Restore 4 Health to any character.',
      cost: 2,
      targetType: 'any_character',
      effectType: 'heal',
      value: 4,
      isUpgraded: true,
      baseHeroPowerId: 'aphrodite-power'
    },
    passive: {
      id: 'aphrodite-passive',
      name: 'Aura of Love',
      description: 'Whenever you restore Health, give a random friendly minion +1 Health.',
      trigger: 'on_heal',
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 39. HEPHAESTUS ====================
  'hero-hephaestus': {
    id: 'hero-hephaestus',
    name: 'Hephaestus',
    title: 'God of the Forge',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'Master blacksmith who crafted weapons for the gods.',
    lore: 'The lame god whose forge burns at the heart of volcanoes, crafting divine wonders. Every legendary weapon on Olympus—Zeus\'s thunderbolts, Achilles\' armor—came from his anvil.',
    hasSpells: true,
    heroClass: 'warrior',
    fixedCardIds: [5015, 5016, 5017, 5018, 5019, 5020, 5021, 5022, 5023, 5024],
    heroPower: {
      id: 'hephaestus-power',
      name: 'Forge Weapon',
      description: 'Equip a random 2-cost weapon.',
      cost: 2,
      targetType: 'none',
      effectType: 'equip_random_weapon',
      weaponCost: 2
    },
    weaponUpgrade: {
      id: 90039,
      name: 'Hammer of Creation',
      heroId: 'hero-hephaestus',
      manaCost: 5,
      description: 'Equip a 4/3 weapon with Windfury. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'equip_weapon',
        weaponData: { attack: 4, durability: 3, keywords: ['windfury'] },
        description: 'Equip a 4/3 weapon with Windfury.'
      },
      upgradedPowerId: 'hephaestus-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hephaestus-power-upgraded',
      name: 'Forge Weapon+',
      description: 'Equip a random 3-cost weapon.',
      cost: 2,
      targetType: 'none',
      effectType: 'equip_random_weapon',
      weaponCost: 3,
      isUpgraded: true,
      baseHeroPowerId: 'hephaestus-power'
    },
    passive: {
      id: 'hephaestus-passive',
      name: 'Master Craftsman',
      description: 'Your weapons have +1 Durability.',
      trigger: 'always',
      effectType: 'buff_weapon_durability',
      value: 1
    }
  },

  // ==================== 40. DIONYSUS ====================
  'hero-dionysus': {
    id: 'hero-dionysus',
    name: 'Dionysus',
    title: 'God of Wine',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'God of wine, festivity, and ritual madness.',
    lore: 'The twice-born god who conquered death itself and spread ecstatic madness across the world. His revels blur the line between mortal joy and divine frenzy.',
    hasSpells: true,
    heroClass: 'warlock',
    fixedCardIds: [17101, 17102, 17103, 17104, 17105, 17001, 17002, 17003, 17004, 17005],
    heroPower: {
      id: 'dionysus-power',
      name: 'Drunken Madness',
      description: 'Deal 1 damage to all characters.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_all',
      value: 1
    },
    weaponUpgrade: {
      id: 90040,
      name: 'Thyrsus Staff',
      heroId: 'hero-dionysus',
      manaCost: 5,
      description: 'Deal 3 damage to all characters. Summon a 3/3 Satyr. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_all_and_summon',
        value: 3,
        description: 'Deal 3 damage to all characters. Summon a 3/3 Satyr.'
      },
      upgradedPowerId: 'dionysus-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'dionysus-power-upgraded',
      name: 'Drunken Madness+',
      description: 'Deal 2 damage to all enemies and 1 to your hero.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_all',
      value: 2,
      selfDamage: 1,
      isUpgraded: true,
      baseHeroPowerId: 'dionysus-power'
    },
    passive: {
      id: 'dionysus-passive',
      name: 'Chaotic Revelry',
      description: 'Whenever ALL characters take damage, draw a card.',
      trigger: 'on_aoe_damage',
      effectType: 'draw',
      value: 1
    }
  },

  // ==================== 41. ARTEMIS ====================
  'hero-artemis': {
    id: 'hero-artemis',
    name: 'Artemis',
    title: 'Goddess of the Hunt',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'Virgin goddess of the hunt, wilderness, and the moon.',
    lore: 'The eternal huntress who roams the wild places under silver moonlight with her sacred deer. She protects maidens and punishes those who defile her sacred groves with merciless fury.',
    hasSpells: true,
    heroClass: 'hunter',
    fixedCardIds: [7102, 7103, 7104, 7105, 7106, 7107, 7108, 7109, 7110, 7200, 95079], // Hunter spells + The Ceryneian Hind
    heroPower: {
      id: 'artemis-power',
      name: 'Silver Arrow',
      description: 'Deal 1 damage to the enemy hero. Give all friendly pets +1 Attack this turn.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_hero_and_buff_pets',
      value: 1,
      secondaryValue: 1
    },
    weaponUpgrade: {
      id: 90041,
      name: 'Bow of the Moon',
      heroId: 'hero-artemis',
      manaCost: 5,
      description: 'Deal 3 damage to the enemy hero. Give all friendly pets +2 Attack permanently. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_hero_and_buff_pets',
        value: 3,
        description: 'Deal 3 damage to the enemy hero. Give all friendly pets +2 Attack permanently.'
      },
      upgradedPowerId: 'artemis-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'artemis-power-upgraded',
      name: 'Silver Arrow+',
      description: 'Deal 2 damage to the enemy hero. Give all friendly pets +1 Attack this turn.',
      cost: 2,
      targetType: 'none',
      effectType: 'damage_hero_and_buff_pets',
      value: 2,
      secondaryValue: 1,
      isUpgraded: true,
      baseHeroPowerId: 'artemis-power'
    },
    passive: {
      id: 'artemis-passive',
      name: 'Mistress of Beasts',
      description: 'Your pets have +1 Attack.',
      trigger: 'always',
      condition: { minionIsPet: true },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 42. DEMETER ====================
  'hero-demeter': {
    id: 'hero-demeter',
    name: 'Demeter',
    title: 'Goddess of the Harvest',
    element: 'grass',
    weakness: 'electric',
    startingHealth: 100,
    description: 'Goddess of agriculture, harvest, and fertility of the earth.',
    lore: 'The mother of seasons whose grief turns the world to winter when her daughter descends to Hades. Her blessing brings abundance; her curse brings famine to all the lands.',
    hasSpells: true,
    heroClass: 'druid',
    fixedCardIds: [11052, 11058, 11059, 85002, 33001, 11003, 11015, 11016, 11020, 11040],
    heroPower: {
      id: 'demeter-power',
      name: 'Bountiful Growth',
      description: 'Summon a 1/1 Sapling with "Deathrattle: Draw a card."',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: { 
        name: 'Sapling', 
        attack: 1, 
        health: 1, 
        deathrattle: { type: 'draw', value: 1 } 
      }
    },
    weaponUpgrade: {
      id: 90042,
      name: 'Cornucopia',
      heroId: 'hero-demeter',
      manaCost: 5,
      description: 'Summon a 5/5 Treant. Draw 2 cards. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'summon_and_draw',
        summonData: { name: 'Treant', attack: 5, health: 5 },
        drawValue: 2,
        description: 'Summon a 5/5 Treant. Draw 2 cards.'
      },
      upgradedPowerId: 'demeter-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'demeter-power-upgraded',
      name: 'Bountiful Growth+',
      description: 'Summon a 2/2 Sapling with "Deathrattle: Draw a card."',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: { 
        name: 'Sapling', 
        attack: 2, 
        health: 2, 
        deathrattle: { type: 'draw', value: 1 } 
      },
      isUpgraded: true,
      baseHeroPowerId: 'demeter-power'
    },
    passive: {
      id: 'demeter-passive',
      name: 'Fertile Soil',
      description: 'Grass minions have +1/+1.',
      trigger: 'always',
      condition: { minionElement: 'grass' },
      effectType: 'buff_stats',
      value: 1
    }
  },

  // ==================== 43. HYPERION ====================
  'hero-hyperion': {
    id: 'hero-hyperion',
    name: 'Hyperion',
    title: 'Titan of Light',
    element: 'light',
    weakness: 'water',
    startingHealth: 100,
    description: 'The Titan of heavenly light, father of the sun, moon, and dawn.',
    lore: 'The primordial Titan whose radiance illuminated the cosmos before the Olympians rose. His children—Helios, Selene, and Eos—carry his light across the sky for eternity.',
    hasSpells: true,
    heroClass: 'mage',
    fixedCardIds: [4400, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'hyperion-power',
      name: 'Solar Flare',
      description: 'Deal 2 damage to an enemy minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2
    },
    weaponUpgrade: {
      id: 90043,
      name: 'Celestial Lance',
      heroId: 'hero-hyperion',
      manaCost: 5,
      description: 'Deal 4 damage to an enemy, 2 to adjacent minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'chain_damage',
        value: 4,
        description: 'Deal 4 damage to an enemy, 2 to adjacent minions.'
      },
      upgradedPowerId: 'hyperion-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hyperion-power-upgraded',
      name: 'Solar Flare+',
      description: 'Deal 3 damage to an enemy minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'hyperion-power'
    },
    passive: {
      id: 'hyperion-passive',
      name: "Daylight's Brilliance",
      description: 'Light minions have +1 attack during your turn.',
      trigger: 'start_of_turn',
      condition: { minionElement: 'light' },
      effectType: 'buff_attack',
      value: 1
    }
  },

  // ==================== 44. HERA ====================
  'hero-hera': {
    id: 'hero-hera',
    name: 'Hera',
    title: 'Queen of the Gods',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Queen of the Olympian gods and goddess of marriage and family.',
    lore: 'The jealous queen whose wrath falls upon Zeus\'s lovers and their offspring without mercy. Her sacred peacock feathers bear the hundred eyes of her slain servant Argus.',
    hasSpells: true,
    heroClass: 'priest',
    fixedCardIds: [4401, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'hera-power',
      name: "Queen's Command",
      description: 'Give a friendly minion +1 attack this turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1,
      duration: 'this_turn'
    },
    weaponUpgrade: {
      id: 90044,
      name: 'Starlight Scepter',
      heroId: 'hero-hera',
      manaCost: 5,
      description: 'Deal 3 damage, give all friendly minions +1 attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'damage_single',
        value: 3,
        description: 'Deal 3 damage, give all friendly minions +1 attack.'
      },
      upgradedPowerId: 'hera-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hera-power-upgraded',
      name: "Queen's Command+",
      description: 'Give a friendly minion +2 attack this turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      duration: 'this_turn',
      isUpgraded: true,
      baseHeroPowerId: 'hera-power'
    },
    passive: {
      id: 'hera-passive',
      name: 'Divine Curse',
      description: 'Enemy minions played have -1 attack.',
      trigger: 'on_minion_play',
      condition: { targetType: 'enemy' },
      effectType: 'debuff_attack',
      value: 1
    }
  },

  // ==================== 45. BLAINN ====================
  'hero-blainn': {
    id: 'hero-blainn',
    name: 'Blainn',
    title: 'The Dark Craftsman',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'A primordial dwarf associated with darkness and the forging of fate.',
    lore: 'Blainn shaped the first shadows into solid form, hammering darkness on an anvil of silence. Where other dwarves forged metal, he forged absence — voids that walk, hollows that guard, and darkness that endures.',
    hasSpells: true,
    heroClass: 'druid',
    fixedCardIds: [4402, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'blainn-power',
      name: "Shadow Craft",
      description: 'Summon a 1/2 Shade with Taunt.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: {
        name: 'Shade',
        attack: 1,
        health: 2,
        keywords: ['taunt']
      }
    },
    weaponUpgrade: {
      id: 90045,
      name: "Anvil of Silence",
      heroId: 'hero-blainn',
      manaCost: 5,
      description: 'Summon three 2/3 Shades with Taunt. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'summon_multiple',
        value: 3,
        summonData: { name: 'Shade', attack: 2, health: 3, keywords: ['taunt'] },
        description: 'Summon three 2/3 Shades with Taunt.'
      },
      upgradedPowerId: 'blainn-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'blainn-power-upgraded',
      name: "Shadow Craft+",
      description: 'Summon a 2/3 Shade with Taunt.',
      cost: 2,
      targetType: 'none',
      effectType: 'summon',
      summonData: {
        name: 'Shade',
        attack: 2,
        health: 3,
        keywords: ['taunt']
      },
      isUpgraded: true,
      baseHeroPowerId: 'blainn-power'
    },
    passive: {
      id: 'blainn-passive',
      name: 'Forgemaster of Shadows',
      description: 'Dark minions have +1 health.',
      trigger: 'always',
      condition: { minionElement: 'dark' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 48. EROS ====================
  'hero-eros': {
    id: 'hero-eros',
    name: 'Eros',
    title: 'The Procreator',
    element: 'grass',
    weakness: 'fire',
    startingHealth: 100,
    description: 'The primordial god of love and procreation.',
    lore: 'The primordial force that sparked creation itself, older than most gods. His golden arrows inspire undying love, while his leaden ones breed hatred and revulsion.',
    hasSpells: true,
    heroClass: 'priest',
    fixedCardIds: [4405, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'eros-power',
      name: 'Arrow of Desire',
      description: 'Give a friendly minion +1 attack and restore 2 health.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1,
      secondaryValue: 2
    },
    weaponUpgrade: {
      id: 90048,
      name: 'Bow of Creation',
      heroId: 'hero-eros',
      manaCost: 5,
      description: 'Give all friendly minions +2 attack and restore 4 health to each. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe',
        value: 2,
        description: 'Give all friendly minions +2 attack and restore 4 health to each.'
      },
      upgradedPowerId: 'eros-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'eros-power-upgraded',
      name: 'Arrow of Desire+',
      description: 'Give a friendly minion +2 attack and restore 3 health.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      secondaryValue: 3,
      isUpgraded: true,
      baseHeroPowerId: 'eros-power'
    },
    passive: {
      id: 'eros-passive',
      name: "Love's Spark",
      description: 'When a friendly minion is healed, give it +1 health.',
      trigger: 'on_heal',
      condition: { targetType: 'friendly' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 49. NYX ====================
  'hero-nyx': {
    id: 'hero-nyx',
    name: 'Nyx',
    title: 'Goddess of the Night',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'The primordial goddess of the night, feared even by Zeus.',
    lore: 'The ancient darkness that existed before light, mother of Sleep and Death. Even Zeus dares not cross her, for her power predates the Olympians themselves.',
    hasSpells: true,
    heroClass: 'rogue',
    fixedCardIds: [4406, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'nyx-power',
      name: 'Veil of Shadows',
      description: 'Give a friendly minion Stealth until next turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'stealth',
      duration: 'next_turn'
    },
    weaponUpgrade: {
      id: 90049,
      name: 'Cloak of Midnight',
      heroId: 'hero-nyx',
      manaCost: 5,
      description: 'Give all friendly minions Stealth and +1 attack. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe',
        value: 1,
        description: 'Give all friendly minions Stealth and +1 attack.'
      },
      upgradedPowerId: 'nyx-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'nyx-power-upgraded',
      name: 'Veil of Shadows+',
      description: 'Give a friendly minion Stealth and +1 attack until next turn.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'stealth',
      value: 1,
      duration: 'next_turn',
      isUpgraded: true,
      baseHeroPowerId: 'nyx-power'
    },
    passive: {
      id: 'nyx-passive',
      name: "Night's Embrace",
      description: 'Dark minions deal +1 damage while Stealthed.',
      trigger: 'always',
      condition: { minionElement: 'dark', requiresStealth: true },
      effectType: 'buff_damage',
      value: 1
    }
  },

  // ==================== 50. CHRONOS ====================
  'hero-chronos': {
    id: 'hero-chronos',
    name: 'Chronos',
    title: 'The Timekeeper',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'The primordial god of time, master of all moments.',
    lore: 'The serpentine deity who coils around the cosmos, devouring and regenerating all of existence. Past, present, and future flow through his infinite scales.',
    hasSpells: true,
    heroClass: 'mage',
    fixedCardIds: [4407, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'chronos-power',
      name: 'Temporal Shift',
      description: 'Freeze an enemy minion until next turn.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'freeze',
      duration: 'next_turn'
    },
    weaponUpgrade: {
      id: 90050,
      name: 'Hourglass of Ages',
      heroId: 'hero-chronos',
      manaCost: 5,
      description: 'Freeze all enemies and deal 2 damage to them. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'freeze_and_damage_all',
        value: 2,
        description: 'Freeze all enemies and deal 2 damage to them.'
      },
      upgradedPowerId: 'chronos-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'chronos-power-upgraded',
      name: 'Temporal Shift+',
      description: 'Freeze an enemy minion and deal 1 damage to it.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'freeze',
      value: 1,
      duration: 'next_turn',
      isUpgraded: true,
      baseHeroPowerId: 'chronos-power'
    },
    passive: {
      id: 'chronos-passive',
      name: 'Flow of Time',
      description: 'Start of turn, restore 1 health to all friendly minions.',
      trigger: 'start_of_turn',
      effectType: 'heal',
      value: 1
    }
  },

  // ==================== 51. PERSEPHONE ====================
  'hero-persephone': {
    id: 'hero-persephone',
    name: 'Persephone',
    title: 'Queen of the Underworld',
    element: 'dark',
    weakness: 'light',
    startingHealth: 100,
    description: 'Goddess of spring growth and queen of the underworld.',
    lore: 'The dread queen who rules beside Hades, bound to the underworld by pomegranate seeds. Her return to the surface brings spring, while her descent brings winter\'s death.',
    hasSpells: true,
    heroClass: 'warlock',
    fixedCardIds: [4408, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'persephone-power',
      name: 'Underworld Bloom',
      description: 'Give a friendly minion +1/+1 and Deathrattle: Draw a card.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1
    },
    weaponUpgrade: {
      id: 90051,
      name: 'Pomegranate of Rebirth',
      heroId: 'hero-persephone',
      manaCost: 5,
      description: 'Summon a 3/3 Shade with Deathrattle: Restore 3 HP to hero. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'summon',
        summonData: { 
          name: 'Shade', 
          attack: 3, 
          health: 3
        },
        description: 'Summon a 3/3 Shade with Deathrattle: Restore 3 HP to hero.'
      },
      upgradedPowerId: 'persephone-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'persephone-power-upgraded',
      name: 'Underworld Bloom+',
      description: 'Give a friendly minion +2/+2 and Deathrattle: Draw a card.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'persephone-power'
    },
    passive: {
      id: 'persephone-passive',
      name: 'Life and Death',
      description: 'When a friendly minion dies, restore 1 health to hero.',
      trigger: 'on_minion_death',
      condition: { targetType: 'friendly' },
      effectType: 'heal_hero',
      value: 1
    }
  },

  // ==================== 52. HESTIA ====================
  'hero-hestia': {
    id: 'hero-hestia',
    name: 'Hestia',
    title: 'Goddess of the Hearth',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'Goddess of the hearth, home, and family, keeper of the sacred flame.',
    lore: 'The gentle goddess who tends the eternal flame at Olympus\'s heart. She gave up her throne for Dionysus, preferring peace—yet her fire can never be extinguished.',
    hasSpells: true,
    heroClass: 'priest',
    fixedCardIds: [4409, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    heroPower: {
      id: 'hestia-power',
      name: 'Sacred Hearth',
      description: 'Give a friendly minion Taunt and +1 health.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 1,
      grantKeyword: 'taunt'
    },
    weaponUpgrade: {
      id: 90052,
      name: 'Sacred Flame',
      heroId: 'hero-hestia',
      manaCost: 5,
      description: 'Restore 5 health to all friendly minions. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'heal_aoe',
        value: 5,
        description: 'Restore 5 health to all friendly minions.'
      },
      upgradedPowerId: 'hestia-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'hestia-power-upgraded',
      name: 'Sacred Hearth+',
      description: 'Give a friendly minion Taunt and +2 health.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'buff_single',
      value: 2,
      grantKeyword: 'taunt',
      isUpgraded: true,
      baseHeroPowerId: 'hestia-power'
    },
    passive: {
      id: 'hestia-passive',
      name: "Hearth's Protection",
      description: 'Fire minions with Taunt have +1 health.',
      trigger: 'always',
      condition: { minionElement: 'fire', hasKeyword: 'taunt' },
      effectType: 'buff_health',
      value: 1
    }
  },

  // ==================== 53. PROMETHEUS ====================
  'hero-prometheus': {
    id: 'hero-prometheus',
    name: 'Prometheus',
    title: 'The Fire-Bringer',
    element: 'fire',
    weakness: 'water',
    startingHealth: 100,
    description: 'The far-seeing Titan who stole fire from heaven and gave it to humanity, suffering eternal punishment for his defiance.',
    lore: 'Chained to a rock in the Caucasus, an eagle devours his liver each day — and each night it regrows. His gift of fire lifted mortals from darkness, but his foresight could not save him from Zeus\'s wrath. Hesiod wrote: "He stole the far-seen gleam of unwearying fire in a hollow fennel stalk." (Theogony 566)',
    hasSpells: true,
    heroClass: 'druid',
    fixedCardIds: [],
    heroPower: {
      id: 'prometheus-power',
      name: 'Stolen Flame',
      description: 'Deal 2 damage to your hero. Give a friendly minion +2 Attack.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'self_damage_and_buff',
      selfDamage: 2,
      value: 2
    },
    weaponUpgrade: {
      id: 90053,
      name: 'Fennel Stalk of Heaven',
      heroId: 'hero-prometheus',
      manaCost: 5,
      description: 'Give all friendly minions +2 Attack. Draw 2 cards. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'buff_aoe_and_draw',
        value: 2,
        drawValue: 2,
        description: 'Give all friendly minions +2 Attack. Draw 2 cards.'
      },
      upgradedPowerId: 'prometheus-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'prometheus-power-upgraded',
      name: 'Stolen Flame+',
      description: 'Deal 1 damage to your hero. Give a friendly minion +2 Attack.',
      cost: 2,
      targetType: 'friendly_minion',
      effectType: 'self_damage_and_buff',
      selfDamage: 1,
      value: 2,
      isUpgraded: true,
      baseHeroPowerId: 'prometheus-power'
    },
    passive: {
      id: 'prometheus-passive',
      name: 'Gift of Fire',
      description: 'Whenever you take damage on your turn, give a random friendly minion +1 Attack.',
      trigger: 'on_hero_damage',
      effectType: 'buff_random_friendly',
      value: 1
    }
  },

  // ==================== 54. HERACLES ====================
  'hero-heracles': {
    id: 'hero-heracles',
    name: 'Heracles',
    title: 'The Greatest Hero',
    element: 'fire',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Son of Zeus and Alcmene, the mightiest mortal who ever lived. His twelve labors are the measure of all heroism.',
    lore: 'Driven mad by Hera, he slew his own family — and undertook twelve impossible labors as penance. He strangled the Nemean Lion, slew the Hydra, captured Cerberus from the underworld. In death, Zeus raised him to Olympus. Apollodorus wrote: "He surpassed all men of that age in size and strength." (Library 2.4.9)',
    hasSpells: true,
    heroClass: 'warrior',
    fixedCardIds: [],
    heroPower: {
      id: 'heracles-power',
      name: 'Lion\'s Hide',
      description: 'Gain 2 Armor.',
      cost: 2,
      targetType: 'none',
      effectType: 'gain_armor',
      value: 2
    },
    weaponUpgrade: {
      id: 90054,
      name: 'Club of Nemea',
      heroId: 'hero-heracles',
      manaCost: 5,
      description: 'Gain 8 Armor. Deal 4 damage to an enemy. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'armor_and_damage',
        value: 8,
        description: 'Gain 8 Armor. Deal 4 damage to an enemy.'
      },
      upgradedPowerId: 'heracles-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'heracles-power-upgraded',
      name: 'Lion\'s Hide+',
      description: 'Gain 3 Armor.',
      cost: 2,
      targetType: 'none',
      effectType: 'gain_armor',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'heracles-power'
    },
    passive: {
      id: 'heracles-passive',
      name: 'Twelve Labors',
      description: 'After you destroy an enemy minion, gain +1 Armor.',
      trigger: 'on_enemy_minion_death',
      effectType: 'gain_armor',
      value: 1
    }
  },

  // ==================== 54b. PERSEUS ====================
  'hero-perseus': {
    id: 'hero-perseus',
    name: 'Perseus',
    title: 'The Gorgon Slayer',
    element: 'light',
    weakness: 'dark',
    startingHealth: 100,
    description: 'Son of Zeus and Danaë, slayer of Medusa. Armed with divine gifts — winged sandals, cap of invisibility, and the curved blade of Hermes.',
    lore: 'Cast adrift as a babe, raised by fishermen, sent on a suicide quest by a tyrant king. He beheaded Medusa with Athena\'s mirrored shield and Hermes\' adamantine sickle. From her blood sprang Pegasus. He saved Andromeda from the sea-beast and turned Polydectes to stone. Apollodorus: "Perseus flew to the Ocean and found the Gorgons sleeping." (Library 2.4.2)',
    hasSpells: true,
    heroClass: 'hunter',
    fixedCardIds: [],
    heroPower: {
      id: 'perseus-power',
      name: 'Gorgon\'s Gaze',
      description: 'Deal 2 damage to an enemy minion. If it dies, Freeze an adjacent minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 2
    },
    weaponUpgrade: {
      id: 90125,
      name: 'Harpe of Hermes',
      heroId: 'hero-perseus',
      manaCost: 5,
      description: 'Deal 3 damage to all enemy minions. Gain Stealth until your next turn. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'aoe_damage',
        value: 3,
        description: 'Deal 3 damage to all enemy minions. Gain Stealth.'
      },
      upgradedPowerId: 'perseus-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'perseus-power-upgraded',
      name: 'Gorgon\'s Gaze+',
      description: 'Deal 3 damage to an enemy minion. If it dies, Freeze an adjacent minion.',
      cost: 2,
      targetType: 'enemy_minion',
      effectType: 'damage_single',
      value: 3,
      isUpgraded: true,
      baseHeroPowerId: 'perseus-power'
    },
    passive: {
      id: 'perseus-passive',
      name: 'Aegis Shield',
      description: 'After you destroy an enemy minion, gain +1 Attack this turn.',
      trigger: 'on_enemy_minion_death',
      effectType: 'buff_hero_attack',
      value: 1
    }
  },

  // ==================== 55. RHEA ====================
  'hero-rhea': {
    id: 'hero-rhea',
    name: 'Rhea',
    title: 'Mother of the Gods',
    element: 'grass',
    weakness: 'fire',
    startingHealth: 100,
    description: 'Titaness and mother of the six Olympian gods. She saved Zeus from Cronus by hiding him in a cave on Crete.',
    lore: 'The great mother who wrapped a stone in swaddling clothes and fed it to Cronus while her youngest son grew strong in secret. Her courage saved the future. Without Rhea\'s deception, there would be no Olympus, no Zeus, no age of gods. Hesiod wrote: "She bore splendid children — Hestia, Demeter, Hera, Hades, Poseidon, and Zeus." (Theogony 453-457)',
    hasSpells: true,
    heroClass: 'priest',
    fixedCardIds: [],
    heroPower: {
      id: 'rhea-power',
      name: 'Mother\'s Aegis',
      description: 'Restore 3 Health to a friendly character.',
      cost: 2,
      targetType: 'friendly_character',
      effectType: 'heal',
      value: 3
    },
    weaponUpgrade: {
      id: 90055,
      name: 'Swaddling Stone',
      heroId: 'hero-rhea',
      manaCost: 5,
      description: 'Restore 5 Health to all friendly characters. Give all friendly minions +1/+1. Permanently upgrade your hero power.',
      immediateEffect: {
        type: 'heal_all_and_buff',
        value: 5,
        description: 'Restore 5 Health to all friendly characters. Give all friendly minions +1/+1.'
      },
      upgradedPowerId: 'rhea-power-upgraded'
    },
    upgradedHeroPower: {
      id: 'rhea-power-upgraded',
      name: 'Mother\'s Aegis+',
      description: 'Restore 4 Health to a friendly character.',
      cost: 2,
      targetType: 'friendly_character',
      effectType: 'heal',
      value: 4,
      isUpgraded: true,
      baseHeroPowerId: 'rhea-power'
    },
    passive: {
      id: 'rhea-passive',
      name: 'Titan Mother',
      description: 'When you restore Health, restore +1 additional.',
      trigger: 'on_heal',
      effectType: 'heal_bonus',
      value: 1
    }
  }
};

export const PRIMARY_HERO_LIST = Object.values(NORSE_HEROES);

export const getHeroById = (id: string): NorseHero | undefined => {
  return NORSE_HEROES[id];
};

export const getAllPrimaryHeroes = (): NorseHero[] => {
  return PRIMARY_HERO_LIST;
};

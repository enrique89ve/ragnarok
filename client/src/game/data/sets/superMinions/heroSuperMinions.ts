/**
 * heroSuperMinions.ts
 * 
 * Super Minions - Legendary minions linked to heroes (76+ total)
 * These minions gain +2/+2 when played by their linked hero.
 * Some mythic heroes (like Loki) have multiple linked super minions.
 * 
 * ID Range: 95000-95999 (Super Minions)
 */

import { CardData } from '../../../types';

/**
 * Hero-to-Super Minion linking data
 * Maps hero IDs to their super minion IDs for the +2/+2 bonus
 */
export const HERO_SUPER_MINION_LINKS: Record<string, number> = {
  // QUEEN - Mage (10)
  'hero-odin': 95001,
  'hero-bragi': 95002,
  'hero-kvasir': 95003,
  'hero-eldrin': 95004,
  'hero-logi': 95005,
  'hero-zeus': 95006,
  'hero-athena': 95007,
  'hero-hyperion': 95008,
  'hero-chronos': 95010,
  
  // QUEEN - Warlock (7)
  'hero-forseti': 95011,
  'hero-mani': 95012,
  'hero-thryma': 95013,
  'hero-hades': 95014,
  'hero-dionysus': 95015,
  'king-tartarus': 95016,
  'hero-persephone': 95017,
  
  // QUEEN - Necromancer (3)
  'hero-sol': 95018,
  'hero-sinmara': 95019,
  'hero-hel': 95020,
  
  // ROOK - Warrior (6)
  'hero-thor': 95021,
  'hero-thorgrim': 95022,
  'hero-valthrud': 95023,
  'hero-vili': 95024,
  'hero-ares': 95025,
  'hero-hephaestus': 95026,
  
  // ROOK - Death Knight (2)
  'hero-magni': 95027,
  'hero-brakki': 95028,
  
  // ROOK - Paladin (5)
  'hero-tyr': 95029,
  'hero-vidar': 95030,
  'hero-heimdall': 95031,
  'hero-baldur': 95032,
  'hero-solvi': 95033,
  
  // BISHOP - Priest (8)
  'hero-freya': 95034,
  'hero-eir': 95035,
  'hero-frey': 95036,
  'hero-hoenir': 95037,
  'hero-aphrodite': 95038,
  'hero-hera': 95039,
  'hero-eros': 95040,
  'hero-hestia': 95041,
  
  // BISHOP - Druid (6)
  'hero-idunn': 95042,
  'hero-ve': 95043,
  'hero-fjorgyn': 95044,
  'hero-sigyn': 95045,
  'hero-demeter': 95046,
  'hero-blainn': 95047,
  
  // BISHOP - Shaman (5)
  'hero-gerd': 95048,
  'hero-gefjon': 95049,
  'hero-ran': 95050,
  'hero-njord': 95051,
  'hero-poseidon': 95052,
  
  // KNIGHT - Rogue (6)
  'hero-loki': 95053,
  'hero-hoder': 95054,
  'hero-gormr': 95055,
  'hero-lirien': 95056,
  'hero-hermes': 95057,
  'hero-nyx': 95058,
  
  // KNIGHT - Hunter (6)
  'hero-skadi': 95059,
  'hero-aegir': 95060,
  'hero-fjora': 95061,
  'hero-ullr': 95062,
  'hero-apollo': 95063,
  'hero-artemis': 95064,
  
  // KNIGHT - Berserker (2)
  'hero-myrka': 95065,
  'hero-ylva': 95066,
  
  // Japanese Heroes (5)
  'hero-izanami': 95067,
  'hero-tsukuyomi': 95068,
  'hero-fujin': 95069,
  'hero-sarutahiko': 95070,
  'hero-kamimusubi': 95071,
  
  // Egyptian Heroes (5)
  'hero-ammit': 95072,
  'hero-maat': 95073,
  'hero-serqet': 95074,
  'hero-khepri': 95075,

  // Greek Alt-Skin Heroes (3)
  'hero-selene': 95082,
  'hero-hecate': 95083,
  'hero-helios': 95084,
};

/**
 * Bonus Super Minions - Some mythic heroes get multiple linked minions
 * Maps hero IDs to their additional super minion IDs
 * These represent legendary creature companions from mythology
 */
export const BONUS_SUPER_MINION_LINKS: Record<string, number[]> = {
  // Loki's Children - Fenrir (primary) + Jormungandr (bonus)
  'hero-loki': [95077], // Jörmungandr, the World Serpent
  
  // Norse Mythic Companions
  'hero-heimdall': [95078], // Gulltoppr, the Golden-Maned (his divine horse)
  'hero-freya': [95080], // Hildisvíni, the Battle Boar (her companion)
  
  // Greek Mythic Companions
  'hero-artemis': [95079], // The Ceryneian Hind (sacred golden deer)
  'hero-poseidon': [95081], // Hippocampus, Steed of the Depths
};

/**
 * Reverse lookup: Super Minion ID to Hero ID
 * Includes both primary and bonus super minions
 */
export const SUPER_MINION_TO_HERO: Record<number, string> = (() => {
  const result: Record<number, string> = {};
  
  // Add primary super minions
  Object.entries(HERO_SUPER_MINION_LINKS).forEach(([heroId, minionId]) => {
    result[minionId] = heroId;
  });
  
  // Add bonus super minions
  Object.entries(BONUS_SUPER_MINION_LINKS).forEach(([heroId, minionIds]) => {
    minionIds.forEach(minionId => {
      result[minionId] = heroId;
    });
  });
  
  return result;
})();

/**
 * Check if a card is a super minion
 */
export function isSuperMinion(cardId: number): boolean {
  return cardId >= 95001 && cardId <= 95999;
}

/**
 * Get the linked hero for a super minion
 */
export function getLinkedHero(superMinionId: number): string | undefined {
  return SUPER_MINION_TO_HERO[superMinionId];
}

/**
 * Get the primary super minion for a hero
 */
export function getSuperMinionForHero(heroId: string): number | undefined {
  return HERO_SUPER_MINION_LINKS[heroId];
}

/**
 * Get all super minions for a hero (primary + bonus)
 */
export function getAllSuperMinionsForHero(heroId: string): number[] {
  const result: number[] = [];
  
  const primary = HERO_SUPER_MINION_LINKS[heroId];
  if (primary) result.push(primary);
  
  const bonus = BONUS_SUPER_MINION_LINKS[heroId];
  if (bonus) result.push(...bonus);
  
  return result;
}

/**
 * Check if a super minion should get the hero bonus
 */
export function shouldGetHeroBonus(superMinionId: number, currentHeroId: string): boolean {
  const linkedHero = getLinkedHero(superMinionId);
  return linkedHero === currentHeroId;
}

/**
 * Super Minion Collection - Legendary Minions (76 primary + bonus minions)
 * Each minion is linked to a specific hero and gains +2/+2 when played by that hero.
 * Mythic heroes like Loki have additional bonus super minions (Loki's children: Fenrir + Jörmungandr).
 */
export const heroSuperMinions: CardData[] = [
  // ═══════════════════════════════════════════════════════════════
  // QUEEN - MAGE CLASS (10 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95001,
    name: "All-Seeing Ravens",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Reveal opponent's entire hand. Draw 2 cards. Your spells cost (1) less this turn.",
    flavorText: "Every morning they fly over the world. Every evening Odin fears that Huginn may not return -- but it is Muninn he worries about more.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    race: "Beast",
    linkedHeroId: "hero-odin",
    isSuperMinion: true,
    battlecry: {
      type: "reveal_and_draw",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95002,
    name: "Skald of the Endless Saga",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Foresee 3 spells. Give them +2 Spell Damage. Aura: Your spells deal +2 damage.",
    flavorText: "His song began at the dawn of creation. It has not ended yet.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    linkedHeroId: "hero-bragi",
    isSuperMinion: true,
    battlecry: {
      type: "discover_spells",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    aura: {
      type: "spell_damage",
      value: 2
    },
    collectible: true
  },
  {
    id: 95003,
    name: "The Mead of Poetry",
    manaCost: 10,
    attack: 6,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Draw 4 cards. Gain +1/+1 for each card drawn this game.",
    flavorText: "Brewed from Kvasir's blood by the dwarves Fjalar and Galar. One sip, and even a fool speaks in verse.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    linkedHeroId: "hero-kvasir",
    isSuperMinion: true,
    battlecry: {
      type: "draw_and_buff_self",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95004,
    name: "Phoenix of Alfheim",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 6 damage to all enemy minions. Deathrattle: Return to your hand with +2/+2.",
    flavorText: "The light elves keep strange creatures. This one dies in flame and rises from its own ashes, brighter each time.",
    keywords: ["battlecry", "deathrattle"],
    heroClass: "mage",
    class: "Mage",
    race: "Elemental",
    linkedHeroId: "hero-eldrin",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_enemies",
      value: 6,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "return_to_hand_buffed",
      value: 2
    },
    collectible: true
  },
  {
    id: 95005,
    name: "Muspelheim's Inferno",
    manaCost: 10,
    attack: 9,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 8 damage randomly split among all enemies.",
    flavorText: "The fires of Muspelheim are older than the gods. They will outlast them too.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    race: "Elemental",
    linkedHeroId: "hero-logi",
    isSuperMinion: true,
    battlecry: {
      type: "damage_split",
      value: 8,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95006,
    name: "Keraunos, Living Lightning",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 3 damage to all enemies. Overload: (2). When you cast a spell, deal 1 damage to a random enemy.",
    flavorText: "Born from the first thunderclap that split the primordial void.",
    keywords: ["battlecry", "overload"],
    heroClass: "mage",
    class: "Mage",
    race: "Elemental",
    linkedHeroId: "hero-zeus",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_enemies",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    triggeredEffect: {
      trigger: "on_spell_cast",
      type: "damage_random_enemy",
      value: 1
    },
    collectible: true
  },
  {
    id: 95007,
    name: "Aegis, the Divine Shield",
    manaCost: 10,
    attack: 7,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all friendly minions Divine Shield and +2 Health.",
    flavorText: "Forged by Hephaestus, bearing Medusa's head. No army has ever advanced against it.",
    keywords: ["battlecry", "divine_shield"],
    heroClass: "mage",
    class: "Mage",
    linkedHeroId: "hero-athena",
    isSuperMinion: true,
    battlecry: {
      type: "buff_all_friendly_divine_shield",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95008,
    name: "Titan of the Blazing Sun",
    manaCost: 10,
    attack: 10,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 5 damage to all enemies. At the end of each turn, deal 2 damage to all enemies.",
    flavorText: "Helios rode his chariot across the sky each day. The heat of his passing scorched the earth below.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    race: "Elemental",
    linkedHeroId: "hero-hyperion",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_enemies",
      value: 5,
      requiresTarget: false,
      targetType: 'none'
    },
    triggeredEffect: {
      trigger: "end_of_turn",
      type: "damage_all_enemies",
      value: 2
    },
    collectible: true
  },
  {
    id: 95010,
    name: "Eternity's Hourglass",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Take an extra turn after this one. Your cards cost (1) more next turn.",
    flavorText: "Time is a river. She is the ocean it flows into.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    linkedHeroId: "hero-chronos",
    isSuperMinion: true,
    battlecry: {
      type: "extra_turn",
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // QUEEN - WARLOCK CLASS (7 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95011,
    name: "Glitnir's Final Judgment",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy a random enemy minion. If it had 5+ Attack, destroy another. Draw a card for each.",
    flavorText: "Forseti's hall of justice, where every dispute finds resolution and every wrong finds remedy.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    linkedHeroId: "hero-forseti",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_and_draw",
      value: 5,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95012,
    name: "Moonbane Wolf",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all friendly minions Stealth. Summon a 4/4 Shadow Wolf with Lifesteal.",
    flavorText: "Hrodvitnir's son pursues Mani across the sky. At Ragnarok, the chase ends.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    race: "Beast",
    linkedHeroId: "hero-mani",
    isSuperMinion: true,
    battlecry: {
      type: "stealth_all_and_summon",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95013,
    name: "Stormwyrm Tempest",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 4 damage to all enemies. Return the two weakest enemy minions to their hand.",
    flavorText: "Where it flies, the sky darkens and the sea rises to meet it.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    race: "Dragon",
    linkedHeroId: "hero-thryma",
    isSuperMinion: true,
    battlecry: {
      type: "damage_and_bounce",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95014,
    name: "Guardian of the Dead Gate",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy all enemy minions with 4 or less Attack. Summon 2/2 Shades for each destroyed.",
    flavorText: "Three heads watch the gate. None who enter may leave. None who leave were truly dead.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    race: "Titan",
    linkedHeroId: "hero-hades",
    isSuperMinion: true,
    battlecry: {
      type: "conditional_destroy_summon",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95015,
    name: "Maenads' Frenzy",
    manaCost: 9,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all minions +3 Attack. At end of turn, deal 2 damage to all minions.",
    flavorText: "The women of Dionysus dance in sacred frenzy. Their joy is indistinguishable from destruction.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    linkedHeroId: "hero-dionysus",
    isSuperMinion: true,
    battlecry: {
      type: "buff_all_attack",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    triggeredEffect: {
      trigger: "end_of_turn",
      type: "damage_all_minions",
      value: 2
    },
    collectible: true
  },
  {
    id: 95016,
    name: "Abyss of Eternal Night",
    manaCost: 10,
    attack: 8,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy the highest and lowest Attack enemy minions. Gain their combined stats.",
    flavorText: "Erebus, the primordial darkness that existed before the gods shaped the world.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    race: "Titan",
    linkedHeroId: "king-tartarus",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_extremes_gain_stats",
      value: 0,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95017,
    name: "Queen of the Underworld",
    manaCost: 10,
    attack: 7,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Resurrect 3 random friendly minions that died this game. Give them +1/+1 and Rush.",
    flavorText: "Six months below, six months above. The earth mourns when she descends.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    linkedHeroId: "hero-persephone",
    isSuperMinion: true,
    battlecry: {
      type: "resurrect_buff",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // QUEEN - NECROMANCER CLASS (3 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95018,
    name: "Sun-Devourer Wolf",
    manaCost: 10,
    attack: 9,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 4 damage to all enemies. Deathrattle: Summon a 6/6 Solar Eclipse that deals 2 damage to all enemies at end of turn.",
    flavorText: "Skoll pursues Sol across the heavens. When he catches her, Ragnarok begins.",
    keywords: ["battlecry", "deathrattle"],
    heroClass: "necromancer",
    class: "Necromancer",
    race: "Beast",
    linkedHeroId: "hero-sol",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_enemies",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "summon_with_triggered",
      summonName: "Solar Eclipse",
      summonAttack: 6,
      summonHealth: 6
    },
    collectible: true
  },
  {
    id: 95019,
    name: "Lævateinn, Blade of Ruin",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 10 damage to a minion. If it dies, deal excess damage to adjacent minions. Give Fire minions +2 Attack.",
    flavorText: "The Damage-Twig, locked behind nine locks by Sinmara. Whoever wields it brings ruin to all.",
    keywords: ["battlecry"],
    heroClass: "necromancer",
    class: "Necromancer",
    race: "Elemental",
    linkedHeroId: "hero-sinmara",
    isSuperMinion: true,
    battlecry: {
      type: "overkill_cleave",
      value: 10,
      requiresTarget: true,
      targetType: 'any_minion'
    },
    collectible: true
  },
  {
    id: 95020,
    name: "Garmr, Hound of Helheim",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy all minions with 3 or less Health. Summon a 2/2 Draugr with Rush for each. Deathrattle: Resurrect this at 1 Health.",
    flavorText: "The blood-stained hound howls at Gnipahellir. His chains will snap when the world ends.",
    keywords: ["battlecry", "deathrattle"],
    heroClass: "necromancer",
    class: "Necromancer",
    race: "Beast",
    linkedHeroId: "hero-hel",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_low_health_summon",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "resurrect_self",
      value: 1
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // ROOK - WARRIOR CLASS (6 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95021,
    name: "Tanngrisnir & Tanngnjóstr",
    manaCost: 10,
    attack: 10,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Deal 5 damage to all enemies. Deathrattle: Summon two 4/4 Goats with Rush. Gain 5 Armor.",
    flavorText: "Thor's goats pull his chariot across the sky. He eats them each night; they rise whole each morning.",
    keywords: ["rush", "battlecry", "deathrattle"],
    heroClass: "warrior",
    class: "Warrior",
    race: "Beast",
    linkedHeroId: "hero-thor",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_enemies_armor",
      value: 5,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "summon_multiple",
      summonName: "Thunder Goat",
      summonAttack: 4,
      summonHealth: 4,
      count: 2
    },
    collectible: true
  },
  {
    id: 95022,
    name: "Hrungnir's Heart",
    manaCost: 10,
    attack: 9,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Gain +1/+1 for each damaged character. Deal 3 damage to a random enemy for each friendly minion.",
    flavorText: "The mightiest of the jotnar, with a head and heart of stone. Only Thor's hammer could shatter them.",
    keywords: ["taunt", "battlecry"],
    heroClass: "warrior",
    class: "Warrior",
    race: "Elemental",
    linkedHeroId: "hero-thorgrim",
    isSuperMinion: true,
    battlecry: {
      type: "buff_from_damaged",
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95023,
    name: "Jörmungandr, World Serpent",
    manaCost: 10,
    attack: 8,
    health: 12,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Poisonous. Battlecry: Deal 2 damage to all enemies. Gain +1 Attack for each enemy damaged.",
    flavorText: "So vast it circles all of Midgard and grasps its own tail. When it lets go, the world ends.",
    keywords: ["taunt", "poisonous", "battlecry"],
    heroClass: "warrior",
    class: "Warrior",
    race: "Beast",
    linkedHeroId: "hero-valthrud",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_buff_self",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95024,
    name: "Whetstone of Ymir",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Give all friendly minions +3 Attack this turn. Draw a card for each that attacks and kills.",
    flavorText: "Sharpened on the bones of the first giant. Every blade it touches hungers for battle.",
    keywords: ["rush", "battlecry"],
    heroClass: "warrior",
    class: "Warrior",
    linkedHeroId: "hero-vili",
    isSuperMinion: true,
    battlecry: {
      type: "buff_attack_draw_on_kill",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95025,
    name: "Phobos & Deimos",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Summon a 4/4 Fear (can't be attacked) and a 4/4 Terror with Windfury.",
    flavorText: "Fear and Terror, the twin sons of Ares. They ride before his chariot, and armies scatter.",
    keywords: ["rush", "battlecry"],
    heroClass: "warrior",
    class: "Warrior",
    linkedHeroId: "hero-ares",
    isSuperMinion: true,
    battlecry: {
      type: "summon_pair",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95026,
    name: "Automatons of Olympus",
    manaCost: 10,
    attack: 7,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Equip a 4/2 Divine Hammer. Summon two 3/3 Bronze Automatons with Reborn.",
    flavorText: "Golden maidens forged by Hephaestus -- they think, they speak, they serve. More alive than many mortals.",
    keywords: ["taunt", "battlecry"],
    heroClass: "warrior",
    class: "Warrior",
    race: "Automaton",
    linkedHeroId: "hero-hephaestus",
    isSuperMinion: true,
    battlecry: {
      type: "equip_weapon_summon",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // ROOK - DEATH KNIGHT CLASS (2 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95027,
    name: "Hammer of the Forge-Father",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Deal 4 damage to all enemies. Gain 8 Armor. Deathrattle: Summon a 5/5 Spectral Forger.",
    flavorText: "The same hammer that forged Zeus's thunderbolts and Achilles' armor.",
    keywords: ["rush", "battlecry", "deathrattle"],
    heroClass: "DeathKnight",
    class: "DeathKnight",
    linkedHeroId: "hero-magni",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_enemies_armor",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "summon",
      summonName: "Spectral Forger",
      summonAttack: 5,
      summonHealth: 5
    },
    collectible: true
  },
  {
    id: 95028,
    name: "Völundr's Masterwork",
    manaCost: 10,
    attack: 8,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Foresee a weapon and equip it with +2/+2. Give all friendly minions +2/+2.",
    flavorText: "The master smith of legend. The Franks called him Wayland, the Norse called him V\u00F6lundr. All called him peerless.",
    keywords: ["battlecry"],
    heroClass: "DeathKnight",
    class: "DeathKnight",
    linkedHeroId: "hero-brakki",
    isSuperMinion: true,
    battlecry: {
      type: "discover_weapon_buff_all",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // ROOK - PALADIN CLASS (5 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95029,
    name: "Gleipnir, the Binding Chain",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Divine Shield. Battlecry: Silence and Freeze all enemy minions. Draw cards equal to silenced minions.",
    flavorText: "Forged from the sound of a cat's footsteps, the beard of a woman, the roots of a mountain, and the breath of a fish.",
    keywords: ["divine_shield", "battlecry"],
    heroClass: "paladin",
    class: "Paladin",
    linkedHeroId: "hero-tyr",
    isSuperMinion: true,
    battlecry: {
      type: "silence_freeze_draw",
      value: 0,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95030,
    name: "Iron Boot of Ragnarok",
    manaCost: 10,
    attack: 10,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Destroy an enemy minion. Gain its Attack as Armor. Deathrattle: Summon a 5/5 Avenging Vidar.",
    flavorText: "Vidar's boot, thick enough to stand in Fenrir's jaw. One stomp ends the great wolf forever.",
    keywords: ["rush", "battlecry", "deathrattle"],
    heroClass: "paladin",
    class: "Paladin",
    linkedHeroId: "hero-vidar",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_gain_armor",
      value: 0,
      requiresTarget: true,
      targetType: 'enemy_minion'
    },
    deathrattle: {
      type: "summon",
      summonName: "Avenging Vidar",
      summonAttack: 5,
      summonHealth: 5
    },
    collectible: true
  },
  {
    id: 95031,
    name: "Gjallarhorn, Doom's Herald",
    manaCost: 10,
    attack: 7,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Give all friendly minions +2 Health and Taunt. Reveal opponent's hand. Draw 2 cards.",
    flavorText: "When Heimdall blows the Gjallarhorn, the sound will be heard across all Nine Realms. Then begins the end.",
    keywords: ["taunt", "battlecry"],
    heroClass: "paladin",
    class: "Paladin",
    linkedHeroId: "hero-heimdall",
    isSuperMinion: true,
    battlecry: {
      type: "buff_taunt_reveal_draw",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95032,
    name: "Mistletoe's Redemption",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Divine Shield. Battlecry: Give all friendly minions Divine Shield. Your hero is Immune until next turn. Deathrattle: Restore all friendly minions to full Health.",
    flavorText: "The smallest plant, overlooked by all -- except blind Hodr, who threw it and killed a god.",
    keywords: ["divine_shield", "battlecry", "deathrattle"],
    heroClass: "paladin",
    class: "Paladin",
    linkedHeroId: "hero-baldur",
    isSuperMinion: true,
    battlecry: {
      type: "divine_shield_all_immune",
      value: 0,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "heal_all_friendly",
      value: 99
    },
    collectible: true
  },
  {
    id: 95033,
    name: "Skinfaxi's Mane",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all friendly minions Divine Shield.",
    flavorText: "Dagr rides Skinfaxi, whose mane lights the sky. Where dawn breaks, no shadow endures.",
    keywords: ["battlecry"],
    heroClass: "paladin",
    class: "Paladin",
    linkedHeroId: "hero-solvi",
    isSuperMinion: true,
    battlecry: {
      type: "give_divine_shield",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // BISHOP - PRIEST CLASS (8 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95034,
    name: "Brísingamen, Necklace of Flame",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all friendly minions +2/+2 and Lifesteal. Restore 10 Health to your hero. Aura: Double healing.",
    flavorText: "Four dwarves forged it. Freya paid a price for each. The necklace shines brighter than starlight.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-freya",
    isSuperMinion: true,
    battlecry: {
      type: "buff_lifesteal_heal",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    aura: {
      type: "double_healing"
    },
    collectible: true
  },
  {
    id: 95035,
    name: "Chalice of Eternal Life",
    manaCost: 10,
    attack: 6,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Restore all characters to full Health. Your minions can't be reduced below 1 Health this turn.",
    flavorText: "Idunn's golden apples grant the gods their immortality. Without them, even Odin would wither.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-eir",
    isSuperMinion: true,
    battlecry: {
      type: "heal_all_protect",
      value: 99,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95036,
    name: "Golden War-Boar of Freyr",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Summon a copy of this minion. Deathrattle: Give a random friendly minion +4/+4.",
    flavorText: "Forged by the dwarves Sindri and Brokkr. Its golden bristles light up the darkest night.",
    keywords: ["rush", "battlecry", "deathrattle"],
    heroClass: "priest",
    class: "Priest",
    race: "Beast",
    linkedHeroId: "hero-frey",
    isSuperMinion: true,
    battlecry: {
      type: "summon_copy",
      value: 0,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "buff_random_friendly",
      value: 4
    },
    collectible: true
  },
  {
    id: 95037,
    name: "Hoenir's Gift of Spirit",
    manaCost: 10,
    attack: 7,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all friendly minions +2/+2. Draw 2 cards.",
    flavorText: "Hoenir gave önd — the breath of life — to Ask and Embla. Without his gift, humanity would be driftwood still.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-hoenir",
    isSuperMinion: true,
    battlecry: {
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      targetType: 'none',
      requiresTarget: false
    },
    collectible: true
  },
  {
    id: 95038,
    name: "Aphrodite's Cestus",
    manaCost: 9,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Take control of a random enemy minion.",
    flavorText: "The Cestus — Aphrodite's magic girdle — compels love. Even Ares could not resist its charm.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-aphrodite",
    isSuperMinion: true,
    battlecry: {
      type: "mind_control_random",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95039,
    name: "Hera's Jealous Claim",
    manaCost: 10,
    attack: 8,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Take control of a random enemy minion.",
    flavorText: "Hera turned Io into a cow, cursed Echo to repeat, and hunted Heracles across the world. Her jealousy is absolute.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-hera",
    isSuperMinion: true,
    battlecry: {
      type: "mind_control_random",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95040,
    name: "Eros's Golden Arrow",
    manaCost: 8,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Freeze all enemy minions.",
    flavorText: "Eros's golden arrows kindle love — his victims stand smitten, unable to act. His leaden arrows turn hearts to stone.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-eros",
    isSuperMinion: true,
    battlecry: {
      type: "freeze",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95041,
    name: "Eternal Hearth Flame",
    manaCost: 10,
    attack: 5,
    health: 12,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Restore 15 Health to your hero. At end of each turn, restore 3 Health to all friendly characters.",
    flavorText: "Hestia's fire has burned since Olympus was young. It will burn until the last temple crumbles.",
    keywords: ["taunt", "battlecry"],
    heroClass: "priest",
    class: "Priest",
    race: "Elemental",
    linkedHeroId: "hero-hestia",
    isSuperMinion: true,
    battlecry: {
      type: "heal_hero",
      value: 15,
      requiresTarget: false,
      targetType: 'none'
    },
    triggeredEffect: {
      trigger: "end_of_turn",
      type: "heal_all_friendly",
      value: 3
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // BISHOP - DRUID CLASS (6 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95042,
    name: "Golden Apple Tree",
    manaCost: 10,
    attack: 6,
    health: 12,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Give all friendly minions +3 Health and 'Deathrattle: Restore 5 Health to your hero.' Draw 3 cards.",
    flavorText: "The apples of immortality grow in Idunn's garden. Thiazi stole them once. The gods aged in a single afternoon.",
    keywords: ["taunt", "battlecry"],
    heroClass: "druid",
    class: "Druid",
    linkedHeroId: "hero-idunn",
    isSuperMinion: true,
    battlecry: {
      type: "buff_grant_deathrattle_draw",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95043,
    name: "Askr & Embla",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Summon a 4/4 Askr with Taunt and a 4/4 Embla with Rush. They gain +2/+2 at end of each turn.",
    flavorText: "From driftwood, the gods carved the first man and woman. Odin gave breath, Hoenir gave sense, Lodur gave warmth.",
    keywords: ["battlecry"],
    heroClass: "druid",
    class: "Druid",
    linkedHeroId: "hero-ve",
    isSuperMinion: true,
    battlecry: {
      type: "summon_growing_pair",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95044,
    name: "Heart of the World Tree",
    manaCost: 10,
    attack: 7,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Gain +1/+1 for each friendly Treant. Summon three 2/2 Treants with Taunt.",
    flavorText: "Yggdrasil's roots drink from three wells: Urd's wisdom, Mimir's knowledge, and Hvergelmir's chaos.",
    keywords: ["taunt", "battlecry"],
    heroClass: "druid",
    class: "Druid",
    linkedHeroId: "hero-fjorgyn",
    isSuperMinion: true,
    battlecry: {
      type: "buff_from_treants_summon",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95045,
    name: "Sigyn's Vigil",
    manaCost: 9,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Give all friendly minions Divine Shield.",
    flavorText: "Sigyn holds the bowl above Loki's face, catching the venom. She shields others through her own suffering — and always has.",
    keywords: ["battlecry"],
    heroClass: "druid",
    class: "Druid",
    linkedHeroId: "hero-sigyn",
    isSuperMinion: true,
    battlecry: {
      type: "give_divine_shield",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95046,
    name: "Cornucopia of Abundance",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Fill your hand with random Druid spells. They cost (2) less. Gain 5 Armor.",
    flavorText: "The horn of plenty, broken from the goat Amalthea. It overflows with whatever its bearer desires.",
    keywords: ["battlecry"],
    heroClass: "druid",
    class: "Druid",
    linkedHeroId: "hero-demeter",
    isSuperMinion: true,
    battlecry: {
      type: "fill_hand_discount_armor",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95047,
    name: "Blainn's Masterwork",
    manaCost: 10,
    attack: 10,
    health: 12,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Fill your board with 3/3 Automatons.",
    flavorText: "Blainn the dwarf-smith forges not weapons but armies. From Svartalfheim's deepest forge, his masterwork marches.",
    keywords: ["taunt", "battlecry"],
    heroClass: "druid",
    class: "Druid",
    race: "Automaton",
    linkedHeroId: "hero-blainn",
    isSuperMinion: true,
    battlecry: {
      type: "fill_board",
      summonName: "Automaton",
      summonAttack: 3,
      summonHealth: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // BISHOP - SHAMAN CLASS (5 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95048,
    name: "Frost Giant's Heart",
    manaCost: 10,
    attack: 8,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Freeze Immunity. Battlecry: Freeze all enemy minions. Summon two 3/3 Frost Totems with Taunt.",
    flavorText: "Born from the rime of Niflheim, ancient as ice itself.",
    keywords: ["battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    race: "Elemental",
    linkedHeroId: "hero-gerd",
    isSuperMinion: true,
    battlecry: {
      type: "freeze_all_summon",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95049,
    name: "Four Oxen of Zealand",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Summon four 2/2 Oxen with Taunt. When any Ox dies, give your other minions +1/+1.",
    flavorText: "Gefjon ploughed Zealand from the Swedish mainland with her four ox-sons. The furrows became the great lake M\u00E4laren.",
    keywords: ["battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    race: "Beast",
    linkedHeroId: "hero-gefjon",
    isSuperMinion: true,
    battlecry: {
      type: "summon_with_death_buff",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95050,
    name: "The Golden Net",
    manaCost: 10,
    attack: 7,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Return all enemy minions with 3 or less Attack to their hand. Summon 2/2 Drowned Sailors with Rush for each.",
    flavorText: "Ran drags sailors to the deep with her net. Those she catches feast in her underwater halls forever.",
    keywords: ["battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    linkedHeroId: "hero-ran",
    isSuperMinion: true,
    battlecry: {
      type: "bounce_weak_summon",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95051,
    name: "Skidbladnir, Ship of the Gods",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Windfury. Battlecry: Summon all four basic Totems. Give your Totems +2/+2.",
    flavorText: "The greatest ship ever built. It can carry all the gods, yet folds small enough for Freyr's pocket.",
    keywords: ["windfury", "battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    linkedHeroId: "hero-njord",
    isSuperMinion: true,
    battlecry: {
      type: "summon_all_totems_buff",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95052,
    name: "Trident of the Deep",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 4 damage to all enemies. Summon a 4/4 Hippocampus with Lifesteal and Rush.",
    flavorText: "Poseidon strikes the earth and seas obey. He strikes again and the earth splits open.",
    keywords: ["battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    race: "Elemental",
    linkedHeroId: "hero-poseidon",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_summon",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // KNIGHT - ROGUE CLASS (6 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95053,
    name: "Unbound Wolf of Ragnarok",
    manaCost: 10,
    attack: 10,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Transform into a copy of the strongest enemy minion. Gain +2/+2 and 'Can't be targeted by spells.' Deathrattle: Return to hand.",
    flavorText: "When Gleipnir snaps, Fenrir will swallow Odin whole. Even the Allfather cannot escape fate.",
    keywords: ["rush", "battlecry", "deathrattle"],
    heroClass: "rogue",
    class: "Rogue",
    race: "Beast",
    linkedHeroId: "hero-loki",
    isSuperMinion: true,
    battlecry: {
      type: "copy_strongest_buff",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "return_to_hand"
    },
    collectible: true
  },
  {
    id: 95054,
    name: "Mistletoe Arrow",
    manaCost: 10,
    attack: 8,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Battlecry: Deal 8 damage randomly split among enemies. If any die, gain Stealth again.",
    flavorText: "Loki guided blind Hodr's hand. The dart flew true. Baldur fell, and the world wept.",
    keywords: ["stealth", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    linkedHeroId: "hero-hoder",
    isSuperMinion: true,
    battlecry: {
      type: "damage_split_restealth",
      value: 8,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95055,
    name: "Níðhöggr, Corpse-Gnawer",
    manaCost: 10,
    attack: 9,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Poisonous. Battlecry: Destroy all enemy minions with Deathrattle. Gain +1/+1 for each destroyed.",
    flavorText: "It gnaws eternally at Yggdrasil's deepest root. When the root breaks, the tree falls, and all the realms with it.",
    keywords: ["poisonous", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    race: "Dragon",
    linkedHeroId: "hero-gormr",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_deathrattle_buff",
      value: 1,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95056,
    name: "Serpent of the Nine Waves",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Battlecry: Copy the lowest-cost card in opponent's hand 3 times. Your copies cost (0).",
    flavorText: "Nine mothers bore Heimdall at the edge of the world, where the waves crash against the sky.",
    keywords: ["stealth", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    race: "Beast",
    linkedHeroId: "hero-lirien",
    isSuperMinion: true,
    battlecry: {
      type: "copy_lowest_free",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95057,
    name: "Caduceus, Staff of Messengers",
    manaCost: 9,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Return a friendly minion to your hand. It costs (0). Draw 3 cards. Combo: Take an extra turn.",
    flavorText: "Hermes carries it between Olympus and the underworld. Two serpents twine around it, and all doors open.",
    keywords: ["rush", "battlecry", "combo"],
    heroClass: "rogue",
    class: "Rogue",
    linkedHeroId: "hero-hermes",
    isSuperMinion: true,
    battlecry: {
      type: "bounce_free_draw",
      value: 3,
      requiresTarget: true,
      targetType: 'friendly_minion'
    },
    collectible: true
  },
  {
    id: 95058,
    name: "Primordial Shadow of Night",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Battlecry: Give all friendly minions Stealth. Deal 2 damage to all enemies for each Stealthed minion.",
    flavorText: "Nyx, born of Chaos. Even Zeus does not challenge her.",
    keywords: ["stealth", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    linkedHeroId: "hero-nyx",
    isSuperMinion: true,
    battlecry: {
      type: "stealth_all_damage",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // KNIGHT - HUNTER CLASS (6 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95059,
    name: "Fenrisúlfr, Winter's Maw",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Freeze all enemy minions. Deal 2 damage to each. Gain +2/+2 for each Frozen minion.",
    flavorText: "The great wolf's breath freezes rivers. His howl stops hearts. Winter itself is his domain.",
    keywords: ["rush", "battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    race: "Beast",
    linkedHeroId: "hero-skadi",
    isSuperMinion: true,
    battlecry: {
      type: "freeze_damage_buff",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95060,
    name: "Wave Daughters of the Deep",
    manaCost: 10,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Summon 3 random Beasts from your deck. Give them +2/+2 and Rush.",
    flavorText: "Ran's nine daughters are the waves themselves. Each carries sailors to their mother's hall.",
    keywords: ["battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    linkedHeroId: "hero-aegir",
    isSuperMinion: true,
    battlecry: {
      type: "recruit_beasts_buff",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95061,
    name: "Hawk of Thrymheim",
    manaCost: 9,
    attack: 8,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Rush, Windfury. Battlecry: Deal 4 damage to the enemy hero. If they're at 15 or less Health, deal 8 instead.",
    flavorText: "Skadi's hawk circles above the frozen peaks. Its cry carries for leagues across the mountain silence.",
    keywords: ["rush", "windfury", "battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    race: "Beast",
    linkedHeroId: "hero-fjora",
    isSuperMinion: true,
    battlecry: {
      type: "damage_hero_execute",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95062,
    name: "Bow of Ydalir",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal 5 damage. If it kills, repeat on another random enemy until you miss.",
    flavorText: "Ullr draws from a yew as old as time. His first arrow finds its mark. His second never misses.",
    keywords: ["battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    linkedHeroId: "hero-ullr",
    isSuperMinion: true,
    battlecry: {
      type: "chain_damage",
      value: 5,
      requiresTarget: true,
      targetType: 'any'
    },
    collectible: true
  },
  {
    id: 95063,
    name: "Chariot of the Sun",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Deal 3 damage to all enemies. Your hero is Immune to minion damage this turn.",
    flavorText: "Sol's chariot races across the sky, pursued by Skoll. The horses Arvakr and Alsvidr never rest.",
    keywords: ["rush", "battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    linkedHeroId: "hero-apollo",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_immune",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95064,
    name: "Huntress of the Moon",
    manaCost: 10,
    attack: 7,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Battlecry: Summon a 5/5 Moonlit Wolf with Rush. Both gain +1 Attack for each Beast you control.",
    flavorText: "Artemis hunts by moonlight with her silver bow. No beast escapes her, no mortal outpaces her.",
    keywords: ["stealth", "battlecry"],
    heroClass: "hunter",
    class: "Hunter",
    race: "Beast",
    linkedHeroId: "hero-artemis",
    isSuperMinion: true,
    battlecry: {
      type: "summon_beast_synergy",
      value: 5,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // KNIGHT - BERSERKER CLASS (2 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95065,
    name: "Void-Bound Behemoth",
    manaCost: 10,
    attack: 10,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush, Lifesteal. Battlecry: Deal 6 damage to all enemies. Draw cards equal to enemy minions killed.",
    flavorText: "Born in the space between realms. It knows neither mercy nor restraint.",
    keywords: ["rush", "lifesteal", "battlecry"],
    heroClass: "berserker",
    class: "Berserker",
    race: "Titan",
    linkedHeroId: "hero-myrka",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_draw_on_kill",
      value: 6,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95066,
    name: "Alpha of the Twilight Pack",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Rush. Battlecry: Summon a 3/3 Wolf with Rush for each Beast that died this game (max 5). Give all Wolves +2 Attack.",
    flavorText: "The pack follows the alpha into battle and beyond. In death, the wolves run faster.",
    keywords: ["rush", "battlecry"],
    heroClass: "berserker",
    class: "Berserker",
    race: "Beast",
    linkedHeroId: "hero-ylva",
    isSuperMinion: true,
    battlecry: {
      type: "summon_from_dead_beasts",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // JAPANESE HEROES (5 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95067,
    name: "Yomotsu-Shikome",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy all friendly minions. Summon a 4/4 Shade with Rush for each. Deathrattle: Summon 3 Shades.",
    flavorText: "The hags of Yomi pursue the living who dare enter the land of the dead. Izanagi barely escaped them.",
    keywords: ["battlecry", "deathrattle"],
    heroClass: "warlock",
    class: "Warlock",
    linkedHeroId: "hero-izanami",
    isSuperMinion: true,
    battlecry: {
      type: "sacrifice_all_summon",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "summon_multiple",
      summonName: "Shade",
      summonAttack: 4,
      summonHealth: 4,
      count: 3
    },
    collectible: true
  },
  {
    id: 95068,
    name: "Tsukuyomi's Exile",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Battlecry: Give all friendly minions Stealth.",
    flavorText: "Tsukuyomi killed Uke Mochi in rage. Amaterasu banished him to the night. Now he hides all who follow him in shadow.",
    keywords: ["stealth", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    linkedHeroId: "hero-tsukuyomi",
    isSuperMinion: true,
    battlecry: {
      type: "grant_stealth",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95069,
    name: "Divine Wind Storm",
    manaCost: 10,
    attack: 8,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Return all enemy minions to their hand. They cost (2) more.",
    flavorText: "The kamikaze -- the divine wind that scattered the Mongol fleet and saved Japan.",
    keywords: ["battlecry"],
    heroClass: "mage",
    class: "Mage",
    race: "Elemental",
    linkedHeroId: "hero-fujin",
    isSuperMinion: true,
    battlecry: {
      type: "bounce_all_increase_cost",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95070,
    name: "Sarutahiko's Guidance",
    manaCost: 10,
    attack: 9,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Taunt, Divine Shield. Battlecry: Foresee a card from any class.",
    flavorText: "The kami of crossroads guides all travelers. At Sarutahiko's junction, you must choose your path wisely.",
    keywords: ["taunt", "divine_shield", "battlecry"],
    heroClass: "paladin",
    class: "Paladin",
    linkedHeroId: "hero-sarutahiko",
    isSuperMinion: true,
    battlecry: {
      type: "discover",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95071,
    name: "Spirit of Creation",
    manaCost: 10,
    attack: 7,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Summon all 4 basic Totems with +2/+2. Draw a card for each Totem you control.",
    flavorText: "The first breath of the gods, given form. From nothing, everything.",
    keywords: ["battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    linkedHeroId: "hero-kamimusubi",
    isSuperMinion: true,
    battlecry: {
      type: "summon_totems_draw",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // EGYPTIAN HEROES (5 Super Minions)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95072,
    name: "Scales of Ma'at",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy all enemy minions with 4 or less Attack. Gain +2/+2 for each destroyed.",
    flavorText: "The heart of the dead is weighed against her feather. If heavier, Ammit devours it.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    linkedHeroId: "hero-ammit",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_weak_buff",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95073,
    name: "Feather of Truth",
    manaCost: 10,
    attack: 6,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Set all minions' Attack and Health to 3. Draw a card for each enemy affected.",
    flavorText: "Ma'at's feather weighs nothing and everything. It measures the worth of a soul.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-maat",
    isSuperMinion: true,
    battlecry: {
      type: "set_all_stats_draw",
      value: 3,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95074,
    name: "Scorpion's Tail",
    manaCost: 9,
    attack: 8,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Stealth, Poisonous. Battlecry: Deal 4 damage randomly split among enemies. Apply Poison to survivors.",
    flavorText: "Serqet's children guard the desert passages. Their sting carries judgment from the underworld.",
    keywords: ["stealth", "poisonous", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    race: "Beast",
    linkedHeroId: "hero-serqet",
    isSuperMinion: true,
    battlecry: {
      type: "damage_split_poison",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },
  {
    id: 95075,
    name: "Scarab of Eternal Dawn",
    manaCost: 10,
    attack: 6,
    health: 12,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Battlecry: Restore all friendly characters to full Health. Give all friendly minions Reborn.",
    flavorText: "Khepri pushes the sun across the sky each morning. Death is only another sunrise.",
    keywords: ["taunt", "battlecry"],
    heroClass: "priest",
    class: "Priest",
    race: "Beast",
    linkedHeroId: "hero-khepri",
    isSuperMinion: true,
    battlecry: {
      type: "heal_all_grant_reborn",
      value: 99,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // LOKI'S CHILDREN - BONUS SUPER MINIONS
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95077,
    name: "Jörmungandr, the World Serpent",
    manaCost: 10,
    attack: 8,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Poisonous. Battlecry: Deal 2 damage to ALL other minions and apply Poison. Deathrattle: Deal 5 damage to the enemy hero.",
    flavorText: "Thor hauled it from the deep once. Hymir cut the line in terror. Next time, neither will survive.",
    keywords: ["poisonous", "battlecry", "deathrattle"],
    heroClass: "rogue",
    class: "Rogue",
    race: "Beast",
    linkedHeroId: "hero-loki",
    isSuperMinion: true,
    battlecry: {
      type: "damage_all_poison",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    deathrattle: {
      type: "damage_enemy_hero",
      value: 5
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // MYTHIC COMPANION BEASTS - BONUS SUPER MINIONS
  // Gods with legendary creature companions from mythology
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 95078,
    name: "Gulltoppr, the Golden-Maned",
    manaCost: 10,
    attack: 6,
    health: 12,
    type: "minion",
    rarity: "mythic",
    description: "Divine Shield. Taunt. Battlecry: Give all friendly minions Divine Shield.",
    flavorText: "Heimdall's horse, swift as light across the Bifrost. Its golden mane blazes like the dawn.",
    keywords: ["divine_shield", "taunt", "battlecry"],
    heroClass: "paladin",
    class: "Paladin",
    race: "Beast",
    linkedHeroId: "hero-heimdall",
    isSuperMinion: true,
    battlecry: {
      type: "buff_all_friendly_divine_shield",
      value: 0,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  {
    id: 95079,
    name: "The Ceryneian Hind",
    manaCost: 9,
    attack: 5,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Rush. Deathrattle: Draw 2 cards and deal 3 damage to the enemy hero.",
    flavorText: "Sacred to Artemis, with golden antlers and bronze hooves. Heracles chased it for a full year before he caught it.",
    keywords: ["stealth", "rush", "deathrattle"],
    heroClass: "hunter",
    class: "Hunter",
    race: "Beast",
    linkedHeroId: "hero-artemis",
    isSuperMinion: true,
    deathrattle: {
      type: "draw_and_damage_hero",
      value: 2,
      damage: 3
    },
    collectible: true
  },

  {
    id: 95080,
    name: "Hildisvíni, the Battle Boar",
    manaCost: 10,
    attack: 7,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Lifesteal. Rush. Battlecry: Give all friendly minions +2 Attack and Lifesteal.",
    flavorText: "Freya rides Hildisvíni into battle. The boar was once her faithful servant Ottar, transformed by her magic.",
    keywords: ["lifesteal", "rush", "battlecry"],
    heroClass: "priest",
    class: "Priest",
    race: "Beast",
    linkedHeroId: "hero-freya",
    isSuperMinion: true,
    battlecry: {
      type: "buff_all_friendly_attack_lifesteal",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  {
    id: 95081,
    name: "Hippocampus, Steed of the Depths",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Windfury. Battlecry: Freeze all enemy minions. Deal 2 damage to the enemy hero for each frozen minion.",
    flavorText: "Half horse, half fish. Poseidon's steeds pull his chariot through the deep.",
    keywords: ["windfury", "battlecry"],
    heroClass: "shaman",
    class: "Shaman",
    race: "Elemental",
    linkedHeroId: "hero-poseidon",
    isSuperMinion: true,
    battlecry: {
      type: "freeze_all_damage_hero",
      value: 2,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  // ═══════════════════════════════════════════════════════════════
  // GREEK ALT-SKIN HEROES (3 Super Minions)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 95082,
    name: "Endymion, the Eternal Dreamer",
    manaCost: 10,
    attack: 8,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Stealth. Battlecry: Give all friendly minions Stealth. At end of your turn, deal 3 damage to a random enemy for each stealthed friendly minion.",
    flavorText: "Selene loved him so deeply she asked Zeus to grant him eternal sleep -- so he would never age, never leave her.",
    keywords: ["stealth", "battlecry"],
    heroClass: "rogue",
    class: "Rogue",
    linkedHeroId: "hero-selene",
    isSuperMinion: true,
    battlecry: {
      type: "stealth_all_friendly",
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  {
    id: 95083,
    name: "Empusa, Queen of the Crossroads",
    manaCost: 10,
    attack: 9,
    health: 9,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Destroy all enemy minions with 4 or less Attack. Summon a 3/3 Shade with Lifesteal for each destroyed. Your hero power costs (0) next turn.",
    flavorText: "Hecate's servant with a leg of bronze and a leg of flame. She drinks the blood of travelers at midnight.",
    keywords: ["battlecry"],
    heroClass: "warlock",
    class: "Warlock",
    race: "Undead",
    linkedHeroId: "hero-hecate",
    isSuperMinion: true,
    battlecry: {
      type: "destroy_low_attack_summon_shades",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  },

  {
    id: 95084,
    name: "Phaethon, Rider of the Dawn",
    manaCost: 10,
    attack: 7,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Restore all friendly characters to full Health. Deal 4 damage to all enemies. At end of your turn, restore 3 Health to all friendly characters.",
    flavorText: "He begged his father Helios for the sun chariot. He could not control it. Zeus struck him down to save the world.",
    keywords: ["battlecry"],
    heroClass: "priest",
    class: "Priest",
    linkedHeroId: "hero-helios",
    isSuperMinion: true,
    battlecry: {
      type: "full_heal_and_aoe",
      value: 4,
      requiresTarget: false,
      targetType: 'none'
    },
    collectible: true
  }
];

export default heroSuperMinions;

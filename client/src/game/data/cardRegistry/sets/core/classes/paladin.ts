import { CardData } from '../../../../../types';

export const paladinCards: CardData[] = [
  {
    id: 8001,
    name: "Baldur's Champion",
    manaCost: 8,
    attack: 6,
    health: 6,
    description: "Divine Shield. Taunt. Deathrattle: Equip a 5/3 Luminous Blade.",
    flavorText: "He carries the light of Baldur into battle. No shadow survives his approach.",
    type: "minion",
    rarity: 'epic',
    class: "Paladin",
    keywords: ["divine_shield", "taunt", "deathrattle"],
    collectible: true,
    set: "core"
  },
  {
    id: 8002,
    name: "Heimdall's Judgment",
    manaCost: 4,
    description: "Deal 2 damage to all enemies.",
    flavorText: "Even the watchman of the gods has a breaking point.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "aoe_damage",
      value: 2,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8003,
    name: "Sword of Tyr",
    manaCost: 4,
    attack: 4,
    durability: 2,
    description: "Whenever your hero attacks, restore 2 Health to it.",
    flavorText: "Each wound it heals was earned in the service of justice.",
    type: "weapon",
    rarity: "common",
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  {
    id: 8004,
    name: "Blessing of Odin",
    manaCost: 4,
    description: "Give a minion +4/+4.",
    flavorText: "The Allfather's blessing is rare, but absolute.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "buff",
      buffAttack: 4,
      buffHealth: 4,
      requiresTarget: true,
      targetType: "friendly_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8005,
    name: "Balance of Themis",
    manaCost: 2,
    description: "Change the Health of ALL minions to 1.",
    flavorText: "Themis holds the scales. All are measured. All are found wanting.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "set_health",
      value: 1,
      targetType: "all_minions",
      requiresTarget: false
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8006,
    name: "Touch of Eir",
    manaCost: 8,
    description: "Restore 8 Health. Draw 3 cards.",
    flavorText: "Eir's fingers find the wound before the warrior feels it.",
    type: "spell",
    rarity: "rare",
    class: "Paladin",
    spellEffect: {
      type: "heal",
      value: 8,
      drawCards: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8007,
    name: "Baldur's Radiance",
    manaCost: 2,
    description: "Restore 6 Health.",
    flavorText: "The light that cannot be dimmed, cast by the god who could not be harmed — until he was.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "heal",
      value: 6,
      targetType: "any"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8008,
    name: "Blessing of Freya",
    manaCost: 3,
    description: "Draw cards until you have as many in hand as your opponent.",
    flavorText: "Freya gives generously to those she favors. Her favor is not easily won.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  {
    id: 8009,
    name: "Thor's Wrath",
    manaCost: 4,
    description: "Deal 3 damage. Draw a card.",
    flavorText: "He threw it once and leveled a mountain. This was considered restraint.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "damage",
      value: 3,
      drawCards: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8010,
    name: "Odin's Vengeance",
    manaCost: 6,
    description: "Deal 8 damage randomly split among all enemies.",
    flavorText: "When the Allfather unleashes his fury, even the other gods take cover.",
    type: "spell",
    rarity: "rare",
    class: "Paladin",
    spellEffect: {
      type: "random_damage",
      missiles: 8,
      damagePerMissile: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8011,
    name: "Strength of Thor",
    manaCost: 1,
    description: "Give a minion +3 Attack.",
    flavorText: "The belt Megingjord doubles his strength. With it, no door stays closed.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8012,
    name: "Baldur's Ward",
    manaCost: 1,
    description: "Give a minion Divine Shield.",
    flavorText: "Nothing in all the Nine Realms can harm the bearer — save mistletoe.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "grant_keyword",
      keyword: "divine_shield",
      targetType: "friendly_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8013,
    name: "Rune of Submission",
    manaCost: 1,
    description: "Change a minion's Attack to 1.",
    flavorText: "The rune binds the will. Resistance is a matter of opinion.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "set_attack",
      value: 1,
      targetType: "any_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8014,
    name: "Divine Retribution",
    manaCost: 1,
    description: "Rune: When your opponent plays a minion, reduce its Health to 1.",
    flavorText: "The gods remember every slight. They repay them with interest.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    keywords: ["secret"],
    collectible: true,
    set: "core"
  },
  {
    id: 8015,
    name: "Resurrection Rune",
    manaCost: 1,
    description: "Rune: When a friendly minion dies, return it to life with 1 Health.",
    flavorText: "Death is a door. This rune holds it open — briefly.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    keywords: ["secret"],
    collectible: true,
    set: "core"
  },
  {
    id: 8016,
    name: "Einherjar's Valor",
    manaCost: 1,
    description: "Rune: When an enemy attacks, summon a 2/1 Defender as the new target.",
    flavorText: "The rune shimmers, and from Valhalla's halls a warrior steps forth.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    keywords: ["secret"],
    collectible: true,
    set: "core"
  },
  {
    id: 8540,
    name: "Luminous Blade",
    manaCost: 5,
    attack: 5,
    durability: 3,
    description: "Mythic weapon wielded by Baldur's Champion.",
    flavorText: "Baldur's blade burns with the light of the unconquered sun.",
    type: "weapon",
    rarity: 'epic',
    class: "Paladin",
    collectible: false,
    set: "core"
  },
  {
    id: 8502,
    name: "Einherjar Recruit",
    manaCost: 1,
    attack: 1,
    health: 1,
    description: "Summoned by the Paladin Hero Power.",
    flavorText: "Fresh from Valhalla's mead hall. Eager, if unsteady.",
    type: "minion",
    rarity: "common",
    class: "Paladin",
    collectible: false,
    set: "core"
  },
  {
    id: 20018,
    name: "Radiant Paragon of Baldur",
    manaCost: 8,
    attack: 6,
    health: 8,
    type: "minion",
    rarity: "mythic",
    description: "Taunt. Deathrattle: Equip a 5/2 Corrupted Ashbringer that gives your other minions +2 Attack.",
    flavorText: "The beloved god of light, whose death heralds Ragnarok.",
    keywords: ["taunt", "deathrattle"],
    class: "Paladin",
    collectible: true,
    set: "core",
    deathrattle: {
      type: "summon",
      targetType: "none"
    }
  },
  {
    id: 20023,
    name: "Echo of the War Maiden",
    manaCost: 7,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: "epic",
    description: "Battlecry: Add a copy of each spell you've cast on friendly characters this game to your hand.",
    flavorText: "Wisdom endures beyond the goddess — every blessing cast is remembered.",
    keywords: ["battlecry"],
    class: "Paladin",
    collectible: true,
    set: "core",
    battlecry: {
      type: "draw",
      requiresTarget: false,
      targetType: "none",
      value: 1
    }
  },
  {
    id: 20404,
    name: "Undying Steed of Pegasus",
    manaCost: 7,
    attack: 7,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Rush, Divine Shield. Can't be targeted by spells or Hero Powers.",
    flavorText: "The divine winged horse born from Medusa's blood.",
    keywords: ["rush", "divine_shield"],
    race: "Beast",
    class: "Paladin",
    cantBeTargetedBySpells: true,
    collectible: true,
    set: "core"
  },
  {
    id: 20406,
    name: "Theseus, the Equalizer",
    manaCost: 6,
    attack: 3,
    health: 7,
    type: "minion",
    rarity: 'epic',
    description: "Battlecry: Set all other minions' Attack and Health to 3.",
    flavorText: "The hero who slew the Minotaur brought balance to the arena.",
    keywords: ["battlecry"],
    class: "Paladin",
    collectible: true,
    set: "core",
    battlecry: {
      type: "set_stats",
      requiresTarget: false,
      targetType: "all_other_minions",
      setAttack: 3,
      setHealth: 3
    }
  },
  // === Echo Card ===
  {
    id: 47431,
    name: "Ring the Gjallarhorn!",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Give a minion +1/+2. Echo",
    flavorText: "One blast for warning. Two for war. Three for the end of all things.",
    keywords: ["echo"],
    class: "Paladin",
    spellEffect: {
      type: "buff",
      requiresTarget: true,
      targetType: "any_minion",
      buffAttack: 1,
      buffHealth: 2
    },
    collectible: true,
    set: "core"
  },
  // === Dormant Card ===
  {
    id: 10006,
    name: "Bound Sun-Serpent",
    manaCost: 1,
    attack: 2,
    health: 1,
    type: "minion",
    rarity: "common",
    race: "Naga",
    description: "Dormant for 2 turns. When this awakens, summon two 1/1 Nagas.",
    flavorText: "Apollo's golden serpent, coiled in slumber beneath the waves.",
    keywords: ["dormant"],
    class: "Paladin",
    collectible: true,
    set: "core",
    dormantTurns: 2,
    awakenEffect: {
      type: "summon",
      summonCount: 2,
      value: 1
    }
  },
  // === Reborn Card ===
  {
    id: 19004,
    name: "Ancestral Guardian",
    manaCost: 4,
    attack: 4,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Lifesteal, Reborn",
    flavorText: "It died protecting its charge. It continues to do so.",
    keywords: ["lifesteal", "reborn"],
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  // === Spellburst Card ===
  {
    id: 18003,
    name: "Shieldmaiden Sigrid",
    manaCost: 3,
    attack: 4,
    health: 2,
    type: "minion",
    rarity: "epic",
    description: "Divine Shield. Spellburst: Gain Divine Shield.",
    flavorText: "Her shield catches spells like a net catches fish. She never flinches.",
    keywords: ["divine_shield", "spellburst"],
    class: "Paladin",
    spellburstEffect: {
      type: "buff",
      targetType: "self",
      consumed: false
    },
    collectible: true,
    set: "core"
  },
  // === Magnetic Card ===
  {
    id: 20008,
    name: "Rune-Tron",
    manaCost: 1,
    attack: 1,
    health: 3,
    type: "minion",
    rarity: "common",
    race: "Automaton",
    description: "Runic Bond",
    flavorText: "An automaton inscribed with runes of binding. It draws allies to itself like a magnet.",
    keywords: ["magnetic"],
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  // === 2-Mana Class Minions (filling early-game gap) ===
  {
    id: 8530,
    name: "Baldur's Acolyte",
    manaCost: 2,
    attack: 2,
    health: 2,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Restore 2 Health to your hero.",
    flavorText: "Even the smallest light of Baldur can mend a wound.",
    keywords: ["battlecry"],
    class: "Paladin",
    battlecry: {
      type: "heal",
      value: 2,
      requiresTarget: false,
      targetType: "friendly_hero"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 8531,
    name: "Shieldbearer of Tyr",
    manaCost: 2,
    attack: 1,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Divine Shield",
    flavorText: "Tyr lost his hand to Fenrir, but his shield-bearers never falter.",
    keywords: ["divine_shield"],
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  // === Migrated from additionalClassMinions.ts ===
  {
    id: 40005,
    name: "Heimdall's Warden",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Change an enemy minion's Attack to 1.",
    flavorText: "The guardian of the rainbow bridge enforces peace—or brings divine judgment.",
    keywords: ["battlecry"],
    class: "Paladin",
    battlecry: {
      type: "debuff",
      requiresTarget: true,
      targetType: "enemy_minion",
      setAttack: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40006,
    name: "Sol's Walker",
    manaCost: 6,
    attack: 4,
    health: 5,
    type: "minion",
    rarity: "common",
    description: "Taunt, Divine Shield",
    flavorText: "She walks in the radiant light of Sol, the Norse sun goddess.",
    keywords: ["taunt", "divine_shield"],
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  // === New Holy Spell ===
  {
    id: 8520,
    name: "Gleaming Aura",
    manaCost: 3,
    type: "spell",
    rarity: "common",
    description: "Give a friendly minion +2 Health and Divine Shield.",
    flavorText: "A shimmering light guards the worthy.",
    keywords: [],
    class: "Paladin",
    spellEffect: {
      type: "buff",
      buffHealth: 2,
      grantKeywords: ["divine_shield"],
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40030,
    name: "Asgard Squire",
    manaCost: 3,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Give a friendly minion Divine Shield.",
    flavorText: "Trained in the golden halls, every squire learns to call upon Asgard's light.",
    keywords: ["battlecry"],
    class: "Paladin",
    battlecry: {
      type: "grant_keyword",
      keyword: "divine_shield",
      requiresTarget: true,
      targetType: "friendly_minion"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40031,
    name: "Consecration Knight",
    manaCost: 3,
    attack: 3,
    health: 3,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Deal 1 damage to all enemy minions.",
    flavorText: "Her blade hums with the fury of Bifrost, scorching all who stand against the Nine Realms.",
    keywords: ["battlecry"],
    class: "Paladin",
    battlecry: {
      type: "aoe_damage",
      value: 1,
      requiresTarget: false,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 40032,
    name: "Valkyrie Protector",
    manaCost: 4,
    attack: 3,
    health: 5,
    type: "minion",
    rarity: "common",
    description: "Taunt. Divine Shield.",
    flavorText: "She descends from Valhalla not to claim the fallen, but to shield the living.",
    keywords: ["taunt", "divine_shield"],
    class: "Paladin",
    collectible: true,
    set: "core"
  },
  {
    id: 40033,
    name: "Lightsworn Champion",
    manaCost: 5,
    attack: 4,
    health: 4,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: Restore 4 Health to your hero. Draw a card.",
    flavorText: "Sworn to Baldur's eternal radiance, his presence mends wounds and reveals forgotten truths.",
    keywords: ["battlecry"],
    class: "Paladin",
    battlecry: {
      type: "heal",
      value: 4,
      requiresTarget: false,
      targetType: "friendly_hero",
      drawCards: 1
    },
    collectible: true,
    set: "core"
  },

  // ═══════════════════════════════════════════════════════════════
  // PALADIN EXPANSION (6 new cards — curve and depth)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 36401,
    name: "Shield of Valhalla",
    manaCost: 2,
    description: "Give a minion Divine Shield. Draw a card.",
    flavorText: "Forged from Valhalla's gate. It cannot be broken by mortal hands.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "grant_divine_shield_draw",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36402,
    name: "Asgardian Defender",
    manaCost: 3,
    attack: 2,
    health: 4,
    description: "Taunt. Divine Shield. Battlecry: Gain +1 Attack for each other friendly minion with Divine Shield.",
    flavorText: "For every shield raised beside him, his resolve hardens.",
    type: "minion",
    rarity: "rare",
    class: "Paladin",
    keywords: ["taunt", "divine_shield", "battlecry"],
    battlecry: {
      type: "buff_from_divine_shield_count",
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36403,
    name: "Bifrost Justicar",
    manaCost: 6,
    attack: 5,
    health: 6,
    description: "Battlecry: Set all friendly minions' Health to their maximum Health. Give them +2/+2.",
    flavorText: "She judges friend and foe alike. Her verdicts are final.",
    type: "minion",
    rarity: "epic",
    class: "Paladin",
    keywords: ["battlecry"],
    battlecry: {
      type: "full_heal_and_buff_all",
      value: 2,
      targetType: "all_friendly_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36404,
    name: "Baldr's Blessing",
    manaCost: 8,
    description: "Give all friendly minions Divine Shield, Taunt, and +2/+2.",
    flavorText: "Baldur's final gift to the world before his death — a light that never fades.",
    type: "spell",
    rarity: "epic",
    class: "Paladin",
    spellEffect: {
      type: "mass_buff_divine_shield_taunt",
      value: 2,
      targetType: "all_friendly_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36405,
    name: "Shieldmaiden Recruit",
    manaCost: 1,
    attack: 1,
    health: 2,
    description: "Divine Shield.",
    flavorText: "Her shield is bigger than she is. Her courage is bigger still.",
    type: "minion",
    rarity: "common",
    class: "Paladin",
    keywords: ["divine_shield"],
    collectible: true,
    set: "core"
  },
  {
    id: 36406,
    name: "Judgment of the Aesir",
    manaCost: 4,
    description: "Deal 4 damage to a minion. If it dies, summon a 2/2 with Divine Shield.",
    flavorText: "The gods judge. The guilty burn. The righteous are spared.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "damage_summon_on_kill",
      value: 4,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  // === Token & Divine Shield Expansion ===
  {
    id: 38301,
    name: "Call to Valhalla",
    manaCost: 3,
    description: "Summon three 1/1 Einherjar Recruits with Divine Shield.",
    flavorText: "The horn sounds, and three warriors answer. They have died before. They do not fear it.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "summon_token",
      value: 3,
      summonName: "Einherjar Recruit",
      summonAttack: 1,
      summonHealth: 1,
      grantKeywords: ["divine_shield"]
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38302,
    name: "Valhalla's Decree",
    manaCost: 4,
    description: "Give all friendly minions +1/+1. If you have 3+ minions, also give them Divine Shield.",
    flavorText: "The golden halls lend their power. Every shield gleams brighter.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "buff_conditional",
      buffAttack: 1,
      buffHealth: 1,
      condition: "minion_count_3",
      bonusKeyword: "divine_shield",
      targetType: "all_friendly_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38303,
    name: "Baldur's Hammer",
    manaCost: 4,
    attack: 4,
    durability: 2,
    description: "Divine Shield (first hit takes no durability loss).",
    flavorText: "The first strike is always shielded. The second never needs to be.",
    type: "weapon",
    rarity: "common",
    class: "Paladin",
    keywords: ["divine_shield"],
    collectible: true,
    set: "core"
  },
  {
    id: 38304,
    name: "Shieldmaiden of Asgard",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Battlecry: Summon a 1/1 Einherjar Recruit.",
    flavorText: "Where she stands, others rally. Where she falls, legends begin.",
    type: "minion",
    rarity: "common",
    class: "Paladin",
    keywords: ["battlecry"],
    battlecry: {
      type: "summon_token",
      summonName: "Einherjar Recruit",
      summonAttack: 1,
      summonHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38305,
    name: "Valkyrie Quartermaster",
    manaCost: 5,
    attack: 2,
    health: 5,
    description: "Battlecry: Give all 1/1 minions +2/+2.",
    flavorText: "She inspects each recruit. Those she deems worthy become something more.",
    type: "minion",
    rarity: "rare",
    class: "Paladin",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_tokens",
      targetType: "all_1_1_minions",
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38306,
    name: "Oathkeeper of Tyr",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Divine Shield. After this minion loses Divine Shield, gain +2/+2.",
    flavorText: "He swore an oath on Tyr's name. When his shield broke, his resolve did not.",
    type: "minion",
    rarity: "common",
    class: "Paladin",
    keywords: ["divine_shield"],
    triggerEffect: {
      type: "self_buff",
      trigger: "lose_divine_shield",
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38307,
    name: "Libram of Radiance",
    manaCost: 6,
    description: "Restore a minion to full Health. Give it Divine Shield and +4/+4.",
    flavorText: "Written by Baldur before his death. Each page glows with imperishable light.",
    type: "spell",
    rarity: "rare",
    class: "Paladin",
    spellEffect: {
      type: "heal_and_buff",
      targetType: "friendly_minion",
      requiresTarget: true,
      buffAttack: 4,
      buffHealth: 4,
      grantKeywords: ["divine_shield"]
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38308,
    name: "Týr's Judgment",
    manaCost: 8,
    attack: 6,
    health: 8,
    description: "Taunt. Divine Shield. Battlecry: Set all enemy minions' Attack to 1.",
    flavorText: "Tyr lost his hand to bind Fenrir. His justice demands sacrifice.",
    type: "minion",
    rarity: 'epic',
    class: "Paladin",
    keywords: ["taunt", "divine_shield", "battlecry"],
    battlecry: {
      type: "set_attack",
      value: 1,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  // === Draw & Removal Expansion ===
  {
    id: 36407,
    name: "Rune of Forseti",
    manaCost: 2,
    description: "Draw a card. If you control a minion with Divine Shield, draw 2 instead.",
    flavorText: "Forseti settles all disputes. His rune grants clarity to those who seek it.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "conditional_draw",
      value: 1,
      condition: "friendly_has_divine_shield",
      bonusValue: 2,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36408,
    name: "Mjolnir's Echo",
    manaCost: 3,
    description: "Destroy a minion with 4 or less Attack. Gain 2 Armor.",
    flavorText: "The thunder rolls long after the hammer strikes.",
    type: "spell",
    rarity: "common",
    class: "Paladin",
    spellEffect: {
      type: "conditional_destroy",
      condition: "attack_4_or_less",
      targetType: "any_minion",
      requiresTarget: true,
      bonusEffect: {
        type: "gain_armor",
        value: 2
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36409,
    name: "Saga-Keeper",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Whenever you cast a spell on a friendly minion, draw a card.",
    flavorText: "She records every deed in golden ink. Her pages never run out.",
    type: "minion",
    rarity: "common",
    class: "Paladin",
    collectible: true,
    set: "core"
  }
];

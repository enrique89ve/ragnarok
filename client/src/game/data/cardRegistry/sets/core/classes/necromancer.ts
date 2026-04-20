import { CardData } from '../../../../../types';

export const necromancerCards: CardData[] = [
  {
    id: 4000,
    name: "Bone Collector",
    manaCost: 2,
    attack: 1,
    health: 2,
    description: "Battlecry: Gain +1/+1 for each Undead in your graveyard.",
    flavorText: "The bones remember who they were in life. And they miss it.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_from_graveyard_count",
      condition: { check: "graveyard_count", race: "Undead", minimum: 1 },
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4001,
    name: "Grave Robber",
    manaCost: 3,
    attack: 3,
    health: 3,
    description: "Battlecry: Foresee a minion that died this game.",
    flavorText: "One man's grave is another man's treasure chest.",
    type: "minion",
    rarity: "rare",
    class: "Necromancer",
    keywords: ["battlecry"],
    battlecry: {
      type: "discover_from_graveyard",
      condition: { check: "graveyard_size", minimum: 1 },
      discoveryCount: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4002,
    name: "Skeletal Lord",
    manaCost: 6,
    attack: 5,
    health: 5,
    description: "Battlecry: Summon a 2/2 Skeleton for each minion in your graveyard (up to 3).",
    flavorText: "He's assembled quite the workforce.",
    type: "minion",
    rarity: "epic",
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "summon_skeletons_based_on_graveyard",
      value: 3,
      summonCardId: 4900
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4003,
    name: "Death's Harvester",
    manaCost: 4,
    attack: 3,
    health: 5,
    description: "Whenever a friendly minion dies, gain +1/+1.",
    flavorText: "Death fuels his power. It's a sustainable resource.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    collectible: true,
    set: "core"
  },
  {
    id: 4004,
    name: "Grave Pact",
    manaCost: 5,
    attack: 4,
    health: 4,
    description: "Deathrattle: Summon the highest cost minion that died this game.",
    flavorText: "Death is just a temporary setback.",
    type: "minion",
    rarity: "epic",
    class: "Necromancer",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "summon_highest_cost_from_graveyard",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4006,
    name: "Skeletal Warrior",
    manaCost: 2,
    attack: 2,
    health: 1,
    description: "Deathrattle: Summon a 1/1 Skeleton.",
    flavorText: "Even in death, it raises more to serve.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "summon_token",
      summonCardId: 4900,
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4007,
    name: "Banshee",
    manaCost: 3,
    attack: 3,
    health: 2,
    description: "Battlecry: Silence a minion.",
    flavorText: "Her scream silences the living and the dead.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "silence",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4009,
    name: "Lich Queen",
    manaCost: 9,
    attack: 4,
    health: 8,
    description: "At the end of your turn, resurrect a friendly minion that died this game.",
    flavorText: "Her reign is eternal, her servants undying.",
    type: "minion",
    rarity: 'rare',
    class: "Necromancer",
    race: "Undead",
    collectible: true,
    set: "core"
  },
  {
    id: 4010,
    name: "Death Knight",
    manaCost: 5,
    attack: 4,
    health: 5,
    description: "Battlecry: Destroy a minion and gain its Attack and Health.",
    flavorText: "A warrior reborn, fueled by the souls of the slain.",
    type: "minion",
    rarity: 'epic',
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "consume_target",
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4011,
    name: "Ghoul",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Battlecry: If your graveyard has at least 3 minions, gain +2/+2.",
    flavorText: "It feasts on the fallen, growing with each bite.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_conditional",
      condition: { check: "graveyard_size", minimum: 3 },
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4100,
    name: "Raise Dead",
    manaCost: 2,
    description: "Summon a random minion that died this game.",
    flavorText: "Some say it's unnatural to raise the dead. Necromancers say it's recycling.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "summon_from_graveyard",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4105,
    name: "Soul Drain",
    manaCost: 4,
    description: "Deal 3 damage to a minion. If it dies, restore 3 health to your hero.",
    flavorText: "Life for life, death for power.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "damage",
      targetType: "any_minion",
      value: 3,
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4106,
    name: "Undead Horde",
    manaCost: 6,
    description: "Summon three 2/2 Zombies.",
    flavorText: "The dead rise in numbers too great to count.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "summon_multiple",
      targetType: "none",
      summonCardId: 4901,
      count: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4108,
    name: "Death's Embrace",
    manaCost: 2,
    description: "Give a minion +2/+2. If it's Undead, give it +3/+3 instead.",
    flavorText: "The touch of death empowers the lifeless.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "buff",
      targetType: "any_minion",
      value: 2,
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4109,
    name: "Dark Ritual",
    manaCost: 1,
    description: "Sacrifice a minion to draw two cards.",
    flavorText: "Power demands sacrifice.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "sacrifice",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4110,
    name: "Eternal Servitude",
    manaCost: 4,
    description: "Foresee a minion from your graveyard and summon it.",
    flavorText: "Service beyond death is the ultimate loyalty.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "discover_and_summon_from_graveyard",
      targetType: "none",
      discoveryCount: 3
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4111,
    name: "Mass Resurrection",
    manaCost: 7,
    description: "Summon three random friendly minions that died this game.",
    flavorText: "The battlefield trembles as the dead return en masse.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "resurrect_multiple",
      targetType: "none",
      count: 3
    },
    collectible: true,
    set: "core"
  },
  // ===== NEW NECROMANCER SPELLS =====
  {
    id: 4112,
    name: "Corpse Explosion",
    manaCost: 3,
    description: "Destroy a friendly minion. Deal damage equal to its Attack to all enemies.",
    flavorText: "In death, they serve one final, explosive purpose.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "sacrifice_and_aoe_damage",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4113,
    name: "Soul Siphon",
    manaCost: 3,
    description: "Lifesteal. Deal 3 damage to a minion.",
    flavorText: "The soul departs, and the necromancer grows stronger.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    keywords: ["lifesteal"],
    spellEffect: {
      type: "damage",
      targetType: "any_minion",
      value: 3,
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4114,
    name: "Bone Armor",
    manaCost: 2,
    description: "Gain Armor equal to the number of minions in your graveyard.",
    flavorText: "The fallen shield the living... or what passes for living.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "gain_armor_from_graveyard",
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4115,
    name: "Wither",
    manaCost: 1,
    description: "Give an enemy minion -3 Attack.",
    flavorText: "Flesh rots, strength fades, hope dies.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "debuff_attack",
      targetType: "enemy_minion",
      value: -3,
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4116,
    name: "Plague of Undeath",
    manaCost: 5,
    description: "Give all enemy minions 'Deathrattle: Summon a 2/1 Skeleton for your opponent.'",
    flavorText: "Every death feeds the necromancer's army.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "grant_deathrattle_to_enemies",
      targetType: "all_enemy_minions",
      grantedDeathrattle: {
        type: "summon_for_opponent",
        summonCardId: 4900
      }
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4117,
    name: "Ghastly Visage",
    manaCost: 3,
    description: "Return an enemy minion to its owner's hand. It costs (2) more.",
    flavorText: "The terror of death made manifest sends even the bravest fleeing.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "bounce_and_cost_increase",
      targetType: "enemy_minion",
      value: 2,
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4118,
    name: "Necrotic Bolt",
    manaCost: 2,
    description: "Deal 2 damage. If a minion died this turn, deal 4 instead.",
    flavorText: "Death begets death.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "damage_conditional",
      targetType: "any",
      value: 2,
      bonusValue: 4,
      condition: { check: "minion_died_this_turn" },
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4119,
    name: "Army of Bones",
    manaCost: 8,
    description: "Fill your board with 2/1 Skeletons with Rush.",
    flavorText: "The earth itself vomits forth an endless legion.",
    type: "spell",
    rarity: 'rare',
    class: "Necromancer",
    spellEffect: {
      type: "fill_board",
      targetType: "none",
      summonCardId: 4900
    },
    collectible: true,
    set: "core"
  },
  {
    id: 4200,
    name: "Soulbound Dagger",
    manaCost: 2,
    attack: 2,
    durability: 2,
    description: "After your hero attacks, add a random minion from your graveyard to your hand.",
    flavorText: "Bound to the souls it has claimed.",
    type: "weapon",
    rarity: "common",
    class: "Necromancer",
    collectible: true,
    set: "core"
  },
  {
    id: 4900,
    name: "Skeleton",
    manaCost: 1,
    attack: 2,
    health: 1,
    description: "Rush",
    flavorText: "What it lacks in flesh, it makes up for in determination.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["rush"],
    collectible: false,
    set: "core"
  },
  {
    id: 4901,
    name: "Zombie",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Summoned by Necromancer spells.",
    flavorText: "It moves slowly, but it never stops coming.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    collectible: false,
    set: "core"
  },

  // ═══════════════════════════════════════════════════════════════
  // NECROMANCER EXPANSION (12 new cards — mythics, mana 5+ finishers)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 36101,
    name: "Lich of the Barrow",
    manaCost: 5,
    attack: 3,
    health: 6,
    description: "Taunt. Deathrattle: Summon two 2/1 Skeletons with Rush.",
    flavorText: "It guards the burial mound long after the buried have risen and left.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["taunt", "deathrattle"],
    deathrattle: { type: "summon", summonCardId: 4900, value: 2 },
    collectible: true,
    set: "core"
  },
  {
    id: 36102,
    name: "Phylactery",
    manaCost: 4,
    description: "Choose a friendly minion. When it dies, resummon it with full stats.",
    flavorText: "The soul is stored elsewhere. Destroying the body is merely inconvenient.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "grant_resummon",
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36103,
    name: "Mass Raise Dead",
    manaCost: 7,
    description: "Summon 3 random friendly minions that died this game. They have Rush.",
    flavorText: "The graveyard empties. The battlefield fills. The living feel outnumbered.",
    type: "spell",
    rarity: 'rare',
    class: "Necromancer",
    spellEffect: {
      type: "mass_resurrect",
      value: 3,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36104,
    name: "Draugr Overlord",
    manaCost: 8,
    attack: 6,
    health: 8,
    description: "Taunt. Battlecry: Summon a copy of every Undead that died this game (up to 4).",
    flavorText: "It remembers every warrior who fell. It becomes every warrior who fell.",
    type: "minion",
    rarity: 'epic',
    class: "Necromancer",
    race: "Undead",
    keywords: ["taunt", "battlecry"],
    battlecry: {
      type: "resurrect_undead",
      value: 4,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36105,
    name: "Soul Harvest",
    manaCost: 3,
    description: "Destroy a friendly minion. Draw 2 cards and gain 3 Armor.",
    flavorText: "A willing sacrifice feeds two hungers — power and knowledge.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "sacrifice_draw_armor",
      value: 2,
      targetType: "friendly_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36106,
    name: "Bone Golem",
    manaCost: 6,
    attack: 4,
    health: 4,
    description: "Battlecry: Gain +1/+1 for each minion in your graveyard.",
    flavorText: "Every bone belongs to someone who died. The golem carries their grudges.",
    type: "minion",
    rarity: "rare",
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "buff_from_graveyard_count",
      value: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36107,
    name: "Plague of Undeath",
    manaCost: 5,
    description: "Transform all enemy minions into 2/2 Zombies.",
    flavorText: "The living become the dead. The dead become the army.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "transform_all_enemy",
      summonCardId: 4901,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36108,
    name: "Revenant Stalker",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Deathrattle: Return this to your hand. It costs (1) more.",
    flavorText: "You cannot kill what refuses to stay dead. You can only slow it down.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: { type: "return_to_hand_cost_increase", value: 1 },
    collectible: true,
    set: "core"
  },
  {
    id: 36109,
    name: "Death's Emissary",
    manaCost: 7,
    attack: 5,
    health: 7,
    description: "Lifesteal. Whenever a minion dies, gain +2 Attack.",
    flavorText: "Each soul it harvests feeds the next swing.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["lifesteal"],
    collectible: true,
    set: "core"
  },
  {
    id: 36110,
    name: "Bone Spike",
    manaCost: 1,
    description: "Deal 3 damage to a minion. If it dies, summon a 2/1 Skeleton.",
    flavorText: "The bone erupts from the earth. If it kills, it grows another.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "damage_summon_on_kill",
      value: 3,
      summonCardId: 4900,
      targetType: "any_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36111,
    name: "Ghoul Frenzy",
    manaCost: 4,
    description: "Summon three 2/2 Zombies. Give them +1 Attack if you have 4+ minions in your graveyard.",
    flavorText: "They pour from the barrow in a tide of rotting fury.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "summon_conditional_buff",
      value: 3,
      summonCardId: 4901,
      condition: { check: "graveyard_count", minimum: 4 },
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 36112,
    name: "Corpse-Glutton of Nidhogg",
    manaCost: 9,
    attack: 8,
    health: 10,
    description: "Battlecry: Devour all minions in both graveyards. Gain +1/+1 for each. Deathrattle: Summon them all as 1/1 copies.",
    flavorText: "It has fed on the dead since the world began. Its hunger is older than memory.",
    type: "minion",
    rarity: "mythic",
    class: "Necromancer",
    race: "Dragon",
    keywords: ["battlecry", "deathrattle"],
    battlecry: {
      type: "devour_graveyards",
      targetType: "none"
    },
    deathrattle: { type: "summon_devoured_copies" },
    collectible: true,
    set: "core"
  },

  // === Shadow & Mass Resurrection Expansion ===

  {
    id: 38701,
    name: "Shadow Bolt of Hel",
    manaCost: 3,
    description: "Deal 4 damage to a minion.",
    flavorText: "A bolt of pure darkness from Helheim's depths. Where it strikes, nothing grows.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "damage",
      value: 4,
      targetType: "enemy_minion",
      requiresTarget: true
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38702,
    name: "Dark Pact",
    manaCost: 1,
    description: "Destroy a friendly minion. Restore 4 Health to your hero.",
    flavorText: "The servant dies willingly. In Helheim, 'willingly' is a flexible concept.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "destroy_friendly_and_heal",
      targetType: "friendly_minion",
      requiresTarget: true,
      healValue: 4
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38703,
    name: "Mass Resurrection",
    manaCost: 9,
    description: "Summon 3 random friendly minions that died this game.",
    flavorText: "They rise not as they were, but as they are needed.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "mass_resurrect",
      value: 3,
      targetType: "none"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38704,
    name: "Shadow Nova",
    manaCost: 5,
    description: "Deal 3 damage to all enemy minions.",
    flavorText: "Darkness expands in all directions. Light retreats.",
    type: "spell",
    rarity: "common",
    class: "Necromancer",
    spellEffect: {
      type: "damage",
      value: 3,
      targetType: "all_enemy_minions"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38705,
    name: "Undead Horde Commander",
    manaCost: 5,
    attack: 3,
    health: 5,
    description: "Your Undead minions have +2 Attack.",
    flavorText: "It barks orders in a language the dead understand. The living hear only wind.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    aura: {
      type: "buff_attack",
      value: 2,
      target: "friendly_undead"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38706,
    name: "Plague of Helheim",
    manaCost: 7,
    description: "Destroy all minions. Summon a 1/1 Skeleton for each enemy minion destroyed.",
    flavorText: "When Helheim overflows, the surplus walks among the living.",
    type: "spell",
    rarity: "rare",
    class: "Necromancer",
    spellEffect: {
      type: "destroy_all_and_summon",
      targetType: "all_minions",
      summonName: "Skeleton",
      summonAttack: 1,
      summonHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38707,
    name: "Hel's Vanguard",
    manaCost: 8,
    attack: 7,
    health: 7,
    description: "Battlecry: Summon copies of all Undead in your graveyard (up to 6). They have 1/1 stats.",
    flavorText: "She rules half the dead. The other half wish she ruled them too.",
    type: "minion",
    rarity: 'epic',
    class: "Necromancer",
    race: "Undead",
    keywords: ["battlecry"],
    battlecry: {
      type: "mass_resurrect_as_copies",
      condition: { race: "Undead" },
      maxCount: 6,
      setStats: { attack: 1, health: 1 }
    },
    collectible: true,
    set: "core"
  },
  // === Early Game Expansion ===
  {
    id: 38708,
    name: "Grave Whisperer",
    manaCost: 1,
    attack: 1,
    health: 3,
    description: "Deathrattle: Add a random Necromancer spell to your hand.",
    flavorText: "It presses its ear to the grave and listens. The dead always have something to say.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "add_random_class_spell",
      class: "Necromancer"
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38709,
    name: "Bone Reaper",
    manaCost: 2,
    attack: 3,
    health: 2,
    description: "Deathrattle: Summon a 1/1 Skeleton.",
    flavorText: "Even in death, it leaves pieces behind.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    keywords: ["deathrattle"],
    deathrattle: {
      type: "summon",
      summonName: "Skeleton",
      summonAttack: 1,
      summonHealth: 1
    },
    collectible: true,
    set: "core"
  },
  {
    id: 38710,
    name: "Draugr Apprentice",
    manaCost: 2,
    attack: 2,
    health: 3,
    description: "Your Deathrattle minions cost (1) less.",
    flavorText: "She studies the art of dying — and what comes after.",
    type: "minion",
    rarity: "common",
    class: "Necromancer",
    race: "Undead",
    collectible: true,
    set: "core"
  }
];

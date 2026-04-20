/**
 * Elder Titans Cards
 *
 * Norse primordial powers — beings older than the Aesir who shaped the cosmos.
 * Each titan has a unique game-warping effect and a coterie of support cards.
 *
 * - Gullveig: Burned thrice in Völuspá st. 21-22, sparked the Aesir-Vanir war
 * - Hyrrokkin: Launched Hringhorni (Baldur's funeral ship) with such force the earth shook
 * - Utgarda-Loki: Jötunn illusionist from Gylfaginning ch. 44-47 (Thor's humiliation contests)
 * - Fornjot: Primordial ancestor of elemental jötnar (Ægir=sea, Logi=fire, Kári=wind)
 *
 * ID Range: 60001-60103
 *
 * Internal effect keys (cthun_damage, buff_cthun, yogg_saron, etc.) kept for
 * backwards compatibility with existing game logic and save data.
 */
import { CardData } from '../../../../../types';

export const elderTitanCards: CardData[] = [
  {
    id: 60001,
    name: "Thrice-Burned Elder",
    manaCost: 10,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Deal damage equal to this minion's Attack randomly split among all enemies.",
    flavorText: "Völuspá st. 21: 'Thrice burned, thrice reborn, oft and again, yet ever she lives.' Her burning sparked the first war between gods.",
    keywords: ["battlecry"],
    class: "Neutral",
    set: "core",
    battlecry: {
      type: "cthun_damage",
      requiresTarget: false,
      targetType: "none"
    },
    collectible: true
  },
  {
    id: 60002,
    name: "Ember of Gullveig",
    manaCost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    rarity: "common",
    description: "Battlecry: Give your Gullveig +2/+2 (wherever she is).",
    flavorText: "A spark from her first burning. Even cold, it remembers the pyre and yearns to return.",
    keywords: ["battlecry"],
    class: "Neutral",
    set: "core",
    battlecry: {
      type: "buff_cthun",
      requiresTarget: false,
      targetType: "none",
      buffAttack: 2,
      buffHealth: 2
    },
    collectible: true
  },
  {
    id: 60005,
    name: "Keeper of the Thrice-Flame",
    manaCost: 3,
    attack: 3,
    health: 4,
    type: "minion",
    rarity: "common",
    description: "At the end of your turn, give your Gullveig +1/+1 (wherever she is).",
    flavorText: "Three pyres burned her. Three pyres she survived. This one tends the embers between burnings, ensuring the fourth never comes.",
    keywords: [],
    class: "Neutral",
    set: "core",
    effects: [
      {
        type: "end_of_turn",
        value: 1,
        endOfTurnEffect: "buff_cthun"
      }
    ],
    collectible: true
  },
  {
    id: 60008,
    name: "Gullveig's Ash Guardian",
    manaCost: 7,
    attack: 6,
    health: 6,
    type: "minion",
    rarity: "rare",
    description: "Battlecry: If your Gullveig has at least 10 Attack, gain 10 Armor.",
    flavorText: "Born from the ashes of her third pyre, this guardian carries the weight of three deaths upon its shoulders.",
    keywords: ["battlecry"],
    class: "Warrior",
    set: "core",
    battlecry: {
      type: "conditional_armor",
      requiresTarget: false,
      targetType: "none",
      condition: "cthun_attack_10",
      armorGain: 10
    },
    collectible: true
  },
  {
    id: 60010,
    name: "Risen from the Pyre",
    manaCost: 7,
    attack: 4,
    health: 6,
    type: "minion",
    rarity: 'rare',
    description: "Taunt",
    flavorText: "Not Gullveig herself, but something shaped in the flames of her rebirth — fire given form and purpose.",
    keywords: ["taunt"],
    class: "Neutral",
    set: "core",
    collectible: false
  },
  {
    id: 60101,
    name: "Hyrrokkin, Launcher of the Dead",
    manaCost: 10,
    attack: 5,
    health: 7,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Summon your Deathrattle minions that died this game.",
    flavorText: "When no god could push Baldur's funeral ship Hringhorni to sea, they summoned Hyrrokkin. Her single shove caused earthquakes across all Nine Realms.",
    keywords: ["battlecry"],
    class: "Neutral",
    set: "core",
    battlecry: {
      type: "resurrect_deathrattle",
      requiresTarget: false,
      targetType: "none"
    },
    collectible: true
  },
  {
    id: 60102,
    name: "Utgarda-Loki, Lord of Illusions",
    manaCost: 10,
    attack: 7,
    health: 5,
    type: "minion",
    rarity: "mythic",
    description: "Battlecry: Cast a random spell for each spell you've cast this game (targets chosen randomly).",
    flavorText: "In Gylfaginning, he made Thor drink the ocean, wrestle Old Age herself, and race against Thought. Every contest was an illusion — and Thor never won a single one.",
    keywords: ["battlecry"],
    class: "Neutral",
    set: "core",
    battlecry: {
      type: "yogg_saron",
      requiresTarget: false,
      targetType: "none"
    },
    collectible: true
  },
  {
    id: 60103,
    name: "Fornjot, the Primordial",
    manaCost: 10,
    attack: 10,
    health: 10,
    type: "minion",
    rarity: "mythic",
    description: "At the end of your turn, summon a minion from your deck.",
    flavorText: "The primordial jötunn, ancestor of the elemental forces. His sons: Ægir, lord of the sea; Logi, the living flame; Kári, the howling wind.",
    keywords: [],
    class: "Neutral",
    set: "core",
    effects: [
      {
        type: "end_of_turn",
        value: 1,
        endOfTurnEffect: "summon_from_deck"
      }
    ],
    collectible: true
  }
];

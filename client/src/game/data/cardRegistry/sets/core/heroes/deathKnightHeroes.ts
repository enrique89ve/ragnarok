/**
 * Death Knight Hero Cards
 * 
 * Migrated from client/src/game/data/heroCards.ts on 2026-02-02
 * Contains hero transformation cards (Death Knight variants)
 * These cards replace your current hero and hero power when played
 * 
 * ID Range: 10501-10603
 */
import { CardData, HeroPower } from '../../../../../types';

const deathstalkerHeroPower: HeroPower = {
  name: "Build-a-Beast",
  description: "Craft a custom Zombeast.",
  cost: 2,
  used: false,
  class: "Hunter"
};

const frostLichHeroPower: HeroPower = {
  name: "Icy Touch",
  description: "Deal 1 damage. If this kills a minion, summon a Water Elemental.",
  cost: 2,
  used: false,
  class: "Mage"
};

const helheimWarlordHeroPower: HeroPower = {
  name: "Bladestorm",
  description: "Deal 1 damage to all minions.",
  cost: 2,
  used: false,
  class: "Warrior"
};

const lightforgedHeroPower: HeroPower = {
  name: "The Four Heralds",
  description: "Summon a 2/2 Herald. If you have all 4, destroy the enemy hero.",
  cost: 2,
  used: false,
  class: "Paladin"
};

export const deathKnightHeroCards: CardData[] = [
  {
    id: 10501,
    name: "Skoll, Death-Hunter",
    manaCost: 6,
    description: "Battlecry: Deal 2 damage to all enemy minions.",
    flavorText: "The eternal hunter becomes one with death itself — tracking prey across all Nine Realms.",
    rarity: 'rare',
    type: "hero",
    class: "Hunter",
    set: "core",
    collectible: true,
    heroPower: deathstalkerHeroPower
  },
  {
    id: 10502,
    name: "Skadi, Frost Queen",
    manaCost: 9,
    description: "Battlecry: Summon a 3/6 Water Elemental. Your Elementals have Lifesteal this game.",
    flavorText: "The ice queen rises, commanding the chill of death.",
    rarity: 'epic',
    type: "hero",
    class: "Mage",
    set: "core",
    collectible: true,
    heroPower: frostLichHeroPower
  },
  {
    id: 10503,
    name: "Helheim's Warlord",
    manaCost: 8,
    description: "Battlecry: Equip a 4/3 Helgrind's Cleaver that also damages adjacent minions.",
    flavorText: "The warchief embraces the power of Helheim.",
    rarity: 'epic',
    type: "hero",
    class: "Warrior",
    set: "core",
    collectible: true,
    heroPower: helheimWarlordHeroPower
  },
  {
    id: 10504,
    name: "Baldr, Fallen Radiance",
    manaCost: 9,
    description: "Battlecry: Equip a 5/3 Lifesteal weapon.",
    flavorText: "The god of light falls, reborn as a champion of Helheim's darkness.",
    rarity: 'epic',
    type: "hero",
    class: "Paladin",
    set: "core",
    collectible: true,
    heroPower: lightforgedHeroPower
  }
];

export const deathKnightHeroTokens: CardData[] = [
  {
    id: 10601,
    name: "Helgrind's Cleaver",
    manaCost: 8,
    attack: 4,
    durability: 3,
    description: "Also damages minions adjacent to whomever your hero attacks.",
    flavorText: "Forged in Helheim's deepest forge from the wails of the dishonored dead.",
    rarity: 'epic',
    type: "weapon",
    keywords: [],
    class: "Warrior",
    set: "core",
    collectible: false
  },
  {
    id: 10602,
    name: "Grave Vengeance",
    manaCost: 9,
    attack: 5,
    durability: 3,
    description: "Wielded by Baldr, Fallen Radiance.",
    flavorText: "A blade cursed with the power to drain life.",
    rarity: 'epic',
    type: "weapon",
    keywords: ["lifesteal"],
    class: "Paladin",
    set: "core",
    collectible: false
  },
  {
    id: 10603,
    name: "Herald of Ragnarök",
    manaCost: 2,
    attack: 2,
    health: 2,
    description: "Summoned by Baldr, Fallen Radiance's hero power.",
    flavorText: "Four signs herald the end: Fimbulvetr's frost, Naglfar's sail, Fenrir's howl, and Hel's march. (Völuspá 44-53)",
    rarity: 'epic',
    type: "minion",
    keywords: [],
    class: "Paladin",
    set: "core",
    collectible: false
  }
];

export const allDeathKnightHeroCards: CardData[] = [
  ...deathKnightHeroCards,
  ...deathKnightHeroTokens
];

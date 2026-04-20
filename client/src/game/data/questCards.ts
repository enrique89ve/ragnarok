/**
 * Quest cards for Norse mythos card game
 * Quests are spell cards that when played, give the player a task to complete for a powerful reward
 */
import { CardData } from '../types';

// Quest reward cards
export const questRewards: CardData[] = [
  {
      id: 95501,
      name: "Chronos Warp",
      manaCost: 5,
      description: "Take an extra turn after this one.",
      rarity: "mythic",
      type: "spell",
      keywords: [],
      spellEffect: {
        type: "extra_turn",
        value: 1,
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true,
      class: "Neutral"
  },
  {
      id: 95502,
      name: "Mjolnir's Fury",
      manaCost: 3,
      attack: 4,
      durability: 2,
      description: "Battlecry: Your Hero Power becomes 'Deal 8 damage'.",
      rarity: "mythic",
      type: "weapon",
      keywords: ["battlecry"],
                  battlecry: {
        type: "change_hero_power",
        requiresTarget: false,
        targetType: "none",
        newHeroPower: {
          name: "DIE, INSECT!",
          description: "Deal 8 damage to a random enemy.",
          cost: 2,
          used: false,
          class: "Warrior"
        }
    },
      collectible: true,
      class: "Neutral"
  },
  {
      id: 95503,
      name: "Yggdrasil Core",
      manaCost: 5,
      description: "For the rest of the game, your minions are 4/4.",
      rarity: "mythic",
      type: "spell",
      keywords: [],
      spellEffect: {
        type: "crystal_core",
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true,
      class: "Neutral"
  },
  {
      id: 95504,
      name: "Elpis, Warden of Hope",
      manaCost: 5,
      attack: 8,
      health: 8,
      description: "Taunt.   Battlecry: Set your hero's Health to 40.",
      rarity: "mythic",
      type: "minion",
      keywords: ["taunt", "battlecry"],
                  battlecry: {
        type: "heal",
        value: 40, // Sets health to 40 rather than healing by 40
        requiresTarget: false,
        targetType: "friendly_hero"
      },
      collectible: true,
      class: "Neutral"
  },
  {
      id: 95505,
      name: "Queen Echidna",
      manaCost: 5,
      attack: 8,
      health: 8,
      description: "Battlecry: Shuffle 15 Raptors into your deck. They cost (1) and draw a card when played.",
      rarity: "mythic",
      type: "minion",
      keywords: ["battlecry"],
                  battlecry: {
        type: "summon", // This is simplified, would shuffle raptors in real implementation
        value: 15,
        summonCardId: 15055, // Raptor card ID
        requiresTarget: false,
        targetType: "none"
      },
      collectible: true,
      class: "Neutral"
  },
  {
      id: 95506,
      name: "Barnabus, Titan Stomper",
      manaCost: 5,
      attack: 8,
      health: 8,
      description: "Battlecry: The minions in your deck cost (0).",
      rarity: "mythic",
      type: "minion",
      keywords: ["battlecry"],
                  battlecry: {
        type: "buff", // Simplified effect
        requiresTarget: false,
        targetType: "none",
        buffAttack: 1,
        buffHealth: 1
      },
      collectible: true,
      class: "Neutral"
  }
      ];

// Main quest cards
export const questCards: CardData[] = [
  {
      id: 95507,
      name: "Open the Bifrost",
      manaCost: 1,
      description: "Quest: Cast 6 spells that didn't start in your deck.   Reward: Chronos Warp.",
      rarity: "mythic",
      type: "spell",
      keywords: ["quest"],
      spellEffect: {
        type: "quest",
        requiresTarget: false,
        targetType: "none",
        questData: {
          type: "cast_generated_spells",
          progress: 0,
          target: 6,
          completed: false,
          rewardCardId: 95501 // Time Warp
        }
    },
      class: "Neutral",
      collectible: true
  },
  {
      id: 95508,
      name: "Surtr's Heart",
      manaCost: 1,
      description: "Quest: Play 7 Taunt minions.   Reward: Mjolnir's Fury.",
      rarity: "mythic",
      type: "spell",
      keywords: ["quest"],
      spellEffect: {
        type: "quest",
        requiresTarget: false,
        targetType: "none",
        questData: {
          type: "play_taunt_minions",
          progress: 0,
          target: 7,
          completed: false,
          rewardCardId: 95502 // Sulfuras
        }
    },
      class: "Neutral",
      collectible: true
  },
  {
      id: 95509,
      name: "The Underworld Path",
      manaCost: 1,
      description: "Quest: Play 5 minions with the same name.   Reward: Yggdrasil Core.",
      rarity: "mythic",
      type: "spell",
      keywords: ["quest"],
      spellEffect: {
        type: "quest",
        requiresTarget: false,
        targetType: "none",
        questData: {
          type: "play_minions_same_name",
          progress: 0,
          target: 5,
          completed: false,
          rewardCardId: 95503 // Crystal Core
        }
    },
      class: "Neutral",
      collectible: true
  },
  {
      id: 95510,
      name: "Awaken the Titans",
      manaCost: 1,
      description: "Quest: Summon 7 Deathrattle minions. Reward: Elpis, Warden of Hope.",
      rarity: "mythic",
      type: "spell",
      keywords: ["quest"],
      spellEffect: {
        type: "quest",
        requiresTarget: false,
        targetType: "none",
        questData: {
          type: "summon_minions", // This is simplified; would check for deathrattle in real implementation
          progress: 0,
          target: 7,
          completed: false,
          rewardCardId: 95504 // Amara, Warden of Hope
        }
    },
      class: "Neutral",
      collectible: true
  },
  {
      id: 95511,
      name: "The Hydra Queen",
      manaCost: 1,
      description: "Quest: Play 7 minions that cost (1).   Reward: Queen Echidna.",
      rarity: "mythic",
      type: "spell",
      keywords: ["quest"],
      spellEffect: {
        type: "quest",
        requiresTarget: false,
        targetType: "none",
        questData: {
          type: "summon_minions", // Simplified; would check for cost 1 in real implementation
          progress: 0,
          target: 7,
          completed: false,
          rewardCardId: 95505 // Queen Carnassa
        }
    },
      class: "Neutral",
      collectible: true
  },
  {
      id: 95512,
      name: "Titan Giants",
      manaCost: 1,
      description: "Quest: Summon 5 minions with 5 or more Attack.   Reward: Barnabus, Titan Stomper.",
      rarity: "mythic",
      type: "spell",
      keywords: ["quest"],
      spellEffect: {
        type: "quest",
        requiresTarget: false,
        targetType: "none",
        questData: {
          type: "summon_minions", // Simplified; would check for 5+ attack in real implementation
          progress: 0,
          target: 5,
          completed: false,
          rewardCardId: 95506 // Barnabus the Stomper
        }
    },
      class: "Neutral",
      collectible: true
  }
      ];

// Helper function to get all quest-related cards
export function getAllQuestCards(): CardData[] {
  return [...questCards, ...questRewards];
}
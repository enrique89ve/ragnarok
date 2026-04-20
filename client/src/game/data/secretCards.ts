/**
 * Rune (secret) cards for Norse mythos card game
 * Secrets are hidden spells that trigger automatically when specific conditions are met
 */
import { CardData, SecretTriggerType } from '../types';

export const secretCards: CardData[] = [
  {
    id: 16501,
    name: "Hunter's Ambush",
    manaCost: 2,
    type: "spell",
    rarity: "common",
    description: "Rune: After your opponent plays a minion, deal 4 damage to it.",
    keywords: ["secret"],
    class: "Hunter",
    heroClass: "hunter",
    collectible: true,
    secretEffect: {
      triggerType: "on_minion_summon" as SecretTriggerType,
      type: "damage",
      value: 4,
      targetType: "enemy_minion",
      requiresTarget: true
    }
  },
  {
    id: 16502,
    name: "Einherjar's Sacrifice",
    manaCost: 1,
    description: "Rune: When an enemy attacks, summon a 2/1 Defender as the new target.",
    rarity: "common",
    type: "spell",
    keywords: ["secret"],
    class: "Paladin",
    heroClass: "paladin",
    collectible: true,
    secretEffect: {
      triggerType: "on_minion_attack" as SecretTriggerType,
      type: "summon",
      targetType: "none",
      requiresTarget: false,
      summonCardId: 16503 // Defender token
    },
    // Adding spellEffect to ensure it can be played manually
    spellEffect: {
      type: "summon",
      targetType: "none",
      requiresTarget: false,
      summonCardId: 16503 // Defender token
    }
  }
];

export default secretCards;
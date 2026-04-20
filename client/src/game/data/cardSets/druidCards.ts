/**
 * Druid Cards Collection
 * 
 * This file contains Druid-specific cards using the card builder API.
 * Druid cards focus on "Choose One" mechanics, mana manipulation, and 
 * transformations themed around natural elements and beasts.
 * 
 * Core Mechanics:
 * - Choose One: Cards that provide multiple effects to choose from
 * - Mana Acceleration: Gaining mana for temporary or permanent use
 * - Transformation: Shifting forms to adapt to situations
 * - Beast and Nature themes: Many cards involve plants, animals, and natural forces
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { BattlecryTargetType, SpellTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Druid cards in the registry
 * Card IDs: 
 * - Regular Druid cards: 11xxx series
 * - Choose One Druid cards: 33xxx series
 * - Druid tokens: 11xxx series (usually 5xx+)
 */
export function registerDruidCards(): void {
  if (IS_DEV) debug.card('Registering Druid cards...');

  // BASIC DRUID CARDS
  createCard()
    .id(11003)
    .name("Gaia's Gift")
    .manaCost(0)
    .type("spell")
    .rarity("common")
    .description("Gain 1 Mana Crystal this turn only.")
    .flavorText("Idunn channels the life-force of Yggdrasil itself — raw creation energy older than the Nine Realms.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "gain_mana",
      value: 1,
      isTemporaryMana: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(11015)
    .name("Rune of the Wild")
    .manaCost(2)
    .type("spell")
    .rarity("common")
    .description("Give a minion Taunt and +2/+2.")
    .flavorText("Not to be confused with Mark of the Mild, which only gives +1/+1 and Taunt. And a free shampoo.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "buff",
      buffAttack: 2,
      buffHealth: 2,
      grantKeywords: ["taunt"],
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(11016)
    .name("Yggdrasil's Essence")
    .manaCost(4)
    .type("spell")
    .rarity("common")
    .description("Give your minions 'Deathrattle: Summon a 2/2 Treant.'")
    .flavorText("Is this Soul of the Forest related to Soul of the Fire Festival? Probably.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "grant_deathrattle",
      targetType: "all_friendly_minions"
    })
    .customProperty("grantedDeathrattle", {
      type: "summon",
      value: 1,
      summonCardId: 11020, // Treant
      targetType: "none"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(11020)
    .name("Treant")
    .manaCost(2)
    .attack(2)
    .health(2)
    .type("minion")
    .rarity("common")
    .description("")
    .flavorText("I am Treant. I speak for the trees!")
    .heroClass("druid")
    .class("Druid")
    .collectible(false)
    .addCategory("token")
    .build();

  createCard()
    .id(11040)
    .name("Healing Spring")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Restore 8 Health to your hero and gain 3 Armor.")
    .flavorText("A healing touch that mends both body and spirit.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "heal",
      targetType: "friendly_hero",
      value: 8,
      bonusEffect: {
        type: "gain_armor",
        value: 3
      }
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(11041)
    .name("Root Guardian")
    .manaCost(6)
    .attack(4)
    .health(6)
    .type("minion")
    .rarity("rare")
    .description("Taunt. Battlecry: Gain +1/+1 for each other minion you control.")
    .flavorText("The wisest of trees stand firm against all foes.")
    .heroClass("druid")
    .class("Druid")
    .addKeyword("taunt")
    .battlecry({
      type: "buff_self",
      attackBuff: 1,
      healthBuff: 1,
      scaling: {
        type: "friendly_minion_count"
      }
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11042)
    .name("Yggdrasil's Surge")
    .manaCost(4)
    .type("spell")
    .rarity("common")
    .description("Give your minions +1/+1 and they can't be targeted by spells or hero powers this turn.")
    .flavorText("Nature shields those who embrace its ways.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "buff",
      targetType: "friendly_minions",
      buffAttack: 1,
      buffHealth: 1,
      bonusEffect: {
        type: "add_ability",
        ability: "elusive",
        duration: 1
      }
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11043)
    .name("Fenrir's Hunger")
    .manaCost(2)
    .type("spell")
    .rarity("common")
    .description("Give your hero +3 Attack this turn and gain 3 Armor.")
    .flavorText("Sometimes you need claws to make your point.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "hero_attack",
      value: 3,
      duration: 1,
      bonusEffect: {
        type: "gain_armor",
        value: 3
      }
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11044)
    .name("Ironwood Sage")
    .manaCost(7)
    .attack(5)
    .health(8)
    .type("minion")
    .rarity("epic")
    .description("Taunt. At the end of your turn, restore 2 Health to all friendly characters.")
    .flavorText("Its roots run deep, drawing healing energy from the earth itself.")
    .heroClass("druid")
    .class("Druid")
    .addKeyword("taunt")
    .customProperty("endOfTurn", {
      type: "heal",
      targetType: "all_friendly",
      value: 2
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11050)
    .name("Yggdrasil's Growth")
    .manaCost(4)
    .type("spell")
    .rarity("common")
    .description("Gain two empty Mana Crystals.")
    .flavorText("Growth takes time, but the results are worth waiting for.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "gain_mana_crystals",
      value: 2,
      emptyOnly: true
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11052)
    .name("Nature's Bloom")
    .manaCost(5)
    .type("spell")
    .rarity("rare")
    .description("Draw 3 cards.")
    .flavorText("When nature flourishes, so do those who serve it.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "draw",
      value: 3
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11058)
    .name("Fury of Gaia")
    .manaCost(5)
    .type("spell")
    .rarity("epic")
    .description("Summon three 2/2 Treants.")
    .flavorText("The forest rises to defend its own.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "summon",
      summonCardId: 11059, // Treant
      count: 3
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(11059)
    .name("Treant")
    .manaCost(2)
    .attack(2)
    .health(2)
    .type("minion")
    .rarity("common")
    .description("")
    .flavorText("It takes years to grow a tree this size. Or seconds with the right spell.")
    .heroClass("druid")
    .class("Druid")
    .collectible(false)
    .addCategory("token")
    .build();

  // YGGDRASIL GOLEM DRUID CARDS
  createCard()
    .id(85002)
    .name("Stone Flower")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Summon a Yggdrasil Golem. Gain an empty Mana Crystal.")
    .heroClass("druid")
    .class("Druid")
    .addKeyword("yggdrasil_golem")
    .spellEffect({
      type: "summon_yggdrasil_golem",
      bonusEffect: {
        type: "gain_mana_crystals",
        value: 1,
        emptyOnly: true
      }
    })
    .collectible(true)
    .addCategory("yggdrasil_golem")
    .build();

  // CHOOSE ONE CARDS
  createCard()
    .id(33001)
    .name("Life's Sustenance")
    .manaCost(6)
    .type("spell")
    .rarity("rare")
    .description("Choose One - Gain 2 Mana Crystals; or Draw 3 cards.")
    .flavorText("Druids know the secret of cosmic bogo sales: 'Buy one, get one free!'")
    .heroClass("druid")
    .class("Druid")
    .addKeyword("choose_one")
    .chooseOneEffects([
      {
        id: "mana",
        name: "Mana",
        description: "Gain 2 Mana Crystals",
        effect: {
          type: "gain_mana_crystals",
          value: 2,
          emptyOnly: true
        }
      },
      {
        id: "draw",
        name: "Draw",
        description: "Draw 3 cards",
        effect: {
          type: "draw",
          value: 3
        }
      }
    ])
    .collectible(true)
    .addCategory("choose_one")
    .build();

  createCard()
    .id(33002)
    .name("Grove Warden")
    .manaCost(4)
    .attack(2)
    .health(3)
    .type("minion")
    .rarity("rare")
    .description("Choose One - Deal 2 damage; or Silence a minion.")
    .flavorText("The Keepers are tireless in their pursuit of preserving nature's balance.")
    .heroClass("druid")
    .class("Druid")
    .addKeyword("choose_one")
    .chooseOneEffects([
      {
        id: "damage",
        name: "Máni's Wrath",
        description: "Deal 2 damage",
        effect: {
          type: "damage",
          value: 2,
          targetType: "any",
          requiresTarget: true
        }
      },
      {
        id: "silence",
        name: "Dispel",
        description: "Silence a minion",
        effect: {
          type: "silence",
          targetType: "minion",
          requiresTarget: true
        }
      }
    ])
    .collectible(true)
    .addCategory("choose_one")
    .build();

  createCard()
    .id(33003)
    .name("Verdian, Nature's Herald")
    .manaCost(9)
    .attack(5)
    .health(8)
    .type("minion")
    .rarity("epic")
    .description("Choose One - Give your other minions +2/+2; or Summon two 2/2 Treants with Taunt.")
    .flavorText("Cenarius was the patron demigod of all druids... until Surtr incinerated him.")
    .heroClass("druid")
    .class("Druid")
    .addKeyword("choose_one")
    .chooseOneEffects([
      {
        id: "buff",
        name: "Demigod's Favor",
        description: "Give your other minions +2/+2",
        effect: {
          type: "buff",
          targetType: "other_friendly_minions",
          buffAttack: 2,
          buffHealth: 2
        }
      },
      {
        id: "summon",
        name: "Children of the Forest",
        description: "Summon two 2/2 Treants with Taunt",
        effect: {
          type: "summon_token",
          count: 2,
          token: {
            id: 33006,
            name: "Treant",
            attack: 2,
            health: 2,
            keywords: ["taunt"]
          }
        }
      }
    ])
    .collectible(true)
    .addCategory("choose_one")
    .build();

  // Beast's Call - Classic Druid Spell
  createCard()
    .id(11050)
    .name("Beast's Call")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Give your characters +2 Attack this turn.")
    .heroClass("druid")
    .class("Druid")
    .spellEffect({
      type: "buff",
      buffAttack: 2,
      targetType: "all_friendly_characters",
      requiresTarget: false,
      duration: 1
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  if (IS_DEV) debug.card('Druid cards registered successfully.');
}
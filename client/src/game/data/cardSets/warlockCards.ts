/**
 * Warlock Cards Collection
 * 
 * This file contains Warlock-specific cards using the card builder API.
 * Warlock cards often trade health for power, summon titans, and control the board through dark magic.
 * Key mechanics include Life Tap (drawing at the cost of health) and Discard synergies.
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { BattlecryTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Warlock cards in the registry
 * Card IDs: 
 * - Regular Warlock cards: 17xxx series
 * - Warlock spell cards: 37xxx series
 * - Titan-specific tokens: 17xxx series (usually 500+)
 */
export function registerWarlockCards(): void {
  if (IS_DEV) debug.card('Registering Warlock cards...');

  // BASIC WARLOCK CARDS
  createCard()
    .id(17001)
    .name("Ginnungagap Wanderer")
    .manaCost(1)
    .attack(1)
    .health(3)
    .type("minion")
    .race("Titan")
    .rarity("common")
    .description("Taunt")
    .heroClass("warlock")
    .class("Warlock")
    .addKeyword("taunt")
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17002)
    .name("Rune of Shadows")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Deal 4 damage to a minion.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "damage",
      value: 4,
      targetType: "minion_only",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17003)
    .name("Muspel's Inferno")
    .manaCost(4)
    .type("spell")
    .rarity("common")
    .description("Deal 3 damage to ALL characters.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "aoe_damage",
      value: 3,
      targetType: "all_characters"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17004)
    .name("Doomed Guardian")
    .manaCost(5)
    .attack(5)
    .health(7)
    .type("minion")
    .race("Titan")
    .rarity("rare")
    .description("Charge. Battlecry: Discard two random cards.")
    .heroClass("warlock")
    .class("Warlock")
    .addKeyword("charge")
    .addKeyword("battlecry")
    .battlecry({
      type: "discard_random",
      discardCount: 2
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17005)
    .name("Hel's Flame")
    .manaCost(1)
    .type("spell")
    .rarity("common")
    .description("Deal 4 damage. Discard a random card.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "damage",
      value: 4,
      targetType: 'any',
      requiresTarget: true,
      bonusEffect: {
        type: "discard_random",
        count: 1
      }
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17006)
    .name("Soul's Siphon")
    .manaCost(6)
    .type("spell")
    .rarity("rare")
    .description("Destroy a minion. Restore 3 Health to your hero.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "destroy",
      targetType: "minion_only",
      requiresTarget: true,
      bonusEffect: {
        type: "restore_health",
        value: 3,
        targetType: "own_hero"
      }
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17007)
    .name("Ginnungagap Shade")
    .manaCost(3)
    .attack(3)
    .health(3)
    .type("minion")
    .race("Titan")
    .rarity("rare")
    .description("Battlecry: Destroy both adjacent minions and gain their Attack and Health.")
    .heroClass("warlock")
    .class("Warlock")
    .addKeyword("battlecry")
    .battlecry({
      type: "consume_adjacent"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17008)
    .name("Shadow Keeper")
    .manaCost(2)
    .attack(3)
    .health(2)
    .type("minion")
    .rarity("rare")
    .description("Battlecry: Discard a random card. Deathrattle: Draw a card.")
    .heroClass("warlock")
    .class("Warlock")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .battlecry({
      type: "discard_random",
      discardCount: 1
    })
    .deathrattle({
      type: "draw",
      count: 1
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17009)
    .name("Ginnungagap Abyss")
    .manaCost(8)
    .type("spell")
    .rarity("epic")
    .description("Destroy all minions.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "destroy_all_minions"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  createCard()
    .id(17010)
    .name("Loki's Spark")
    .manaCost(1)
    .attack(3)
    .health(2)
    .type("minion")
    .race("Titan")
    .rarity("common")
    .description("Battlecry: Deal 3 damage to your hero.")
    .heroClass("warlock")
    .class("Warlock")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      value: 3,
      targetType: 'friendly_hero'
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // ADVANCED WARLOCK CARDS
  createCard()
    .id(17101)
    .name("Surtr, Flame Lord")
    .manaCost(9)
    .attack(3)
    .health(15)
    .type("minion")
    .race("Titan")
    .rarity("mythic")
    .description("Battlecry: Replace your hero with Erebus, Void Lord.")
    .heroClass("warlock")
    .class("Warlock")
    .addKeyword("battlecry")
    .battlecry({
      type: "replace_hero"
      // Special handling for Jaraxxus is implemented in the game logic
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(17102)
    .name("Titan Sense")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Draw 2 Titans from your deck.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "draw_specific",
      count: 2
    })
    .customProperty("specificCardType", "titan")
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(17103)
    .name("Hel's Covenant")
    .manaCost(0)
    .type("spell")
    .rarity("common")
    .description("Destroy a Titan. Restore 5 Health to your hero.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "destroy",
      targetType: "titan_only",
      requiresTarget: true,
      bonusEffect: {
        type: "restore_health",
        value: 5,
        targetType: "own_hero"
      }
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(17104)
    .name("Surtr's Fist")
    .manaCost(4)
    .type("spell")
    .rarity("rare")
    .description("When you play or discard this, deal 4 damage to a random enemy.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "damage_random_enemy",
      value: 4
    })
    .customProperty("discardEffect", {
      type: "damage_random_enemy",
      value: 4
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  createCard()
    .id(17105)
    .name("Shadow Flame")
    .manaCost(4)
    .type("spell")
    .rarity("rare")
    .description("Destroy a friendly minion and deal its Attack damage to all enemy minions.")
    .heroClass("warlock")
    .class("Warlock")
    .spellEffect({
      type: "shadowflame",
      targetType: "friendly_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("advanced")
    .build();

  // TOKENS
  createCard()
    .id(17501)
    .name("Infernal")
    .manaCost(6)
    .attack(6)
    .health(6)
    .type("minion")
    .race("Titan")
    .rarity("common")
    .description("Summoned by Erebus, Void Lord.")
    .heroClass("warlock")
    .class("Warlock")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  createCard()
    .id(17502)
    .name("Soul Remnant")
    .manaCost(5)
    .attack(5)
    .health(5)
    .type("minion")
    .race("Titan")
    .rarity("common")
    .description("Drawn from the void.")
    .heroClass("warlock")
    .class("Warlock")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  createCard()
    .id(17503)
    .name("Candle")
    .manaCost(1)
    .attack(1)
    .health(1)
    .type("minion")
    .rarity("common")
    .description("Summoned by Kara Kazham!")
    .heroClass("warlock")
    .class("Warlock")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  createCard()
    .id(17504)
    .name("Broom")
    .manaCost(2)
    .attack(2)
    .health(2)
    .type("minion")
    .rarity("common")
    .description("Summoned by Kara Kazham!")
    .heroClass("warlock")
    .class("Warlock")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  createCard()
    .id(17505)
    .name("Teapot")
    .manaCost(3)
    .attack(3)
    .health(3)
    .type("minion")
    .rarity("common")
    .description("Summoned by Kara Kazham!")
    .heroClass("warlock")
    .class("Warlock")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  createCard()
    .id(17506)
    .name("Imp")
    .manaCost(1)
    .attack(2)
    .health(2)
    .type("minion")
    .race("Titan")
    .rarity("common")
    .description("A mischievous imp of Muspelheim.")
    .heroClass("warlock")
    .class("Warlock")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  if (IS_DEV) debug.card('Warlock cards registered successfully.');
}
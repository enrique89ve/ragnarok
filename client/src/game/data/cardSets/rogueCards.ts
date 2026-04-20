/**
 * Rogue Cards Collection
 * 
 * This file contains Rogue-specific cards using the card builder API.
 * Rogue cards feature combo mechanics, stealth, and weapon synergies.
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { BattlecryTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Rogue cards in the registry
 */
export function registerRogueCards(): void {
  if (IS_DEV) debug.card('Registering Rogue cards...');

  // ROGUE SPELLS

  // Shadow of Loki
  createCard()
    .id(12101)
    .name("Shadow of Loki")
    .manaCost(0)
    .description("Deal 2 damage to an undamaged minion.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "damage",
      value: 2,
      targetType: "undamaged_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Óðinn's Foresight
  createCard()
    .id(12102)
    .name("Óðinn's Foresight")
    .manaCost(0)
    .description("The next spell you cast this turn costs (3) less.")
    .rarity("rare")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "cost_reduction",
      value: 3,
      targetType: "none",
      // The targeting and duration are handled by the effect handler
      specificRace: "spell" // Using specificRace for card type targeting
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Hel's Path
  createCard()
    .id(12103)
    .name("Hel's Path")
    .manaCost(0)
    .description("Return a friendly minion to your hand. It costs (2) less.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "return_to_hand",
      targetType: "friendly_minion",
      requiresTarget: true,
      value: 2 // Use value for cost reduction
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Jörmungandr Venom
  createCard()
    .id(12104)
    .name("Jörmungandr Venom")
    .manaCost(1)
    .description("Give your weapon +2 Attack.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "buff_weapon",
      value: 2,
      targetType: "player_weapon",
      requiresTarget: false
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Shadow Strike
  createCard()
    .id(12105)
    .name("Shadow Strike")
    .manaCost(1)
    .description("Deal 3 damage to the enemy hero.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "damage",
      value: 3,
      targetType: "enemy_hero",
      requiresTarget: false
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Mist of Niflheim
  createCard()
    .id(12106)
    .name("Mist of Niflheim")
    .manaCost(2)
    .description("Return an enemy minion to your opponent's hand.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "return_to_hand",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Serpent's Fang
  createCard()
    .id(12107)
    .name("Serpent's Fang")
    .manaCost(2)
    .description("Deal 2 damage. Combo: Deal 4 damage instead.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("combo")
    .spellEffect({
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true
    })
    .customProperty("combo", {
      type: "damage",
      value: 4,
      targetType: "any"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Daggers of Víðarr
  createCard()
    .id(12108)
    .name("Daggers of Víðarr")
    .manaCost(3)
    .description("Deal 1 damage to all enemy minions. Draw a card.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "aoe_damage",
      value: 1,
      targetType: "enemy_minions",
      drawCards: 1
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Aegis Tempest
  createCard()
    .id(12109)
    .name("Aegis Tempest")
    .manaCost(4)
    .description("Destroy your weapon and deal its damage to all enemy minions.")
    .rarity("rare")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "weapon_damage_aoe",
      targetType: "enemy_minions"
      // Note: Weapon destruction is handled by the effect logic based on the effect type
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Hel's Execution
  createCard()
    .id(12110)
    .name("Hel's Execution")
    .manaCost(5)
    .description("Destroy an enemy minion.")
    .rarity("common")
    .type("spell")
    .heroClass("rogue")
    .class("Rogue")
    .spellEffect({
      type: "destroy",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // ROGUE MINIONS

  // Loki's Shadow Ringleader
  createCard()
    .id(12201)
    .name("Loki's Shadow Ringleader")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Combo: Summon a 2/1 Shadow Thief.")
    .rarity("common")
    .type("minion")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("combo")
    .customProperty("combo", {
      type: "summon",
      value: 1,
      summonCardId: 12501 // Shadow Thief token
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Odin's Raven Scout
  createCard()
    .id(12202)
    .name("Odin's Raven Scout")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Combo: Deal 2 damage.")
    .rarity("rare")
    .type("minion")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("combo")
    .customProperty("combo", {
      type: "damage",
      value: 2,
      targetType: "any",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Master of Disguise
  createCard()
    .id(12203)
    .name("Loki's Disciple")
    .manaCost(4)
    .attack(4)
    .health(4)
    .description("Battlecry: Give a friendly minion Stealth until your next turn.")
    .rarity("rare")
    .type("minion")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("battlecry")
    .battlecry({
      type: "give_stealth",
      targetType: 'friendly_minion',
      requiresTarget: true,
      // Note: duration is handled internally by the effect logic
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Kidnapper
  createCard()
    .id(12204)
    .name("Kidnapper")
    .manaCost(6)
    .attack(5)
    .health(3)
    .description("Combo: Return a minion to its owner's hand.")
    .rarity("epic")
    .type("minion")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("combo")
    .customProperty("combo", {
      type: "return_to_hand",
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Erik the Shadow Lord
  createCard()
    .id(12404)
    .name("Erik the Shadow Lord")
    .manaCost(3)
    .attack(2)
    .health(2)
    .description("Combo: Gain +2/+2 for each card played earlier this turn.")
    .rarity("mythic")
    .type("minion")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("combo")
    .customProperty("combo", {
      type: "buff_per_card_played",
      attack: 2,
      health: 2
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // ROGUE WEAPONS

  // Wicked Knife (Hero Power weapon)
  createCard()
    .id(12301)
    .name("Wicked Knife")
    .manaCost(1)
    .attack(1)
    .durability(2)
    .description("The Rogue's trusty dagger.")
    .rarity("common")
    .type("weapon")
    .heroClass("rogue")
    .class("Rogue")
    .collectible(false) // This is the basic Hero Power weapon
    .addCategory("token")
    .build();

  // Assassin's Blade
  createCard()
    .id(12303)
    .name("Assassin's Blade")
    .manaCost(5)
    .attack(3)
    .durability(4)
    .description("A lethal blade with a long reach.")
    .rarity("common")
    .type("weapon")
    .heroClass("rogue")
    .class("Rogue")
    .collectible(true)
    .addCategory("basic")
    .build();

  // Perdition's Blade
  createCard()
    .id(12304)
    .name("Perdition's Blade")
    .manaCost(3)
    .attack(2)
    .durability(2)
    .description("Battlecry: Deal 1 damage. Combo: Deal 2 instead.")
    .rarity("rare")
    .type("weapon")
    .heroClass("rogue")
    .class("Rogue")
    .addKeyword("battlecry")
    .addKeyword("combo")
    .battlecry({
      type: "damage",
      value: 1,
      targetType: 'any',
      requiresTarget: true
    })
    .customProperty("combo", {
      type: "damage",
      value: 2,
      targetType: 'any'
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // TOKEN CARDS

  // Shadow Thief (token for Loki's Shadow Ringleader)
  createCard()
    .id(12501)
    .name("Shadow Thief")
    .manaCost(1)
    .attack(2)
    .health(1)
    .description("A shadow servant of Loki's realm.")
    .rarity("common")
    .type("minion")
    .heroClass("rogue")
    .class("Rogue")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  if (IS_DEV) debug.card('Rogue cards registered successfully.');
}
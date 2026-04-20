/**
 * Shaman Cards Collection
 * 
 * This file contains Shaman-specific cards using the card builder API.
 * Shaman cards focus on elemental damage, totem synergy, and overload mechanics.
 * 
 * Core Mechanics:
 * - Totems: Small utility minions that provide passive effects
 * - Overload: Pay less mana now, but lock mana crystals next turn
 * - Elemental synergy: Bonuses for playing elementals
 * - Versatile spells: Options for both board control and direct damage
 * 
 * CARD ID ALLOCATION (5200-5299 range reserved for Shaman):
 * - Classic minions: 5201-5220
 * - Classic spells: 5221-5250
 * - Legendary minions: 5115-5117 (legacy, kept for backwards compatibility)
 * - Token cards: 5251-5260
 * - Additional spells: 5118-5125 (legacy, kept for backwards compatibility)
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { BattlecryTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Shaman cards in the registry
 */
export function registerShamanCards(): void {
  if (IS_DEV) debug.card('Registering Shaman cards...');

  // BASIC SHAMAN CARDS

  // Muspel's Ember (formerly Fire Elemental)
  createCard()
    .id(5201)
    .name("Muspel's Ember")
    .manaCost(6)
    .attack(6)
    .health(5)
    .description("Battlecry: Deal 3 damage.")
    .flavorText("A living fragment of Muspelheim's eternal flame.")
    .type("minion")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("battlecry")
    .race("Elemental")
    .battlecry({
      type: "damage",
      value: 3,
      requiresTarget: true,
      targetType: 'any'
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Surtr's Totem
  createCard()
    .id(5202)
    .name("Surtr's Totem")
    .manaCost(2)
    .attack(0)
    .health(3)
    .description("Adjacent minions have +2 Attack.")
    .type("minion")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .race("Spirit")
    .customProperty("aura", {
      type: "attack_buff",
      value: 2,
      targetType: "adjacent_minions"
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // SHAMAN SPELLS

  // Thor's Strike
  createCard()
    .id(5221)
    .name("Thor's Strike")
    .manaCost(1)
    .description("Deal 3 damage. Overload: (1)")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("overload")
    .spellEffect({
      type: "damage",
      value: 3,
      targetType: "any",
      requiresTarget: true
    })
    .customProperty("overload", {
      value: 1
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Thor's Fury
  createCard()
    .id(5222)
    .name("Thor's Fury")
    .manaCost(3)
    .description("Deal 2-3 damage to all enemy minions. Overload: (2)")
    .type("spell")
    .rarity("rare")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("overload")
    .spellEffect({
      type: "aoe_damage",
      value: 2, // Base damage value (will be randomized between 2-3 in implementation)
      targetType: "all_enemy_minions"
    })
    .customProperty("overload", {
      value: 2
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Loki's Trick
  createCard()
    .id(5223)
    .name("Loki's Trick")
    .manaCost(4)
    .description("Transform a minion into a 0/1 Frog with Taunt.")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "transform",
      targetType: "any_minion",
      requiresTarget: true,
      summonCardId: 5251 // Frog token ID
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // MODERN SHAMAN SPELLS

  // Dunk Tank
  createCard()
    .id(5224)
    .name("Dunk Tank")
    .manaCost(4)
    .description("Deal 4 damage to a minion. Spellburst: Deal 2 damage to all enemy minions.")
    .type("spell")
    .rarity("rare")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("spellburst")
    .spellEffect({
      type: "damage",
      value: 4,
      targetType: "any_minion",
      requiresTarget: true
    })
    .customProperty("spellburstEffect", {
      type: "aoe_damage",
      value: 2,
      targetType: "all_enemy_minions"
    })
    .collectible(true)
    .addCategory("modern")
    .build();

  // Landslide
  createCard()
    .id(5225)
    .name("Landslide")
    .manaCost(2)
    .description("Deal 1 damage to all minions. If you Overloaded this turn, deal 1 damage again.")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("overload")
    .spellEffect({
      type: "aoe_damage",
      value: 1,
      targetType: "all_minions",
      condition: "overloaded_this_turn",
      bonusEffect: {
        type: "aoe_damage",
        value: 1,
        targetType: "all_minions"
      }
    })
    .collectible(true)
    .addCategory("modern")
    .build();

  // LEGENDARY SHAMAN CARDS

  // Nerida, Wave Keeper
  createCard()
    .id(5115)
    .name("Nerida, Wave Keeper")
    .manaCost(3)
    .attack(4)
    .health(3)
    .description("Spell Damage +1. Deathrattle: Shuffle 'Nerida Prime' into your deck.")
    .type("minion")
    .rarity("mythic")
    .heroClass("shaman")
    .class("Shaman")
    .race("Naga")
    .addKeyword("spell_damage")
    .addKeyword("deathrattle")
    .customProperty("spellDamage", {
      value: 1
    })
    .deathrattle({
      type: "shuffle_into_deck",
      summonCardId: 5252,
      targetType: "none"
    })
    .collectible(true)
    .addCategory("legendary")
    .build();

  // Leviathan's Child
  createCard()
    .id(5116)
    .name("Leviathan's Child")
    .manaCost(6)
    .attack(6)
    .health(5)
    .description("Battlecry: Deal 3 damage to an enemy minion. If it dies, repeat on one of its neighbors.")
    .type("minion")
    .rarity("mythic")
    .heroClass("shaman")
    .class("Shaman")
    .race("Beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      value: 3,
      targetType: 'enemy_minion',
      requiresTarget: true
    })
    .customProperty("chainDamage", true)
    .collectible(true)
    .addCategory("legendary")
    .build();

  // Aeolus, Wind Tyrant
  createCard()
    .id(5117)
    .name("Aeolus, Wind Tyrant")
    .manaCost(8)
    .attack(3)
    .health(5)
    .description("Charge, Divine Shield, Taunt, Windfury")
    .type("minion")
    .rarity("mythic")
    .heroClass("shaman")
    .class("Shaman")
    .race("Elemental")
    .addKeyword("charge")
    .addKeyword("divine_shield")
    .addKeyword("taunt")
    .addKeyword("windfury")
    .collectible(true)
    .addCategory("legendary")
    .build();

  // CLASSIC SHAMAN SPELLS

  // Berserker's Rage
  createCard()
    .id(5118)
    .name("Berserker's Rage")
    .manaCost(5)
    .description("Give your minions +3 Attack this turn.")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_minions",
      duration: 1
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Gaia's Tremor
  createCard()
    .id(5119)
    .name("Gaia's Tremor")
    .manaCost(1)
    .description("Silence a minion, then deal 1 damage to it.")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "silence_and_damage",
      value: 1,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Surtr's Flame
  createCard()
    .id(5120)
    .name("Surtr's Flame")
    .manaCost(3)
    .description("Deal 5 damage. Overload: (2)")
    .type("spell")
    .rarity("rare")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("overload")
    .spellEffect({
      type: "damage",
      value: 5,
      targetType: "any",
      requiresTarget: true
    })
    .customProperty("overload", { value: 2 })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Eir's Touch
  createCard()
    .id(5121)
    .name("Eir's Touch")
    .manaCost(2)
    .description("Give a minion 'Deathrattle: Resummon this minion.'")
    .type("spell")
    .rarity("rare")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "grant_deathrattle",
      targetType: "any_minion",
      requiresTarget: true
    })
    .customProperty("grantedDeathrattle", { type: "resummon" })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Fenrir's Spirit
  createCard()
    .id(5122)
    .name("Fenrir's Spirit")
    .manaCost(3)
    .description("Summon two 2/3 Spirit Wolves with Taunt. Overload: (2)")
    .type("spell")
    .rarity("rare")
    .heroClass("shaman")
    .class("Shaman")
    .addKeyword("overload")
    .spellEffect({
      type: "summon",
      count: 2,
      summonCardId: 5253,
      targetType: "none"
    })
    .customProperty("overload", { value: 2 })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Aesir's Wrath
  createCard()
    .id(5123)
    .name("Aesir's Wrath")
    .manaCost(2)
    .description("Give a minion Windfury.")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "grant_keyword",
      keyword: "windfury",
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Stone Breaker
  createCard()
    .id(5124)
    .name("Stone Breaker")
    .manaCost(2)
    .description("Give a friendly character +3 Attack this turn.")
    .type("spell")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_character",
      requiresTarget: true,
      duration: 1
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Odin's Eye
  createCard()
    .id(5125)
    .name("Odin's Eye")
    .manaCost(3)
    .description("Draw a card. That card costs (3) less.")
    .type("spell")
    .rarity("rare")
    .heroClass("shaman")
    .class("Shaman")
    .spellEffect({
      type: "draw",
      value: 1,
      targetType: "none"
    })
    .customProperty("costReduction", { amount: 3 })
    .collectible(true)
    .addCategory("classic")
    .build();

  // TOKEN CARDS

  // Spirit Wolf (Token from Fenrir's Call)
  createCard()
    .id(5253)
    .name("Spirit Wolf")
    .manaCost(2)
    .attack(2)
    .health(3)
    .description("Taunt")
    .type("minion")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .race("Beast")
    .addKeyword("taunt")
    .collectible(false)
    .addCategory("token")
    .build();

  // Frog (Token from Hex)
  createCard()
    .id(5251)
    .name("Frog")
    .manaCost(0)
    .attack(0)
    .health(1)
    .description("Taunt")
    .type("minion")
    .rarity("common")
    .heroClass("shaman")
    .class("Shaman")
    .race("Beast")
    .addKeyword("taunt")
    .collectible(false)
    .addCategory("token")
    .build();

  // Nerida Prime (Token from Nerida, Wave Keeper)
  createCard()
    .id(5252)
    .name("Nerida Prime")
    .manaCost(7)
    .attack(5)
    .health(4)
    .description("Spell Damage +1. Battlecry: Draw 3 spells. Reduce their Cost by (3).")
    .type("minion")
    .rarity("mythic")
    .heroClass("shaman")
    .class("Shaman")
    .race("Naga")
    .addKeyword("spell_damage")
    .addKeyword("battlecry")
    .customProperty("spellDamage", {
      value: 1
    })
    .battlecry({
      type: "draw",
      count: 3,
      value: 3,
      cardType: "spell"
    })
    .customProperty("costReduction", {
      amount: 3,
      duration: "turn_end"
    })
    .collectible(false)
    .addCategory("token")
    .build();

  if (IS_DEV) debug.card('Shaman cards registered successfully.');
}
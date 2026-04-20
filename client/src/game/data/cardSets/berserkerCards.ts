/**
 * Berserker Cards Collection
 * 
 * This file contains Berserker-specific cards using the card builder API.
 * Berserker cards focus on aggressive attack strategies, outcast mechanics, and fel magic.
 * 
 * Core Mechanics:
 * - Outcast: Special effects when played from leftmost or rightmost position
 * - Attack bonuses: Cards that enhance the hero's attack power
 * - Fel magic: Destructive spells and titan synergy
 * - Mobility: Cards with aggressive positioning and tempo
 */
import { debug } from '../../config/debugConfig';
import { SpellTargetType } from "../../types";
import { createCard } from "../cardManagement/cardBuilder";

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Berserker cards in the registry
 * Card IDs:
 * - Berserker minion cards: 90xx series
 * - Berserker spell cards: 91xx series
 * - Berserker weapons: 92xx series
 * - Berserker tokens: 99xx series
 */
export function registerBerserkerCards(): void {
  if (IS_DEV) debug.card('Registering Berserker cards...');

  // Chaos Strike
  createCard()
    .id(9101)
    .name("Chaos Strike")
    .manaCost(2)
    .description("Give your hero +2 Attack this turn. Draw a card.")
    .flavorText("First lesson of Berserker training: Hit face.")
    .type("spell")
    .rarity("common")
    .class("Berserker")
    .spellEffect({
      type: "hero_attack_buff",
      value: 2
    })
    .customProperty("duration", "current_turn")
    .customProperty("drawCards", 1)
    .collectible(true)
    .build();

  // Soul Cleave
  createCard()
    .id(9102)
    .name("Soul Cleave")
    .manaCost(3)
    .description("Deal 2 damage to two random enemy minions. Restore 2 Health to your hero.")
    .flavorText("It's like a hot knife through butter, except the knife is runic, the butter is souls, and you're stabbing everyone.")
    .type("spell")
    .rarity("common")
    .class("Berserker")
    .spellEffect({
      type: "multi_target_damage_heal",
      value: 2,
      targetType: "random_enemy_minions"
    })
    .customProperty("targetCount", 2)
    .customProperty("healValue", 2)
    .collectible(true)
    .build();

  // Blur
  createCard()
    .id(9103)
    .name("Blur")
    .manaCost(0)
    .description("Your hero can't take damage this turn.")
    .flavorText("The first rule of Berserker fight club is: you can't hit what you can't see.")
    .type("spell")
    .rarity("rare")
    .class("Berserker")
    .spellEffect({
      type: "grant_immunity",
      targetType: "friendly_hero"
    })
    .customProperty("duration", "current_turn")
    .collectible(true)
    .build();

  // Mana Burn
  createCard()
    .id(9104)
    .name("Mana Burn")
    .manaCost(1)
    .description("Your opponent has 2 fewer Mana Crystals next turn.")
    .flavorText("The best defense is a good offense, and the best offense is making sure your opponent can't play anything.")
    .type("spell")
    .rarity("rare")
    .class("Berserker")
    .spellEffect({
      type: "reduce_opponent_mana",
      value: 2
    })
    .customProperty("duration", "next_turn")
    .collectible(true)
    .build();

  // Skull of the Damned
  createCard()
    .id(9105)
    .name("Skull of the Damned")
    .manaCost(6)
    .description("Draw 3 cards. Outcast: Reduce their Cost by (3).")
    .flavorText("This might look like a powerful dark artifact to you, but to Typhon it's just a fancy candy dish.")
    .type("spell")
    .rarity("mythic")
    .class("Berserker")
    .addKeyword("outcast")
    .spellEffect({
      type: "draw",
      value: 3
    })
    .customProperty("outcast", {
      type: "reduce_drawn_card_cost",
      value: 3
    })
    .collectible(true)
    .build();

  // Runebound Adept
  createCard()
    .id(9111)
    .name("Runebound Adept")
    .manaCost(5)
    .attack(6)
    .health(4)
    .description("Battlecry: If your hero attacked this turn, deal 4 damage.")
    .flavorText("She bound her glaives so she would stop losing them around the house.")
    .type("minion")
    .rarity("rare")
    .class("Berserker")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage",
      value: 4,
      targetType: "any",
      requiresTarget: true,
      condition: "hero_attacked_this_turn"
    })
    .collectible(true)
    .build();

  // Altruis the Outcast
  createCard()
    .id(9112)
    .name("Altruis the Outcast")
    .manaCost(4)
    .attack(4)
    .health(3)
    .description("After you play the left- or right-most card in your hand, deal 1 damage to all enemies.")
    .flavorText("Being an outcast has some perks. Like sitting anywhere you want in the cafeteria.")
    .type("minion")
    .rarity("mythic")
    .class("Berserker")
    .customProperty("outcastTriggerEffect", {
      type: "damage_all_enemies",
      value: 1
    })
    .collectible(true)
    .build();

  // Metamorphosis
  createCard()
    .id(9113)
    .name("Metamorphosis")
    .manaCost(5)
    .description("Swap your Hero Power to \"Deal 4 damage.\" After 2 uses, swap back.")
    .flavorText("It's just a phase.")
    .type("spell")
    .rarity("mythic")
    .class("Berserker")
    .spellEffect({
      type: "swap_hero_power"
    })
    .customProperty("heroPowerId", 9114) // Berserker Blast hero power
    .customProperty("usesBeforeSwapBack", 2)
    .collectible(true)
    .build();

  // Berserker Blast (Hero Power from Metamorphosis)
  createCard()
    .id(9114)
    .name("Berserker Blast")
    .manaCost(1)
    .description("Deal 4 damage.")
    .flavorText("After 2 uses, swap back.")
    .type("spell")
    .rarity("mythic")
    .class("Berserker")
    .spellEffect({
      type: "damage",
      value: 4,
      targetType: "any",
      requiresTarget: true
    })
    .collectible(false)
    .build();

  // Coordinated Strike
  createCard()
    .id(9116)
    .name("Coordinated Strike")
    .manaCost(3)
    .description("Summon three 1/1 Ulfhednar with Rush.")
    .flavorText("The Ulfhednar coordinate all their attacks because otherwise they look very silly.")
    .type("spell")
    .rarity("common")
    .class("Berserker")
    .spellEffect({
      type: "summon",
      value: 3,
      summonCardId: 9117 // Ulfhednar Initiate
    })
    .collectible(true)
    .build();

  // Ulfhednar Initiate (token from Coordinated Strike)
  createCard()
    .id(9117)
    .name("Ulfhednar Initiate")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Rush")
    .flavorText("They're very eager to prove themselves. Sometimes a little too eager.")
    .type("minion")
    .rarity("common")
    .class("Berserker")
    .addKeyword("rush")
    .collectible(false)
    .build();

  // Eye Beam
  createCard()
    .id(50001)
    .name("Eye Beam")
    .manaCost(3)
    .description("Deal 3 damage to a minion. Outcast: This costs (1).")
    .flavorText("Typhon's optometrist suggested he get glasses. Typhon suggested the optometrist get a new career.")
    .type("spell")
    .rarity("rare")
    .class("Berserker")
    .addKeyword("outcast")
    .spellEffect({
      type: "damage",
      value: 3,
      requiresTarget: true,
      targetType: "any_minion"
    })
    .customProperty("outcast", {
      type: "mana_discount",
      manaDiscount: 2,
      targetRequired: false
    })
    .collectible(true)
    .build();

  // Spectral Sight
  createCard()
    .id(50002)
    .name("Spectral Sight")
    .manaCost(2)
    .description("Draw a card. Outcast: Draw another.")
    .flavorText("When you sacrifice your eyes for power, you develop other ways of seeing. Like echolocation. Or really good hearing.")
    .type("spell")
    .rarity("common")
    .class("Berserker")
    .addKeyword("outcast")
    .spellEffect({
      type: "draw",
      value: 1
    })
    .customProperty("outcast", {
      type: "draw",
      value: 1
    })
    .collectible(true)
    .build();

  // Flamereaper
  createCard()
    .id(10008)
    .name("Flamereaper")
    .manaCost(7)
    .attack(3)
    .durability(2)
    .description("Also attacks the minions next to whomever your hero attacks.")
    .flavorText("It's a whirlwind of burning fel destruction. Doubles as a pizza cutter.")
    .type("weapon")
    .rarity("epic")
    .class("Berserker")
    .customProperty("cleaveEffect", {
      type: "attack_adjacent",
      value: 3
    })
    .collectible(true)
    .build();

  // Imprisoned Antaen
  createCard()
    .id(10009)
    .name("Imprisoned Antaen")
    .manaCost(5)
    .attack(10)
    .health(6)
    .description("Dormant for 2 turns. When this awakens, deal 10 damage randomly split among all enemies.")
    .flavorText("His 'time out' is over and he's ready to play.")
    .type("minion")
    .rarity("rare")
    .race("Titan")
    .class("Berserker")
    .addKeyword("dormant")
    .customProperty("dormantTurns", 2)
    .customProperty("awakenEffect", {
      type: "damage",
      targetType: "all_enemy_minions_and_hero",
      value: 1,
      isSplit: true,
      targetsCount: 10,
      isRandom: true
    })
    .collectible(true)
    .build();

  if (IS_DEV) debug.card('Berserker cards registered successfully.');
}
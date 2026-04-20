/**
 * Mage Cards Collection
 * 
 * This file contains Mage-specific cards using the card builder API.
 * Mage cards focus on spell damage, freeze effects, and secrets.
 * 
 * Core Mechanics:
 * - Spell Damage: Increase the damage of spells
 * - Freeze: Prevent minions from attacking for a turn
 * - Secrets: Hidden effects that trigger on specific conditions
 * - Direct Damage: Spells that deal damage to minions and heroes
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { SpellTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Mage cards in the registry
 * Card IDs: 
 * - Regular Mage minion cards: 14xxx series
 * - Mage spell cards: 32xxx series
 * - Mage secrets: 31xxx series
 * - Mage tokens: 3xxxx series
 */
export function registerMageCards(): void {
  if (IS_DEV) debug.card('Registering Mage cards...');

  // MAGE MINION CARDS
  
  // Mana Wyrm
  createCard()
    .id(14001)
    .name("Eitr Serpent")
    .manaCost(1)
    .attack(1)
    .health(3)
    .description("Whenever you cast a spell, gain +1 Attack.")
    .rarity("common")
    .type("minion")
    .class("Mage")
    .addKeyword("spell_trigger")
    .customProperty("spellTrigger", {
      effect: "gain_attack",
      value: 1
    })
    .collectible(true)
    .build();

  // Sorcerer's Apprentice
  createCard()
    .id(14002)
    .name("Runecaster's Pupil")
    .manaCost(2)
    .attack(3)
    .health(2)
    .description("Your spells cost (1) less.")
    .rarity("common")
    .type("minion")
    .class("Mage")
    .customProperty("aura", {
      type: "spell_cost_reduction",
      value: 1
    })
    .collectible(true)
    .build();

  // Rune Council Mage
  createCard()
    .id(14003)
    .name("Völva of Seidr")
    .manaCost(3)
    .attack(4)
    .health(3)
    .description("Battlecry: The next Rune you play this turn costs (0).")
    .rarity("rare")
    .type("minion")
    .class("Mage")
    .addKeyword("battlecry")
    .customProperty("secretCostReduction", {
      value: -1, // Reduce to 0
      duration: "turn_end"
    })
    .collectible(true)
    .build();

  // Ethereal Arcanist
  createCard()
    .id(14004)
    .name("Aether Völva")
    .manaCost(4)
    .attack(3)
    .health(3)
    .description("If you control a Rune at the end of your turn, gain +2/+2.")
    .rarity("rare")
    .type("minion")
    .class("Mage")
    .customProperty("turnEndEffect", {
      type: "conditional_buff",
      condition: "control_secret",
      attackBuff: 2,
      healthBuff: 2
    })
    .collectible(true)
    .build();

  // Flame-Bearer of Surtr
  createCard()
    .id(14005)
    .name("Flame-Bearer of Surtr")
    .manaCost(7)
    .attack(5)
    .health(7)
    .description("Whenever you cast a spell, add a 'Muspel Flame' spell to your hand.")
    .rarity("mythic")
    .type("minion")
    .class("Mage")
    .addKeyword("spell_trigger")
    .customProperty("spellTrigger", {
      effect: "add_card_to_hand",
      cardId: 10003 // Fireball ID
    })
    .collectible(true)
    .build();

  // Frostweaver Spirit (formerly Water Elemental)
  createCard()
    .id(14006)
    .name("Frostweaver Spirit")
    .manaCost(4)
    .attack(3)
    .health(6)
    .description("Freeze any character damaged by this minion.")
    .flavorText("Born from the icy mists of Niflheim, it weaves frost into every strike.")
    .rarity("common")
    .type("minion")
    .class("Mage")
    .race("elemental")
    .addKeyword("freeze_on_damage")
    .collectible(true)
    .build();

  // MAGE SPELL CARDS
  
  // Polymorph
  createCard()
    .id(14009)
    .name("Loki's Shapecraft")
    .manaCost(4)
    .description("Transform a minion into a 1/1 Sheep.")
    .flavorText("Loki became a mare, a salmon, a fly, and an old woman. Turning you into a sheep is barely an inconvenience. (Gylfaginning 33-51)")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "transform",
      targetType: "any_minion",
      requiresTarget: true,
      summonCardId: 14010
    })
    .collectible(true)
    .build();

  // Sheep (token)
  createCard()
    .id(14010)
    .name("Sheep")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("")
    .flavorText("Baaaaaaa.")
    .rarity("common")
    .type("minion")
    .class("Neutral")
    .race("beast")
    .collectible(false)
    .build();

  // Vaporize
  createCard()
    .id(14012)
    .name("Mist Vaporization")
    .manaCost(3)
    .description("Rune: When a minion attacks your hero, destroy it.")
    .flavorText("Rumor has it that this spell was created by a Mage who got tired of losing to Priests.")
    .rarity("rare")
    .type("spell")
    .class("Mage")
    .addKeyword("secret")
    .customProperty("secretEffect", {
      type: "destroy_minion",
      triggerType: "on_minion_attack",
      target: "attacking_minion",
      condition: "targets_hero"
    })
    .collectible(true)
    .build();

  // Ice Lance
  createCard()
    .id(14013)
    .name("Skadi's Lance")
    .manaCost(1)
    .description("Freeze a character. If it was already Frozen, deal 4 damage instead.")
    .flavorText("Anyone can learn to swivel an Ice Lance with only three days of practice.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .addKeyword("freeze")
    .spellEffect({
      type: "conditional_freeze_or_damage",
      value: 4,
      targetType: "any",
      requiresTarget: true,
      condition: "is_frozen"
    })
    .collectible(true)
    .build();

  // Unstable Portal
  createCard()
    .id(31002)
    .name("Bifrost Gateway")
    .manaCost(2)
    .description("Add a random minion to your hand. It costs (3) less.")
    .rarity("rare")
    .type("spell")
    .class("Mage")
    .addKeyword("discover")
    .spellEffect({
      type: "discover",
      discoveryType: "minion",
      discoveryCount: 1,
      targetType: "none",
      requiresTarget: false
    })
    .customProperty("manaReduction", 3)
    .collectible(true)
    .build();

  // Ice Block
  createCard()
    .id(31004)
    .name("Frozen Bastion")
    .manaCost(3)
    .description("Rune: When your hero takes fatal damage, prevent it and become Immune this turn.")
    .rarity("epic")
    .type("secret")
    .class("Mage")
    .addKeyword("secret")
    .customProperty("secretEffect", {
      triggerType: "on_hero_attack",
      effect: {
        type: "damage",
        value: 0,
        targetType: "friendly_hero",
        requiresTarget: true,
        immuneEffect: true
      }
    })
    .collectible(true)
    .build();
    
  // Arcane Blast
  createCard()
    .id(32001)
    .name("Rune Blast")
    .manaCost(1)
    .description("Deal 2 damage to a minion. This spell gets +2 damage from Spell Damage.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 2,
      targetType: "any_minion",
      requiresTarget: true
    })
    .customProperty("spellDamageMultiplier", 2)
    .collectible(true)
    .build();

  // Arcane Missiles
  createCard()
    .id(32002)
    .name("Runic Barrage")
    .manaCost(1)
    .description("Deal 3 damage randomly split among all enemy characters.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 3,
      targetType: "random_enemies",
      requiresTarget: false
    })
    .customProperty("isRandomlySplit", true)
    .collectible(true)
    .build();

  // Fireball
  createCard()
    .id(32003)
    .name("Surtr's Wrath")
    .manaCost(4)
    .description("Deal 6 damage.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 6,
      targetType: "any_character",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Frost Nova
  createCard()
    .id(32004)
    .name("Jötunheim Freeze")
    .manaCost(3)
    .description("Freeze all enemy minions.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "aoe_damage",
      value: 0,
      targetType: "all_enemy_minions",
      requiresTarget: false
    })
    .customProperty("freezeTarget", true)
    .collectible(true)
    .build();

  // Frostbolt
  createCard()
    .id(32005)
    .name("Skadi's Arrow")
    .manaCost(2)
    .description("Deal 3 damage to a character and Freeze it.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 3,
      targetType: "any_character",
      requiresTarget: true
    })
    .customProperty("freezeTarget", true)
    .collectible(true)
    .build();

  // Arcane Intellect
  createCard()
    .id(32006)
    .name("Athena's Wisdom")
    .manaCost(3)
    .description("Draw 2 cards.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "draw",
      value: 2,
      targetType: "none",
      requiresTarget: false
    })
    .collectible(true)
    .build();

  // Polymorph
  createCard()
    .id(32007)
    .name("Loki's Shapecraft")
    .manaCost(4)
    .description("Transform a minion into a 1/1 Sheep.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .addKeyword("transform")
    .spellEffect({
      type: "transform",
      targetType: "any_minion",
      requiresTarget: true,
      transformInto: 31025
    })
    .collectible(true)
    .build();

  // Mirror Image
  createCard()
    .id(32008)
    .name("Gemini Illusion")
    .manaCost(1)
    .description("Summon two 0/2 minions with Taunt.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "summon",
      summonCardId: 32031, // Mirror Image token
      count: 2,
      targetType: "none",
      requiresTarget: false
    })
    .collectible(true)
    .build();

  createCard()
    .id(32009)
    .name("Niflheim's Embrace")
    .manaCost(6)
    .description("Deal 2 damage to all enemy minions and Freeze them.")
    .rarity("rare")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "aoe_damage",
      value: 2,
      targetType: "all_enemy_minions",
      requiresTarget: false
    })
    .customProperty("freezeTarget", true)
    .collectible(true)
    .build();

  // Flamestrike
  createCard()
    .id(32010)
    .name("Muspelheim's Fury")
    .manaCost(7)
    .description("Deal 4 damage to all enemy minions.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "aoe_damage",
      value: 4,
      targetType: "all_enemy_minions",
      requiresTarget: false
    })
    .collectible(true)
    .build();

  // Cone of Cold
  createCard()
    .id(32011)
    .name("Thrymr's Breath")
    .manaCost(4)
    .description("Deal 1 damage to a minion and the minions next to it, and Freeze them.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "cleave_damage",
      value: 1,
      targetType: "any_minion",
      requiresTarget: true
    })
    .customProperty("freezeTarget", true)
    .collectible(true)
    .build();

  // Arcane Explosion
  createCard()
    .id(32012)
    .name("Seidr Burst")
    .manaCost(2)
    .description("Deal 1 damage to all enemy minions.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "aoe_damage",
      value: 1,
      targetType: "all_enemy_minions",
      requiresTarget: false
    })
    .collectible(true)
    .build();

  // Pyroblast
  createCard()
    .id(32013)
    .name("Helios Inferno")
    .manaCost(10)
    .description("Deal 10 damage.")
    .rarity("epic")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 10,
      targetType: "any_character",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Flame Lance
  createCard()
    .id(32014)
    .name("Muspel Lance")
    .manaCost(5)
    .description("Deal 8 damage to a minion.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 8,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Dragon's Breath
  createCard()
    .id(32015)
    .name("Jörmungandr's Breath")
    .manaCost(5)
    .description("Deal 4 damage. Costs (1) less for each minion that died this turn.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 4,
      targetType: "any_character",
      requiresTarget: true
    })
    .customProperty("costReductionPerDeadMinion", 1)
    .collectible(true)
    .build();

  // Arcane Brilliance
  createCard()
    .id(32016)
    .name("Odin's Brilliance")
    .manaCost(6)
    .description("Add 3 random Mage spells to your hand.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "discover",
      discoveryType: "spell",
      discoveryClass: "Mage",
      discoveryCount: 3,
      targetType: "none",
      requiresTarget: false,
      autoSelect: true
    })
    .collectible(true)
    .build();

  // Spellbender (Secret)
  createCard()
    .id(32017)
    .name("Rune Deflection")
    .manaCost(3)
    .description("Rune: When an enemy casts a spell on a minion, summon a 1/3 as the new target.")
    .rarity("epic")
    .type("secret")
    .class("Mage")
    .addKeyword("secret")
    .customProperty("secretEffect", {
      triggerType: "on_spell_cast",
      effect: {
        type: "redirect_spell",
        summonCardId: 32032,
        requiresTarget: false,
        targetType: "none"
      }
    })
    .collectible(true)
    .build();

  // Mirror Entity (Secret)
  createCard()
    .id(32018)
    .name("Mirror Reflection")
    .manaCost(3)
    .description("Rune: After your opponent plays a minion, summon a copy of it.")
    .rarity("common")
    .type("secret")
    .class("Mage")
    .addKeyword("secret")
    .customProperty("secretEffect", {
      triggerType: "on_minion_summon",
      effect: {
        type: "summon_copy",
        requiresTarget: false,
        targetType: "none"
      }
    })
    .collectible(true)
    .build();

  // Counterspell (Secret)
  createCard()
    .id(32019)
    .name("Rune Counter")
    .manaCost(3)
    .description("Rune: When your opponent casts a spell, Counter it.")
    .rarity("rare")
    .type("secret")
    .class("Mage")
    .addKeyword("secret")
    .customProperty("secretEffect", {
      triggerType: "on_spell_cast",
      effect: {
        type: "counter_spell",
        requiresTarget: false,
        targetType: "none"
      }
    })
    .collectible(true)
    .build();

  // Vaporize (Secret)
  createCard()
    .id(32020)
    .name("Mist Vaporization")
    .manaCost(3)
    .description("Rune: When a minion attacks your hero, destroy it.")
    .rarity("rare")
    .type("secret")
    .class("Mage")
    .addKeyword("secret")
    .customProperty("secretEffect", {
      triggerType: "on_hero_attack",
      effect: {
        type: "destroy",
        requiresTarget: false,
        targetType: "none"
      }
    })
    .collectible(true)
    .build();

  // Arcane Barrage
  createCard()
    .id(32021)
    .name("Rune Barrage")
    .manaCost(3)
    .description("Deal 3 damage to a minion and 3 damage to adjacent ones.")
    .rarity("rare")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "cleave_damage",
      value: 3,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Shatter
  createCard()
    .id(32022)
    .name("Shatter")
    .manaCost(2)
    .description("Destroy a Frozen minion.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "destroy",
      targetType: "frozen_minion",
      requiresTarget: true,
      condition: "is_frozen"
    })
    .collectible(true)
    .build();

  // Forgotten Torch
  createCard()
    .id(32023)
    .name("Ancient Flame")
    .manaCost(3)
    .description("Deal 3 damage. Shuffle a 'Eternal Flame' into your deck that deals 6 damage.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage_and_shuffle",
      value: 3,
      targetType: "any_character",
      requiresTarget: true,
      shuffleCardId: 32033
    })
    .collectible(true)
    .build();

  // Cabalist's Tome
  createCard()
    .id(32024)
    .name("Völva's Grimoire")
    .manaCost(5)
    .description("Add 3 random Mage spells to your hand.")
    .rarity("epic")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "discover",
      discoveryType: "spell",
      discoveryClass: "Mage",
      discoveryCount: 3,
      targetType: "none",
      requiresTarget: false,
      autoSelect: true
    })
    .collectible(true)
    .build();

  // Frost Lance
  createCard()
    .id(32025)
    .name("Icy Javelin")
    .manaCost(2)
    .description("Deal 4 damage to a minion. If it's Frozen, deal 8 damage instead.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "conditional_damage",
      value: 4,
      enhancedValue: 8,
      targetType: "any_minion",
      requiresTarget: true,
      condition: "is_frozen"
    })
    .collectible(true)
    .build();

  // Glacial Spike
  createCard()
    .id(32026)
    .name("Glacial Spike")
    .manaCost(5)
    .description("Deal 4 damage to a minion and Freeze adjacent ones.")
    .rarity("rare")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "cleave_damage_with_freeze",
      value: 4,
      targetType: "any_minion",
      requiresTarget: true,
      freezeAdjacent: true
    })
    .collectible(true)
    .build();

  // Arcane Surge
  createCard()
    .id(32027)
    .name("Rune Surge")
    .manaCost(4)
    .description("Draw a card. Deal damage equal to its Cost.")
    .rarity("rare")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "draw_and_damage",
      targetType: "any_character",
      requiresTarget: true,
      drawCards: 1,
      damageBasedOnDrawnCardCost: true
    })
    .collectible(true)
    .build();

  // Elemental Evocation
  createCard()
    .id(32028)
    .name("Element Calling")
    .manaCost(0)
    .description("The next Elemental you play this turn costs (2) less.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "cost_reduction",
      value: 2,
      targetType: "none",
      requiresTarget: false,
      specificRace: "elemental",
      temporaryEffect: true
    })
    .collectible(true)
    .build();

  // Research Project
  createCard()
    .id(32029)
    .name("Scroll of Discovery")
    .manaCost(2)
    .description("Each player draws 2 cards.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "draw_both",
      value: 2,
      targetType: "none",
      requiresTarget: false
    })
    .collectible(true)
    .build();

  // Snap Freeze
  createCard()
    .id(32030)
    .name("Snap Freeze")
    .manaCost(2)
    .description("Freeze a minion. If it's already Frozen, destroy it.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "conditional_freeze_or_destroy",
      targetType: "any_minion",
      requiresTarget: true,
      condition: "is_frozen"
    })
    .collectible(true)
    .build();

  // Token: Mirror Image minion
  createCard()
    .id(32031)
    .name("Gemini Illusion")
    .manaCost(0)
    .attack(0)
    .health(2)
    .description("Taunt")
    .rarity("common")
    .type("minion")
    .class("Mage")
    .addKeyword("taunt")
    .collectible(false)
    .build();

  // Token: Spellbender
  createCard()
    .id(32032)
    .name("Spellbender")
    .manaCost(0)
    .attack(1)
    .health(3)
    .description("")
    .rarity("common")
    .type("minion")
    .class("Mage")
    .collectible(false)
    .build();

  // Token: Roaring Torch
  createCard()
    .id(32033)
    .name("Eternal Flame")
    .manaCost(3)
    .description("Deal 6 damage.")
    .rarity("common")
    .type("spell")
    .class("Mage")
    .spellEffect({
      type: "damage",
      value: 6,
      targetType: "any_character",
      requiresTarget: true
    })
    .collectible(false)
    .build();

  if (IS_DEV) debug.card('Mage cards registered successfully.');
}
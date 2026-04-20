/**
 * Basic Mage Cards
 * 
 * A collection of basic mage cards using the new card management system.
 * This demonstrates the usage of the card builder API.
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register basic mage cards in the registry
 */
export function registerBasicMageCards(): void {
  if (IS_DEV) debug.card('Registering basic mage cards...');

  // Apprentice Arcanist
  createCard()
    .id(10001)
    .name("Runecaster's Apprentice")
    .manaCost(1)
    .attack(1)
    .health(2)
    .description("Spell Damage +1")
    .rarity("common")
    .type("minion")
    .heroClass("mage")
    .addKeyword("spell_damage")
    .addCategory("basic")
    .addCategory("spell_damage")
    .collectible(true)
    .build();
  
  // Frost Elemental
  createCard()
    .id(10002)
    .name("Frost Elemental")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Battlecry: Freeze a character.")
    .rarity("rare")
    .type("minion")
    .heroClass("mage")
    .race("elemental")
    .addKeyword("battlecry")
    .battlecry({
      type: "freeze",
      targetType: "any", // Using string literal for simplicity
      requiresTarget: true
    })
    .addCategory("basic")
    .build();
  
  // Fireball
  createCard()
    .id(10003)
    .name("Surtr's Wrath")
    .manaCost(4)
    .description("Deal 6 damage.")
    .rarity("common")
    .type("spell")
    .heroClass("mage")
    .spellEffect({
      type: "deal_damage",
      value: 6,
      targetType: "any_character",
      requiresTarget: true
    })
    .addCategory("basic")
    .build();
  
  // Niflheim Sprite (formerly Water Elemental)
  // Note: This card already has a Norse-themed name
  createCard()
    .id(10004)
    .name("Niflheim Sprite")
    .manaCost(4)
    .attack(3)
    .health(6)
    .description("Freeze any character damaged by this minion.")
    .flavorText("A frigid spirit from Niflheim, the realm of ice and mist.")
    .rarity("common")
    .type("minion")
    .heroClass("mage")
    .race("elemental")
    .addKeyword("freeze_on_damage")
    .addCategory("basic")
    .build();
  
  // Polymorph
  createCard()
    .id(10005)
    .name("Loki's Shapecraft")
    .manaCost(4)
    .description("Transform a minion into a 1/1 Sheep.")
    .rarity("common")
    .type("spell")
    .heroClass("mage")
    .spellEffect({
      type: "transform",
      targetType: "minion",
      requiresTarget: true,
      summonCardId: 10006 // Sheep token
    })
    .addCategory("basic")
    .build();
  
  // Sheep (token)
  createCard()
    .id(10006)
    .name("Sheep")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .collectible(false) // Token card
    .addCategory("token")
    .build();
  
  // Flamestrike
  createCard()
    .id(10007)
    .name("Muspelheim's Fury")
    .manaCost(7)
    .description("Deal 4 damage to all enemy minions.")
    .rarity("common")
    .type("spell")
    .heroClass("mage")
    .spellEffect({
      type: "deal_damage",
      value: 4,
      targetType: "enemy_minions"
    })
    .addCategory("basic")
    .build();

  if (IS_DEV) debug.card('Basic mage cards registered successfully.');
}
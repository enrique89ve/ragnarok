/**
 * Paladin Cards Collection
 * 
 * This file contains Paladin-specific cards using the card builder API.
 * Paladin cards focus on divine shields, healing, buffs, and Silver Hand Recruit synergy.
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { BattlecryTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Paladin cards in the registry
 */
export function registerPaladinCards(): void {
  if (IS_DEV) debug.card('Registering Paladin cards...');

  // PALADIN SPELLS

  // Heimdall's Judgment
  createCard()
    .id(8002)
    .name("Heimdall's Judgment")
    .manaCost(4)
    .description("Deal 2 damage to all enemies.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "aoe_damage",
      value: 2,
      targetType: "all_enemy_minions"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Blessing of Odin
  createCard()
    .id(8004)
    .name("Blessing of Odin")
    .manaCost(4)
    .description("Give a minion +4/+4.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "buff",
      buffAttack: 4,
      buffHealth: 4,
      requiresTarget: true,
      targetType: "friendly_minion"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Balance of Themis
  createCard()
    .id(8005)
    .name("Balance of Themis")
    .manaCost(2)
    .description("Change the Health of ALL minions to 1.")
    .rarity("rare")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "buff",
      targetType: "all_minions"
      // Special handling required for this effect
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // PALADIN WEAPONS

  // Sword of Tyr
  createCard()
    .id(8003)
    .name("Sword of Tyr")
    .manaCost(4)
    .attack(4)
    .durability(2)
    .description("Whenever your hero attacks, restore 2 Health to it.")
    .rarity("common")
    .type("weapon")
    .heroClass("paladin")
    .class("Paladin")
    .collectible(true)
    .addCategory("basic")
    .build();

  // PALADIN TOKENS

  // Luminous Blade
  createCard()
    .id(8540)
    .name("Luminous Blade")
    .manaCost(5)
    .attack(5)
    .durability(3)
    .description("Mythic weapon wielded by Baldur's Champion.")
    .rarity("mythic")
    .type("weapon")
    .heroClass("paladin")
    .class("Paladin")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  // Einherjar Recruit
  createCard()
    .id(8502)
    .name("Einherjar Recruit")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Summoned by the Paladin Hero Power.")
    .rarity("common")
    .type("minion")
    .heroClass("paladin")
    .class("Paladin")
    .collectible(false) // Token card
    .addCategory("token")
    .build();

  // ADDITIONAL PALADIN CARDS

  // Baldur's Champion - Signature Minion
  createCard()
    .id(8001)
    .name("Baldur's Champion")
    .manaCost(8)
    .attack(6)
    .health(6)
    .description("Divine Shield. Taunt. Deathrattle: Equip a 5/3 Luminous Blade.")
    .rarity("mythic")
    .type("minion")
    .heroClass("paladin")
    .class("Paladin")
    .addKeyword("divine_shield")
    .addKeyword("taunt")
    .addKeyword("deathrattle")
    .collectible(true)
    .build();

  // Touch of Eir
  createCard()
    .id(8006)
    .name("Touch of Eir")
    .manaCost(8)
    .description("Restore 8 Health. Draw 3 cards.")
    .rarity("epic")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "heal",
      value: 8,
      drawCards: 3
    })
    .collectible(true)
    .build();

  // Baldur's Radiance
  createCard()
    .id(8007)
    .name("Baldur's Radiance")
    .manaCost(2)
    .description("Restore 6 Health.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "heal",
      value: 6,
      targetType: "any"
    })
    .collectible(true)
    .build();

  // Blessing of Freya
  createCard()
    .id(8008)
    .name("Blessing of Freya")
    .manaCost(3)
    .description("Draw cards until you have as many in hand as your opponent.")
    .rarity("rare")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .collectible(true)
    .build();

  // Thor's Wrath
  createCard()
    .id(8009)
    .name("Thor's Wrath")
    .manaCost(4)
    .description("Deal 3 damage. Draw a card.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "damage",
      value: 3,
      drawCards: 1
    })
    .collectible(true)
    .build();

  // Odin's Vengeance
  createCard()
    .id(8010)
    .name("Odin's Vengeance")
    .manaCost(6)
    .description("Deal 8 damage randomly split among all enemies.")
    .rarity("epic")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "random_damage",
      missiles: 8,
      damagePerMissile: 1
    })
    .collectible(true)
    .build();

  // Strength of Thor
  createCard()
    .id(8011)
    .name("Strength of Thor")
    .manaCost(1)
    .description("Give a minion +3 Attack.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "buff",
      buffAttack: 3,
      targetType: "friendly_minion"
    })
    .collectible(true)
    .build();

  // Baldur's Ward
  createCard()
    .id(8012)
    .name("Baldur's Ward")
    .manaCost(1)
    .description("Give a minion Divine Shield.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "grant_keyword",
      keyword: "divine_shield",
      targetType: "friendly_minion"
    })
    .collectible(true)
    .build();

  // Rune of Submission
  createCard()
    .id(8013)
    .name("Rune of Submission")
    .manaCost(1)
    .description("Change a minion's Attack to 1.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .spellEffect({
      type: "set_attack",
      value: 1,
      targetType: "any_minion"
    })
    .collectible(true)
    .build();

  // Divine Retribution (Secret)
  createCard()
    .id(8014)
    .name("Divine Retribution")
    .manaCost(1)
    .description("Rune: When your opponent plays a minion, reduce its Health to 1.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .addKeyword("secret")
    .collectible(true)
    .build();

  // Resurrection Rune (Secret)
  createCard()
    .id(8015)
    .name("Resurrection Rune")
    .manaCost(1)
    .description("Rune: When a friendly minion dies, return it to life with 1 Health.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .addKeyword("secret")
    .collectible(true)
    .build();

  // Einherjar's Valor (Secret)
  createCard()
    .id(8016)
    .name("Einherjar's Valor")
    .manaCost(1)
    .description("Rune: When an enemy attacks, summon a 2/1 Defender as the new target.")
    .rarity("common")
    .type("spell")
    .heroClass("paladin")
    .class("Paladin")
    .addKeyword("secret")
    .collectible(true)
    .build();

  if (IS_DEV) debug.card('Paladin cards registered successfully.');
}
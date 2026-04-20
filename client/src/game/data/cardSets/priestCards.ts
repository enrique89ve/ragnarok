/**
 * Priest Cards Collection
 * 
 * This file contains Priest-specific cards using the card builder API.
 * Priest cards focus on healing, control, and mind manipulation mechanics.
 * 
 * Core Mechanics:
 * - Healing: Restore health to friendly characters
 * - Mind Control: Take control of enemy minions
 * - Health/Attack manipulation: Change minion stats
 * - Card copying: Copy cards from opponent's hand or deck
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';
import { BattlecryTargetType } from '../../types';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Priest cards in the registry
 * Card IDs: 
 * - Regular Priest cards: 9xxx series
 * - Priest spell cards: 6xxx series
 * - Priest legendary cards: 5xxx series (shared with other classes)
 * - Priest tokens: 9xxx series (usually 5xx+)
 */
export function registerPriestCards(): void {
  if (IS_DEV) debug.card('Registering Priest cards...');

  // BASIC PRIEST CARDS

  // Essence of Vitality
  createCard()
    .id(9013)
    .name("Essence of Vitality")
    .manaCost(4)
    .attack(0)
    .health(5)
    .description("This minion's Attack is always equal to its Health.")
    .flavorText("I'm all for personal growth, but this little guy takes it too far.")
    .type("minion")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .customProperty("specialAbility", "attack_equals_health")
    .collectible(true)
    .addCategory("basic")
    .build();

  // Hel's Priestess
  createCard()
    .id(9014)
    .name("Hel's Priestess")
    .manaCost(4)
    .attack(3)
    .health(5)
    .description("Your cards and powers that restore Health now deal damage instead.")
    .flavorText("The priests of Hel know the end is coming, but they're not sure when.")
    .type("minion")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .customProperty("aura", {
      type: "transform_healing_to_damage",
      affects: "all_healing_effects"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Berserker's Fury
  createCard()
    .id(9016)
    .name("Berserker's Fury")
    .manaCost(1)
    .description("Change a minion's Attack to be equal to its Health.")
    .flavorText("Incinerating your opponent makes you feel all warm and tingly inside.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "attack_equals_health",
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Odin's All-Sight
  createCard()
    .id(9017)
    .name("Odin's All-Sight")
    .manaCost(1)
    .description("Put a copy of a random card in your opponent's hand into your hand.")
    .flavorText("Good artists copy, great artists steal. Art school is really expensive.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .customProperty("copyEffect", {
      type: "copy_from_opponent",
      value: 1,
      source: "hand"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Loki's Deception
  createCard()
    .id(9019)
    .name("Loki's Deception")
    .manaCost(4)
    .description("Gain control of an enemy minion with 3 or less Attack until end of turn.")
    .flavorText("You can see into their hearts, and there you will find... MADNESS!")
    .type("spell")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "mind_control_temporary",
      targetType: "enemy_minion",
      condition: "attack_less_than_4",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Well of Vitality
  createCard()
    .id(9021)
    .name("Well of Vitality")
    .manaCost(2)
    .attack(0)
    .health(5)
    .description("At the start of your turn, restore 3 Health to a damaged friendly character.")
    .flavorText("It isn't clear if people ignore the Lightwell, or if it is just invisible.")
    .type("minion")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .customProperty("turnStart", {
      type: "heal",
      value: 3,
      targetType: "random_damaged_friendly_character"
    })
    .collectible(true)
    .addCategory("basic")
    .build();

  // Baldur's Flame
  createCard()
    .id(9022)
    .name("Baldur's Flame")
    .manaCost(6)
    .description("Deal 5 damage. Restore 5 Health to your hero.")
    .flavorText("Often followed by Holy Extinguisher.")
    .type("spell")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .customProperty("damageAndHealEffect", {
      type: "damage_and_heal",
      value: 5,
      targetType: "any",
      requiresTarget: true,
      healTarget: "friendly_hero"
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // CLASSIC PRIEST SPELLS

  // Radiant Smite
  createCard()
    .id(9023)
    .name("Radiant Smite")
    .manaCost(1)
    .description("Deal 3 damage to a minion.")
    .flavorText("It's hard to argue with that level of commitment.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "damage",
      value: 3,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Baldur's Light
  createCard()
    .id(9024)
    .name("Baldur's Light")
    .manaCost(4)
    .description("Deal 2 damage to all enemy minions. Restore 2 Health to all friendly characters.")
    .flavorText("If you listen carefully, you can hear the holy music.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "aoe_damage_and_heal",
      value: 2,
      targetType: "all_enemy_minions",
      healValue: 2,
      healTarget: "all_friendly_characters"
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Hel's Whisper
  createCard()
    .id(9025)
    .name("Hel's Whisper")
    .manaCost(2)
    .description("Destroy a minion with 3 or less Attack.")
    .flavorText("A quieter alternative to shouting the minion's name at the top of your lungs.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "destroy",
      targetType: "any_minion",
      condition: "attack_less_than_4",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Hel's Decree
  createCard()
    .id(9026)
    .name("Hel's Decree")
    .manaCost(3)
    .description("Destroy a minion with 5 or more Attack.")
    .flavorText("Hel judges the dead with one living eye and one dead. Those she decrees must fall — fall. (Gylfaginning 34)")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "destroy",
      targetType: "any_minion",
      condition: "attack_5_or_more",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Mind Theft
  createCard()
    .id(9027)
    .name("Mind Theft")
    .manaCost(3)
    .description("Copy 2 cards from your opponent's deck and add them to your hand.")
    .flavorText("Stealing ideas is the sincerest form of flattery.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "copy_from_opponent_deck",
      value: 2,
      targetType: "none"
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Odin's Domination
  createCard()
    .id(9028)
    .name("Odin's Domination")
    .manaCost(10)
    .description("Take control of an enemy minion.")
    .flavorText("Nominated as the most popular spell to complain about.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "mind_control",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Spirit's Blessing
  createCard()
    .id(9029)
    .name("Spirit's Blessing")
    .manaCost(2)
    .description("Double a minion's Health.")
    .flavorText("Holy synergy with Inner Fire!")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "double_health",
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Healing Ring
  createCard()
    .id(9030)
    .name("Healing Ring")
    .manaCost(0)
    .description("Restore 4 Health to ALL minions.")
    .flavorText("This spell has saved more arena runs than any other card.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "aoe_heal",
      value: 4,
      targetType: "all_minions"
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Banishing Release
  createCard()
    .id(9031)
    .name("Banishing Release")
    .manaCost(4)
    .description("Silence all enemy minions. Draw a card.")
    .flavorText("It's only truly massive with 4 or more minions silenced.")
    .type("spell")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "silence_all",
      targetType: "all_enemy_minions",
      drawCards: 1
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // Odin's Ward
  createCard()
    .id(9032)
    .name("Odin's Ward")
    .manaCost(1)
    .description("Give a minion +2 Health. Draw a card.")
    .flavorText("Sure, it gives a minion +2 Health. But it also gives +2 cards to your hand!")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .spellEffect({
      type: "buff",
      buffHealth: 2,
      targetType: "any_minion",
      requiresTarget: true,
      drawCards: 1
    })
    .collectible(true)
    .addCategory("classic")
    .build();

  // MODERN PRIEST SPELLS

  // Divine Replication
  createCard()
    .id(6003)
    .name("Divine Replication")
    .manaCost(5)
    .description("Give a minion +1/+2. Summon a copy of it.")
    .type("spell")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .customProperty("buffAndCopyEffect", {
      type: "buff_and_copy",
      buffAttack: 1,
      buffHealth: 2,
      requiresTarget: true,
      targetType: "any_minion"
    })
    .collectible(true)
    .addCategory("modern")
    .build();

  // Vitality Infusion
  createCard()
    .id(6004)
    .name("Vitality Infusion")
    .manaCost(4)
    .description("Give a minion +2/+6.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .customProperty("buffEffect", {
      type: "buff",
      buffAttack: 2,
      buffHealth: 6,
      requiresTarget: true,
      targetType: "any_minion"
    })
    .collectible(true)
    .addCategory("modern")
    .build();

  // Rebirth
  createCard()
    .id(6005)
    .name("Rebirth")
    .manaCost(1)
    .description("Restore 3 Health. Foresee a spell.")
    .type("spell")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .addKeyword("discover")
    .customProperty("healAndDiscoverEffect", {
      type: "heal",
      value: 3,
      targetType: "any_character",
      secondaryEffect: {
        type: "discover",
        cardType: "spell",
        fromClass: "self"
      }
    })
    .collectible(true)
    .addCategory("modern")
    .build();

  // Ascension to Godhood
  createCard()
    .id(6006)
    .name("Ascension to Godhood")
    .manaCost(3)
    .description("Give a minion +2/+3 and Lifesteal.")
    .type("spell")
    .rarity("rare")
    .heroClass("priest")
    .class("Priest")
    .addKeyword("lifesteal")
    .customProperty("lifestealBuffEffect", {
      type: "buff",
      buffAttack: 2,
      buffHealth: 3,
      addKeywords: ["lifesteal"],
      requiresTarget: true,
      targetType: "any_minion"
    })
    .collectible(true)
    .addCategory("modern")
    .build();

  // LEGENDARY PRIEST CARDS

  // Stern Mentor
  createCard()
    .id(5112)
    .name("Stern Mentor")
    .manaCost(4)
    .attack(3)
    .health(6)
    .description("After you play a minion, destroy it and summon a 4/4 Failed Student.")
    .type("minion")
    .rarity("mythic")
    .heroClass("priest")
    .class("Priest")
    .customProperty("onEvent", {
      type: "after_play_minion",
      effect: {
        type: "transform",
        targetType: "played_minion",
        transformInto: "failed_student"
      }
    })
    .collectible(true)
    .addCategory("legendary")
    .build();

  // Soul Devourer
  createCard()
    .id(5113)
    .name("Soul Devourer")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Battlecry: Choose an enemy minion. Deathrattle: Summon a copy of it.")
    .type("minion")
    .rarity("mythic")
    .heroClass("priest")
    .class("Priest")
    .addKeyword("battlecry")
    .addKeyword("deathrattle")
    .customProperty("chooseTargetBattlecry", {
      type: "choose",
      requiresTarget: true,
      targetType: 'enemy_minion',
      storeTarget: true
    })
    .customProperty("copyTargetDeathrattle", {
      type: "summon_copy",
      targetFromBattlecry: true
    })
    .collectible(true)
    .addCategory("legendary")
    .build();

  // Nidhogg the Eternal
  createCard()
    .id(5114)
    .name("Nidhogg the Eternal")
    .manaCost(8)
    .attack(8)
    .health(8)
    .description("Battlecry: Play all cards your opponent played last turn.")
    .type("minion")
    .rarity("mythic")
    .heroClass("priest")
    .class("Priest")
    .addKeyword("battlecry")
    .battlecry({
      type: "replay_opponent_turn",
      targetType: 'none'
    })
    .collectible(true)
    .addCategory("legendary")
    .build();

  // The Chained Keeper (Highlander card)
  createCard()
    .id(70001)
    .name("The Chained Keeper")
    .manaCost(5)
    .attack(5)
    .health(5)
    .description("Battlecry: If your deck has no duplicates, your Hero Power costs (0) this game.")
    .type("minion")
    .rarity("mythic")
    .heroClass("priest")
    .class("Priest")
    .addKeyword("battlecry")
    .battlecry({
      type: "conditional_free_hero_power",
      requiresTarget: false,
      targetType: 'none',
      condition: "no_duplicates_in_deck"
    })
    .collectible(true)
    .addCategory("highlander")
    .build();

  // Failed Student (Token)
  createCard()
    .id(9501)
    .name("Failed Student")
    .manaCost(4)
    .attack(4)
    .health(4)
    .description("")
    .type("minion")
    .rarity("common")
    .heroClass("priest")
    .class("Priest")
    .collectible(false)
    .addCategory("token")
    .build();

  if (IS_DEV) debug.card('Priest cards registered successfully.');
}
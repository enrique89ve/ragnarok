/**
 * Warrior Cards Collection
 * 
 * This file contains Warrior-specific cards using the card builder API.
 * Warrior cards focus on weapons, armor gain, and damaged minion synergies.
 * 
 * Core Mechanics:
 * - Weapons: Equip weapons with various effects
 * - Armor Gain: Gain armor to protect the hero
 * - Enrage/Damaged minions: Cards that gain benefits when damaged
 * - Control tools: Removal and board control options
 */
import { debug } from '../../config/debugConfig';
import { SpellTargetType } from "../../types";
import { createCard } from "../cardManagement/cardBuilder";

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Warrior cards in the registry
 * Card IDs:
 * - Warrior minion cards: 50xx series
 * - Warrior spell cards: 51xx series
 * - Warrior weapons: 52xx series
 * - Warrior hero cards: 53xx series
 * - Warrior tokens: 59xx series
 */
export function registerWarriorCards(): void {
  if (IS_DEV) debug.card('Registering Warrior cards...');

  // Fiery War Axe
  createCard()
    .id(5001)
    .name("Muspelheim Flame")
    .manaCost(3)
    .attack(3)
    .durability(2)
    .description("")
    .flavorText("During times of tranquility and harmony, this weapon was called by its less popular name - Chilly Peace Axe.")
    .type("weapon")
    .rarity("common")
    .class("Warrior")
    .collectible(true)
    .build();

  // Cruel Taskmaster
  createCard()
    .id(5009)
    .name("Hel's Taskmaster")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Deal 1 damage to a minion and give it +2 Attack.")
    .flavorText("He has the ability to mark a test \"8/10\" in red ink, then look at you and say, \"See me after class.\"")
    .type("minion")
    .rarity("common")
    .class("Warrior")
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_and_buff",
      value: 1,
      buffAttack: 2,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Valkyrie Warlord
  createCard()
    .id(5012)
    .name("Valkyrie Warlord")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Your Charge minions have +1 Attack.")
    .flavorText("The Valkyrie Warlord went through many trials, but she's now at peace with her power.")
    .type("minion")
    .rarity("common")
    .class("Warrior")
    .customProperty("auraEffect", {
      type: "buff_attack",
      value: 1,
      targetType: "friendly_charge_minions"
    })
    .collectible(true)
    .build();

  // Inner Rage
  createCard()
    .id(5013)
    .name("Warrior's Bloodlust")
    .manaCost(0)
    .description("Deal 1 damage to a minion and give it +2 Attack.")
    .flavorText("Inner Rage is a good way to get your berserkers going. When they're angry, they get sort of... Hulkish.")
    .type("spell")
    .rarity("common")
    .class("Warrior")
    .spellEffect({
      type: "damage_and_buff",
      value: 1,
      buffAttack: 2,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Commanding Shout
  createCard()
    .id(5014)
    .name("War Horn of Asgard")
    .manaCost(2)
    .description("Your minions can't be reduced below 1 Health this turn. Draw a card.")
    .flavorText("Soldiers in the Asgardian army must be in pretty good shape to survive all that shouting.")
    .type("spell")
    .rarity("rare")
    .class("Warrior")
    .spellEffect({
      type: "commanding_shout",
    })
    .customProperty("drawCards", 1)
    .collectible(true)
    .build();

  // Einherjar Elite
  createCard()
    .id(5015)
    .name("Einherjar Elite")
    .manaCost(4)
    .attack(4)
    .health(3)
    .description("Charge")
    .flavorText("The Einherjar elite are the fiercest warriors in Valhalla. Let's just say you don't want to face them unprepared.")
    .type("minion")
    .rarity("common")
    .class("Warrior")
    .addKeyword("charge")
    .collectible(true)
    .build();

  // Arathi Weaponsmith
  createCard()
    .id(5016)
    .name("Dwarven Artificer")
    .manaCost(4)
    .attack(3)
    .health(3)
    .description("Battlecry: Equip a 2/2 weapon.")
    .flavorText("'BZZZZT' is the sound her hammer makes.")
    .type("minion")
    .rarity("common")
    .class("Warrior")
    .addKeyword("battlecry")
    .battlecry({
      type: "equip_weapon",
      summonCardId: 5019
    })
    .collectible(true)
    .build();

  // Bloodhoof Brave
  createCard()
    .id(5017)
    .name("Aegir's Hornbear")
    .manaCost(4)
    .attack(2)
    .health(6)
    .description("Taunt. Has +3 Attack while damaged.")
    .flavorText("His war cry is 'For Kahl!'")
    .type("minion")
    .rarity("common")
    .class("Warrior")
    .addKeyword("taunt")
    .customProperty("enrageEffect", {
      type: "attack_buff",
      value: 3
    })
    .collectible(true)
    .build();

  // Slam
  createCard()
    .id(5018)
    .name("Odin's Hammer Blow")
    .manaCost(2)
    .description("Deal 2 damage to a minion. If it survives, draw a card.")
    .flavorText("In the warrior's arena, first you face the slam, and then you face the slam. And if you win, you get to slam.")
    .type("spell")
    .rarity("common")
    .class("Warrior")
    .spellEffect({
      type: "damage_draw_if_survives",
      value: 2,
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Battle Rage
  createCard()
    .id(5019)
    .name("Fury of the North")
    .manaCost(2)
    .description("Draw a card for each damaged friendly character.")
    .flavorText("Someone should really tell all these angry minions to chill out.")
    .type("spell")
    .rarity("common")
    .class("Warrior")
    .spellEffect({
      type: "draw_for_damaged",
      targetType: "friendly_characters"
    })
    .collectible(true)
    .build();

  // Kratos Battleborn
  createCard()
    .id(5020)
    .name("Kratos Battleborn")
    .manaCost(9)
    .health(100)
    .customProperty("armor", 5)
    .description("Battlecry: Equip a 4/2 Helgrind's Cleaver that also damages adjacent minions.")
    .flavorText("The legendary warrior known for his battle fury and unyielding rage.")
    .type("hero")
    .rarity("mythic")
    .class("Warrior")
    .addKeyword("battlecry")
    .battlecry({
      type: "equip_weapon",
      summonCardId: 5021
    })
    .collectible(true)
    .build();

  // Helgrind's Cleaver
  createCard()
    .id(5021)
    .name("Helgrind's Cleaver")
    .manaCost(7)
    .attack(4)
    .durability(2)
    .description("Also damages minions adjacent to whomever your hero attacks.")
    .flavorText("Forged from the shattered shards of Hel's Edge in the fires of Nidavellir.")
    .type("weapon")
    .rarity("mythic")
    .class("Warrior")
    .customProperty("cleaveEffect", {
      type: "splash_damage",
      value: 4
    })
    .collectible(false)
    .build();

  // Shield Slam
  createCard()
    .id(5022)
    .name("Mjolnir's Impact")
    .manaCost(1)
    .description("Deal 1 damage to a minion for each Armor you have.")
    .flavorText("What happens when an immovable shield meets an irresistible face?")
    .type("spell")
    .rarity("epic")
    .class("Warrior")
    .spellEffect({
      type: "damage_based_on_armor",
      targetType: "any_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Brawl
  createCard()
    .id(5023)
    .name("Valhalla's Trial")
    .manaCost(5)
    .description("Destroy all minions except one. (chosen randomly)")
    .flavorText("The first rule of Brawl Club is: you ALWAYS talk about Brawl Club.")
    .type("spell")
    .rarity("epic")
    .class("Warrior")
    .spellEffect({
      type: "brawl",
      targetType: "all_minions"
    })
    .collectible(true)
    .build();

  // Dwarven Armorer (formerly Armorsmith)
  createCard()
    .id(5024)
    .name("Dwarven Armorer")
    .manaCost(2)
    .attack(1)
    .health(4)
    .description("Whenever a friendly minion takes damage, gain 1 Armor.")
    .flavorText("She accepts guild funds for repairs.")
    .type("minion")
    .rarity("rare")
    .class("Warrior")
    .customProperty("onDamageEffect", {
      type: "gain_armor",
      value: 1,
      triggerOn: "friendly_minion_damaged"
    })
    .collectible(true)
    .build();

  // Execute
  createCard()
    .id(5025)
    .name("Tyr's Judgment")
    .manaCost(2)
    .description("Destroy a damaged enemy minion.")
    .flavorText("It's okay, he deserved it.")
    .type("spell")
    .rarity("common")
    .class("Warrior")
    .spellEffect({
      type: "destroy",
      targetType: "damaged_enemy_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Aegis Defense (formerly Shield Block)
  createCard()
    .id(5026)
    .name("Aegis Defense")
    .manaCost(3)
    .description("Gain 5 Armor. Draw a card.")
    .flavorText("Block, buckle, dodge, swing, duck, run away, parry, block, draw a card.")
    .type("spell")
    .rarity("common")
    .class("Warrior")
    .spellEffect({
      type: "gain_armor",
      value: 5,
      targetType: "friendly_hero"
    })
    .customProperty("drawCards", 1)
    .collectible(true)
    .build();

  // Cleave
  createCard()
    .id(5029)
    .name("Bifrost Cleave")
    .manaCost(2)
    .description("Deal 2 damage to two random enemy minions.")
    .flavorText("Hey you two…could you stand next to each other for a second…")
    .type("spell")
    .rarity("common")
    .class("Warrior")
    .spellEffect({
      type: "cleave_damage",
      value: 2,
      targetType: "random_enemy_minions"
    })
    .customProperty("targetCount", 2)
    .collectible(true)
    .build();

  // Frothing Berserker
  createCard()
    .id(5030)
    .name("Raging Berserker")
    .manaCost(3)
    .attack(2)
    .health(4)
    .description("Whenever a minion takes damage, gain +1 Attack.")
    .flavorText("He used to work as an accountant before finding his true calling as a frothing berserker.")
    .type("minion")
    .rarity("rare")
    .class("Warrior")
    .customProperty("onDamageEffect", {
      type: "gain_attack",
      value: 1,
      triggerOn: "any_minion_damaged"
    })
    .collectible(true)
    .build();

  // Gungnir's Fury
  createCard()
    .id(5031)
    .name("Gungnir's Fury")
    .manaCost(7)
    .attack(7)
    .durability(1)
    .description("Attacking a minion costs 1 Attack instead of 1 Durability.")
    .flavorText("Ares Bloodscream's famous axe. Somehow this ended up in Erebus, Prince of Void's possession. Quite the mystery!")
    .type("weapon")
    .rarity("epic")
    .class("Warrior")
    .customProperty("specialEffect", {
      type: "preserve_durability",
      condition: "when_attacking_minions"
    })
    .collectible(true)
    .build();

  // Battle Axe (token from Arathi Weaponsmith)
  createCard()
    .id(5919)
    .name("Valkyr's Edge")
    .manaCost(1)
    .attack(2)
    .durability(2)
    .description("")
    .flavorText("A simple, effective weapon. For simple, effective people.")
    .type("weapon")
    .rarity("common")
    .class("Warrior")
    .collectible(false)
    .build();

  // ============================================
  // MIGRATED WARRIOR SPELLS FROM additionalSpellCards.ts
  // IDs: 31xxx series
  // ============================================

  // Aegis Defense (31022, formerly Shield Block)
  createCard()
    .id(31022)
    .name("Aegis Defense")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Gain 5 Armor. Draw a card.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "armor",
      value: 5,
      requiresTarget: false,
      targetType: "friendly_hero"
    })
    .customProperty("drawCards", 1)
    .collectible(true)
    .build();

  // Defensive Stance (31050)
  createCard()
    .id(31050)
    .name("Defensive Stance")
    .manaCost(2)
    .type("spell")
    .rarity("common")
    .description("Gain 4 Armor. Your next weapon costs (1) less.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "gain_armor_reduce_cost",
      value: 4,
      requiresTarget: false,
      targetType: "none"
    })
    .customProperty("costReduction", 1)
    .collectible(true)
    .build();

  // Reckless Strike (31051)
  createCard()
    .id(31051)
    .name("Reckless Strike")
    .manaCost(1)
    .type("spell")
    .rarity("common")
    .description("Deal 3 damage to a minion and 1 damage to your hero.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "damage_with_self_damage",
      value: 3,
      requiresTarget: true,
      targetType: "any_minion"
    })
    .customProperty("selfDamage", 1)
    .collectible(true)
    .build();

  // Warrior's Will (31052)
  createCard()
    .id(31052)
    .name("Warrior's Will")
    .manaCost(3)
    .type("spell")
    .rarity("rare")
    .description("Deal damage to a minion equal to your Armor (minimum 2).")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "damage_based_on_armor",
      requiresTarget: true,
      targetType: "any_minion"
    })
    .customProperty("minimumDamage", 2)
    .collectible(true)
    .build();

  // Blade Sharpening (31053)
  createCard()
    .id(31053)
    .name("Blade Sharpening")
    .manaCost(1)
    .type("spell")
    .rarity("common")
    .description("Give your weapon +1/+1.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "buff_weapon",
      requiresTarget: false,
      targetType: "none"
    })
    .customProperty("buffAttack", 1)
    .customProperty("buffDurability", 1)
    .collectible(true)
    .build();

  // Warcry (31054)
  createCard()
    .id(31054)
    .name("Call of Valhalla")
    .manaCost(2)
    .type("spell")
    .rarity("rare")
    .description("Give all damaged friendly minions +2 Attack.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "buff_damaged_minions",
      requiresTarget: false,
      targetType: "none"
    })
    .customProperty("buffAttack", 2)
    .customProperty("buffHealth", 0)
    .collectible(true)
    .build();

  // Battle Preparations (31055)
  createCard()
    .id(31055)
    .name("Battle Preparations")
    .manaCost(4)
    .type("spell")
    .rarity("epic")
    .description("Draw a weapon from your deck and gain Armor equal to its Cost.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "draw_weapon_gain_armor",
      requiresTarget: false,
      targetType: "none"
    })
    .collectible(true)
    .build();

  // Iron Fortitude (31056)
  createCard()
    .id(31056)
    .name("Iron Fortitude")
    .manaCost(5)
    .type("spell")
    .rarity("epic")
    .description("Gain 8 Armor. Reduce the Cost of your Hero Power by (2) this turn.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "gain_armor_reduce_hero_power",
      value: 8,
      requiresTarget: false,
      targetType: "none"
    })
    .customProperty("heroReduction", 2)
    .collectible(true)
    .build();

  // Cleaving Slash (31057)
  createCard()
    .id(31057)
    .name("Cleaving Slash")
    .manaCost(3)
    .type("spell")
    .rarity("common")
    .description("Deal 2 damage to a minion and adjacent ones.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "cleave_damage",
      value: 2,
      requiresTarget: true,
      targetType: "any_minion"
    })
    .collectible(true)
    .build();

  // Last Stand (31058)
  createCard()
    .id(31058)
    .name("Last Stand")
    .manaCost(7)
    .type("spell")
    .rarity("epic")
    .description("Gain Armor equal to your missing Health. Draw a card for each 5 Armor gained.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "armor_based_on_missing_health",
      requiresTarget: false,
      targetType: "none"
    })
    .collectible(true)
    .build();

  // Champion's Legacy (31059)
  createCard()
    .id(31059)
    .name("Champion's Legacy")
    .manaCost(8)
    .type("spell")
    .rarity("mythic")
    .description("Equip a 5/2 Weapon. Whenever it attacks, gain 5 Armor.")
    .class("Warrior")
    .heroClass("warrior")
    .spellEffect({
      type: "equip_special_weapon",
      requiresTarget: false,
      targetType: "none"
    })
    .customProperty("weaponAttack", 5)
    .customProperty("weaponDurability", 2)
    .customProperty("armorPerAttack", 5)
    .collectible(true)
    .build();

  if (IS_DEV) debug.card('Warrior cards registered successfully.');
}
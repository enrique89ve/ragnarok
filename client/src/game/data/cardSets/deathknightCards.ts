/**
 * Death Knight Cards Collection
 * 
 * This file contains Death Knight-specific cards using the card builder API.
 * Death Knight cards focus on frost effects, raising undead, and gaining special runes.
 * 
 * Core Mechanics:
 * - Frost: Freezing and controlling enemy minions
 * - Blood: Life-draining and armor gain
 * - Unholy: Raising undead minions and disease effects
 * - Rune empowerment: Cards that interact with runes
 */
import { debug } from '../../config/debugConfig';
import { SpellTargetType } from "../../types";
import { createCard } from "../cardManagement/cardBuilder";

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register all Death Knight cards in the registry
 * Card IDs:
 * - Death Knight minion cards: 30xx series
 * - Death Knight spell cards: 31xx series
 * - Death Knight weapons: 32xx series
 * - Death Knight tokens: 39xx series
 */
export function registerDeathKnightCards(): void {
  if (IS_DEV) debug.card('Registering Death Knight cards...');

  // Death Coil
  createCard()
    .id(3001)
    .name("Death Coil")
    .manaCost(2)
    .description("Deal 3 damage to an enemy, or restore 3 Health to a friendly undead minion.")
    .flavorText("The prime currency of Helheim. Trades particularly well against life.")
    .type("spell")
    .rarity("common")
    .class("DeathKnight")
    .spellEffect({
      type: "death_coil",
      value: 3,
      targetType: "any",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Army of the Dead
  createCard()
    .id(3005)
    .name("Army of the Dead")
    .manaCost(6)
    .description("Summon three 2/2 Ghouls with Taunt.")
    .flavorText("Like a good neighbor, the undead are there!")
    .type("spell")
    .rarity("epic")
    .class("DeathKnight")
    .spellEffect({
      type: "summon",
      summonCardId: 9051,
      value: 3,
      targetType: "none"
    })
    .collectible(true)
    .build();

  // Remorseless Winter
  createCard()
    .id(3007)
    .name("Remorseless Winter")
    .manaCost(4)
    .description("Freeze all enemy minions. Deal 2 damage to all Frozen enemies.")
    .flavorText("The bitter cold of Niflheim seeps into the marrow of its victims' bones.")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "freeze_and_damage",
      value: 2,
      targetType: "all_enemy_minions"
    })
    .collectible(true)
    .build();

  // Hel's Edge
  createCard()
    .id(3009)
    .name("Hel's Edge")
    .manaCost(7)
    .attack(5)
    .durability(3)
    .description("After your hero attacks and kills a minion, summon that minion to your side.")
    .flavorText("Whomsoever takes up this blade shall wield power eternal. Just as the blade rends flesh, so must power scar the spirit.")
    .type("weapon")
    .rarity("mythic")
    .class("DeathKnight")
    .customProperty("onKillEffect", {
      type: "raise_enemy"
    })
    .collectible(true)
    .build();

  // Blood Boil
  createCard()
    .id(3011)
    .name("Blood Boil")
    .manaCost(2)
    .description("Deal 1 damage to all minions. If any die, restore 3 Health to your hero.")
    .flavorText("Boiling blood is a staple in the death knight diet.")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "aoe_with_on_kill",
      value: 1,
      targetType: "all_minions"
    })
    .customProperty("healOnKill", 3)
    .collectible(true)
    .build();

  // Runeforged Blade
  createCard()
    .id(3012)
    .name("Runeforged Blade")
    .manaCost(3)
    .attack(2)
    .durability(3)
    .description("Your weapon has +1 Attack for each Rune you have active.")
    .flavorText("Enchanted with runes of power, this blade grows stronger with each rune the death knight invokes.")
    .type("weapon")
    .rarity("epic")
    .class("DeathKnight")
    .customProperty("runeEffect", {
      type: "weapon_attack_per_rune"
    })
    .collectible(true)
    .build();

  // Icebound Fortitude
  createCard()
    .id(3013)
    .name("Icebound Fortitude")
    .manaCost(4)
    .description("Give your hero +5 Armor and Immunity this turn.")
    .flavorText("Death knights can encase themselves in an icy fortress of invulnerability, which is kind of unfair.")
    .type("spell")
    .rarity("epic")
    .class("DeathKnight")
    .spellEffect({
      type: "gain_armor_and_immunity",
      value: 5,
      targetType: "friendly_hero"
    })
    .customProperty("duration", "current_turn")
    .collectible(true)
    .build();

  // Dark Command
  createCard()
    .id(3014)
    .name("Dark Command")
    .manaCost(3)
    .description("Take control of an enemy minion with 3 or less Attack until end of turn.")
    .flavorText("Death knights are masters of manipulation, both of the dead and the living.")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "mind_control_temporary",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .customProperty("condition", "attack_less_than_4")
    .customProperty("duration", "end_of_turn")
    .collectible(true)
    .build();

  // The Draugr King
  createCard()
    .id(3015)
    .name("The Draugr King")
    .manaCost(9)
    .description("Battlecry: Equip Hel's Edge and gain 5 Armor.")
    .flavorText("When a prince becomes a death knight, it's a royal pain.")
    .type("hero")
    .rarity("mythic")
    .customProperty("armor", 5)
    .class("DeathKnight")
    .addKeyword("battlecry")
    .battlecry({
      type: "equip_helgrind",
      summonCardId: 3009
    })
    .customProperty("heroPower", {
      id: 3016,
      name: "Apocalypse",
      description: "Deal 3 damage to all enemies.",
      manaCost: 2,
      effect: {
        type: "aoe_damage",
        value: 3,
        targetType: "all_enemies"
      },
      collectible: true,
      class: "DeathKnight"
    })
    .collectible(true)
    .build();

  // Death Gate
  createCard()
    .id(3017)
    .name("Death Gate")
    .manaCost(4)
    .description("Summon a random friendly minion that died this game.")
    .flavorText("Death knights can open portals to the realm of the dead. Very convenient for retrieving fallen comrades.")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "resurrect_random",
      value: 1,
      targetType: "none"
    })
    .collectible(true)
    .build();

  // Bone Shield
  createCard()
    .id(3018)
    .name("Bone Shield")
    .manaCost(2)
    .description("Give a minion +2 Health and \"After this minion survives damage, summon a 1/1 Skeleton.\"")
    .flavorText("A shield made of bones. Pretty self-explanatory, actually.")
    .type("spell")
    .rarity("common")
    .class("DeathKnight")
    .spellEffect({
      type: "buff_and_enchant",
      buffHealth: 2,
      targetType: "any_minion",
      requiresTarget: true
    })
    .customProperty("enchantEffect", {
      type: "on_survive_damage_summon",
      summonCardId: 3019
    })
    .collectible(true)
    .build();

  // Skeleton (token)
  createCard()
    .id(3019)
    .name("Skeleton")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("")
    .flavorText("Just your average, run-of-the-mill undead skeleton. Nothing special here.")
    .type("minion")
    .rarity("common")
    .class("DeathKnight")
    .collectible(false)
    .build();

  // Blood Presence
  createCard()
    .id(3021)
    .name("Blood Presence")
    .manaCost(3)
    .description("Give your hero +4 Armor and Lifesteal this turn.")
    .flavorText("Blood death knights are vampiric fighters, using their enemies' life essence to fuel their own survival.")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "gain_armor_and_lifesteal",
      value: 4,
      targetType: "friendly_hero"
    })
    .customProperty("duration", "current_turn")
    .collectible(true)
    .build();

  // Frost Presence
  createCard()
    .id(3022)
    .name("Frost Presence")
    .manaCost(3)
    .description("Freeze an enemy and all adjacent minions.")
    .flavorText("Frost death knights bring the bitter cold of Niflheim with them wherever they go.")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "freeze_adjacent",
      targetType: "enemy_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  // Unholy Presence
  createCard()
    .id(3023)
    .name("Unholy Presence")
    .manaCost(4)
    .description("Give all your minions +1/+1 and \"Deathrattle: Deal 1 damage to all enemies.\"")
    .flavorText("Unholy death knights specialize in plague and pestilence. Fun at parties!")
    .type("spell")
    .rarity("rare")
    .class("DeathKnight")
    .spellEffect({
      type: "buff_all_with_deathrattle",
      buffAttack: 1,
      buffHealth: 1,
      targetType: "friendly_minions"
    })
    .customProperty("deathrattleEffect", {
      type: "damage",
      value: 1,
      targetType: "all_enemies"
    })
    .collectible(true)
    .build();

  // Runeblade
  createCard()
    .id(3024)
    .name("Runeblade")
    .manaCost(2)
    .attack(2)
    .durability(2)
    .description("")
    .flavorText("A basic runeblade, the iconic weapon of the death knight. Chills the soul of whoever it strikes.")
    .type("weapon")
    .rarity("common")
    .class("DeathKnight")
    .collectible(true)
    .build();

  // Chains of Ice
  createCard()
    .id(3025)
    .name("Chains of Ice")
    .manaCost(2)
    .description("Freeze an enemy. Draw a card.")
    .flavorText("Death knights can conjure chains of pure ice to bind their opponents. Their prisoners really should wear warmer clothes.")
    .type("spell")
    .rarity("common")
    .class("DeathKnight")
    .spellEffect({
      type: "freeze_and_draw",
      targetType: "any_enemy",
      requiresTarget: true,
      drawCards: 1
    })
    .collectible(true)
    .build();

  // Death Strike
  createCard()
    .id(3026)
    .name("Death Strike")
    .manaCost(4)
    .description("Deal damage equal to your missing Health. Restore 3 Health to your hero.")
    .flavorText("The closer a death knight is to death, the more devastating their strikes become.")
    .type("spell")
    .rarity("epic")
    .class("DeathKnight")
    .spellEffect({
      type: "damage_based_on_missing_health",
      targetType: "any",
      requiresTarget: true
    })
    .customProperty("healValue", 3)
    .collectible(true)
    .build();

  // Death Knight Initiate
  createCard()
    .id(3027)
    .name("Death Knight Initiate")
    .manaCost(2)
    .attack(2)
    .health(3)
    .description("Battlecry: Give your weapon +1/+1.")
    .flavorText("Every death knight starts somewhere. Usually with smaller, less impressive rune weapons.")
    .type("minion")
    .rarity("common")
    .class("DeathKnight")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_weapon",
      buffAttack: 1
    })
    .customProperty("buffDurability", 1)
    .collectible(true)
    .build();

  // Draugr Champion
  createCard()
    .id(3029)
    .name("Draugr Champion")
    .manaCost(4)
    .attack(3)
    .health(3)
    .description("Battlecry: Give a friendly minion +2/+2 and Taunt.")
    .flavorText("Champions of Helheim command legions of undead. And they're very encouraging managers.")
    .type("minion")
    .rarity("rare")
    .class("DeathKnight")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_and_taunt",
      buffAttack: 2,
      buffHealth: 2,
      targetType: "friendly_minion",
      requiresTarget: true
    })
    .collectible(true)
    .build();

  if (IS_DEV) debug.card('Death Knight cards registered successfully.');
}
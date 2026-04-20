/**
 * Hunter Cards Collection
 * 
 * This file contains Hunter-specific cards using the card builder API.
 * Hunter cards focus on beast synergy, face damage, and secrets.
 * 
 * Core Mechanics:
 * - Beast synergy: Cards that become stronger with beasts
 * - Secrets: Trap cards that trigger on specific events
 * - Face damage: Direct damage to the opponent's hero
 * - Weapons: Enhanced weapon synergy
 */

import { debug } from '../../config/debugConfig';
import { SpellTargetType } from "../../types";
import { createCard } from "../cardManagement/cardBuilder";

const IS_DEV = import.meta.env?.DEV ?? false;
import { registerCard } from "../cardManagement/cardRegistry";

// Create an array to hold all Hunter cards
const hunterCards = [
  // ----- EXISTING CARDS -----

  // Freya's Pack
  createCard()
    .id(7001)
    .name("Freya's Pack")
    .manaCost(3)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "summon",
      targetType: "none",
      summonCardId: 7501 // Hound token
    })
    .description("For each enemy minion, summon a 1/1 Hound with Charge.")
    .flavorText("Release the hounds! Wait, wrong genre.")
    .collectible(true)
    .build(),

  // Beast of Freya
  createCard()
    .id(7002)
    .name("Beast of Freya")
    .manaCost(3)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "summon",
      value: 1,
      targetType: "none",
      summonCardId: 7503 // Will randomly choose between Bjorn, Geri, and Freki
    })
    .description("Summon a random Beast Companion.")
    .flavorText("You're never alone when you have a beast at your side.")
    .collectible(true)
    .build(),

  // Diana's Bow
  createCard()
    .id(7003)
    .name("Diana's Bow")
    .manaCost(3)
    .attack(3)
    .durability(2)
    .class("Hunter")
    .rarity("rare")
    .type("weapon")
    .customProperty("onSecretReveal", {
      type: "gain_durability",
      value: 1
    })
    .description("Whenever a friendly Rune is revealed, gain +1 Durability.")
    .flavorText("The pull is so strong, it can launch an arrow halfway across the battlefield.")
    .collectible(true)
    .build(),

  // Artemis' Arrow
  createCard()
    .id(7005)
    .name("Artemis' Arrow")
    .manaCost(3)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "destroy_random",
      targetType: "enemy_minion"
    })
    .description("Destroy a random enemy minion.")
    .flavorText("Accuracy is not the strong suit - just make sure you hit something.")
    .collectible(true)
    .build(),

  // Hound (token for Release the Garmr)
  createCard()
    .id(7501)
    .name("Hound")
    .manaCost(1)
    .attack(1)
    .health(1)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("charge")
    .description("Charge")
    .flavorText("A loyal companion, eager to please.")
    .collectible(false) // Token card
    .build(),

  // Bjorn (token for Beast of Valhalla)
  createCard()
    .id(7503)
    .name("Bjorn")
    .manaCost(3)
    .attack(4)
    .health(4)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("taunt")
    .description("Taunt")
    .flavorText("The bear necessities of hunting include a sturdy protector.")
    .collectible(false) // Token card
    .build(),

  // Geri (token for Beast of Valhalla)
  createCard()
    .id(7504)
    .name("Geri")
    .manaCost(3)
    .attack(4)
    .health(2)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("charge")
    .description("Charge")
    .flavorText("Always goes face. ALWAYS.")
    .collectible(false) // Token card
    .build(),

  // Freki (token for Beast of Valhalla)
  createCard()
    .id(7505)
    .name("Freki")
    .manaCost(3)
    .attack(2)
    .health(4)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .customProperty("aura", {
      type: "attack_buff",
      value: 1,
      target: "other_friendly_minions"
    })
    .description("Your other minions have +1 Attack.")
    .flavorText("A born leader who inspires other beasts to greatness.")
    .collectible(false) // Token card
    .build(),
  
  // ----- NEW MINIONS -----
  
  // Wilderness Scout
  createCard()
    .id(7010)
    .name("Wilderness Scout")
    .manaCost(1)
    .attack(1)
    .health(1)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .addKeyword("battlecry")
    .battlecry({
      type: "discover",
      value: 1,
      discoveryType: "beast"
    })
    .description("Battlecry: Foresee a Beast.")
    .flavorText("She knows all the best hiding spots in the forest.")
    .collectible(true)
    .build(),
  
  // Svartalfheim Stalker
  createCard()
    .id(7011)
    .name("Svartalfheim Stalker")
    .manaCost(2)
    .attack(2)
    .health(2)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("stealth")
    .description("Stealth")
    .flavorText('Dark elf hunters bred it in the sunless realm — it sees without light.')
    .collectible(true)
    .build(),
  
  // Fenrir's Packleader
  createCard()
    .id(7012)
    .name("Fenrir's Packleader")
    .manaCost(3)
    .attack(2)
    .health(3)
    .class("Hunter")
    .rarity("rare")
    .type("minion")
    .race("Beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_adjacent",
      buffAttack: 1,
      buffHealth: 1
    })
    .description("Battlecry: Give adjacent minions +1/+1.")
    .flavorText('Lesser wolves obey the bloodline of the great wolf without question.')
    .collectible(true)
    .build(),
  
  // Venomfang Serpent
  createCard()
    .id(7013)
    .name("Venomfang Serpent")
    .manaCost(3)
    .attack(2)
    .health(4)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("poisonous")
    .description("Poisonous")
    .flavorText("One bite, permanent night.")
    .collectible(true)
    .build(),
  
  // Beastmaster Trainer
  createCard()
    .id(7014)
    .name("Beastmaster Trainer")
    .manaCost(4)
    .attack(3)
    .health(4)
    .class("Hunter")
    .rarity("rare")
    .type("minion")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_all_in_hand",
      condition: { check: "race", race: "Beast" },
      buffAttack: 1,
      buffHealth: 1
    })
    .description("Battlecry: Give all Beasts in your hand +1/+1.")
    .flavorText("She can tame anything except her own impulses.")
    .collectible(true)
    .build(),
  
  // Garmr's Kin
  createCard()
    .id(7015)
    .name("Garmr's Kin")
    .manaCost(2)
    .attack(2)
    .health(2)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .customProperty("aura", {
      type: "attack_buff",
      value: 1,
      condition: "beast"
    })
    .description("Your other Beasts have +1 Attack.")
    .flavorText("Descended from the hound that guards Helheim's gate.")
    .collectible(true)
    .build(),
  
  // Jungle Stalker
  createCard()
    .id(7016)
    .name("Jungle Stalker")
    .manaCost(5)
    .attack(4)
    .health(4)
    .class("Hunter")
    .rarity("epic")
    .type("minion")
    .race("Beast")
    .addKeyword("stealth")
    .customProperty("onAttack", {
      type: "draw_card",
      condition: { check: "attacked_hero" },
      value: 1
    })
    .description("Stealth. After this attacks the enemy hero, draw a card.")
    .flavorText("A true hunter strikes from hiding, then disappears again.")
    .collectible(true)
    .build(),
  
  // Spirit Tamer
  createCard()
    .id(7017)
    .name("Spirit Tamer")
    .manaCost(4)
    .attack(2)
    .health(3)
    .class("Hunter")
    .rarity("rare")
    .type("minion")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon_copy",
      targetType: "beast_in_hand",
      requiresTarget: true
    })
    .description("Battlecry: Choose a Beast in your hand and summon a copy of it.")
    .flavorText("One beast is company, two is a war party.")
    .collectible(true)
    .build(),
  
  // Hunting Falcon
  createCard()
    .id(7018)
    .name("Hunting Falcon")
    .manaCost(3)
    .attack(3)
    .health(2)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .customProperty("onPlayCard", {
      type: "deal_damage",
      condition: { check: "card_type", cardType: "spell" },
      value: 1,
      target: "enemy_hero"
    })
    .description("After you play a spell, deal 1 damage to the enemy hero.")
    .flavorText("Its eyes are sharper than any arrow.")
    .collectible(true)
    .build(),
  
  // Freya's Pride
  createCard()
    .id(7019)
    .name("Freya's Pride")
    .manaCost(6)
    .attack(5)
    .health(6)
    .class("Hunter")
    .rarity("epic")
    .type("minion")
    .race("Beast")
    .addKeyword("taunt")
    .customProperty("endOfTurn", {
      type: "summon_token",
      condition: { check: "board_has_race", race: "Beast", minimum: 2 },
      value: 1,
      summonCardId: 7501 // Hound
    })
    .description("Taunt. At the end of your turn, if you control at least 2 other Beasts, summon a 1/1 Hound with Charge.")
    .flavorText("Freya's cats are not the gentle creatures of Midgard.")
    .collectible(true)
    .build(),
  
  // Skadi's Huntmaster
  createCard()
    .id(7020)
    .name("Skadi's Huntmaster")
    .manaCost(7)
    .attack(5)
    .health(5)
    .class("Hunter")
    .rarity("mythic")
    .type("minion")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon_copy_from_deck",
      condition: { check: "race", race: "Beast" },
      value: 2
    })
    .description("Battlecry: Summon 2 copies of a random Beast from your deck.")
    .flavorText("Skadi chose the mountains over Asgard's golden halls — her beasts followed.")
    .collectible(true)
    .build(),

  // Beast Whisperer
  createCard()
    .id(7021)
    .name("Beast Whisperer")
    .manaCost(3)
    .attack(2)
    .health(3)
    .class("Hunter")
    .rarity("rare")
    .type("minion")
    .customProperty("onPlayCard", {
      type: "reduce_cost",
      condition: { check: "card_race", race: "Beast" },
      value: 1
    })
    .description("After you play a card, reduce the Cost of a random Beast in your hand by (1).")
    .flavorText("She knows just what to say to get wild animals to cooperate.")
    .collectible(true)
    .build(),

  // Ferocious Grizzly
  createCard()
    .id(7022)
    .name("Ferocious Grizzly")
    .manaCost(5)
    .attack(4)
    .health(6)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("taunt")
    .addKeyword("rush")
    .description("Taunt, Rush")
    .flavorText("Half bear, all business.")
    .collectible(true)
    .build(),

  // Swift Raptor
  createCard()
    .id(7023)
    .name("Swift Raptor")
    .manaCost(2)
    .attack(3)
    .health(1)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .addKeyword("rush")
    .description("Rush")
    .flavorText("It's the last thing you'll see before you become dinner.")
    .collectible(true)
    .build(),

  // ----- NEW SPELLS -----
  
  // Tracking Shot
  createCard()
    .id(7100)
    .name("Tracking Shot")
    .manaCost(1)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "discover",
      targetType: "none",
      value: 1
    })
    .description("Foresee a card from your deck.")
    .flavorText("When you need to find that perfect shot.")
    .collectible(true)
    .build(),
  
  // Heimdall's Trap
  createCard()
    .id(7101)
    .name("Heimdall's Trap")
    .manaCost(2)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .addKeyword("secret")
    .spellEffect({
      type: "secret",
      targetType: "none"
    })
    .customProperty("secretTrigger", "enemy_hero_attacks")
    .customProperty("secretEffect", {
      type: "aoe_damage",
      value: 2,
      target: "all_enemy_characters"
    })
    .description("Rune: When your hero is attacked, deal 2 damage to all enemies.")
    .flavorText("A surprise package for unwelcome guests.")
    .collectible(true)
    .build(),
  
  // Ymir's Freeze
  createCard()
    .id(7102)
    .name("Ymir's Freeze")
    .manaCost(2)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .addKeyword("secret")
    .spellEffect({
      type: "secret",
      targetType: "none"
    })
    .customProperty("secretTrigger", "enemy_minion_attacks")
    .customProperty("secretEffect", {
      type: "return_to_hand",
      target: "attacking_minion",
      costIncrease: 2
    })
    .description("Rune: When an enemy minion attacks, return it to its owner's hand and it costs (2) more.")
    .flavorText("Freezing a minion in its tracks is satisfying, but making it cost more is just cold.")
    .collectible(true)
    .build(),
  
  // Apollo's Volley
  createCard()
    .id(7103)
    .name("Apollo's Volley")
    .manaCost(4)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "damage_random",
      targetType: "enemy_minions",
      value: 3
    })
    .customProperty("randomTargets", 2)
    .description("Deal 3 damage to two random enemy minions.")
    .flavorText("You might think 'multi' means more than two... but you're not a Hunter.")
    .collectible(true)
    .build(),
  
  // Venomstrike
  createCard()
    .id(7104)
    .name("Venomstrike")
    .manaCost(3)
    .class("Hunter")
    .rarity("rare")
    .type("spell")
    .spellEffect({
      type: "damage",
      targetType: "any_minion",
      value: 3,
      requiresTarget: true
    })
    .customProperty("poisonEffect", {
      type: "grant_poisonous",
      duration: 1,
      targetType: "friendly_minion"
    })
    .description("Deal 3 damage to a minion. Give a friendly minion Poisonous until end of turn.")
    .flavorText("A double dose of deadly.")
    .collectible(true)
    .build(),
  
  // Skadi's Mark
  createCard()
    .id(7105)
    .name("Skadi's Mark")
    .manaCost(1)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "set_health",
      targetType: "any_minion",
      value: 1,
      requiresTarget: true
    })
    .description("Change a minion's Health to 1.")
    .flavorText("The first rule of target practice is to pick a target.")
    .collectible(true)
    .build(),
  
  // Wild Growth
  createCard()
    .id(7106)
    .name("Wild Growth")
    .manaCost(3)
    .class("Hunter")
    .rarity("epic")
    .type("spell")
    .spellEffect({
      type: "buff_all",
      targetType: "friendly_beasts",
      buffAttack: 2,
      buffHealth: 2
    })
    .description("Give your Beasts +2/+2.")
    .flavorText("When the hunt gets tough, the tough get... bigger.")
    .collectible(true)
    .build(),
  
  // Beast Command
  createCard()
    .id(7107)
    .name("Beast Command")
    .manaCost(2)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "buff",
      targetType: "friendly_beast",
      buffAttack: 2,
      buffHealth: 1,
      requiresTarget: true
    })
    .customProperty("grantEffect", {
      type: "grant_keyword",
      keyword: "rush"
    })
    .description("Give a friendly Beast +2/+1 and Rush.")
    .flavorText("No animal can resist a good command... and a treat.")
    .collectible(true)
    .build(),
  
  // Call of Fenrir
  createCard()
    .id(7108)
    .name("Call of Fenrir")
    .manaCost(8)
    .class("Hunter")
    .rarity("epic")
    .type("spell")
    .spellEffect({
      type: "summon",
      targetType: "none"
    })
    .customProperty("summonMultiple", [7503, 7504, 7505]) // All three Beast Companions
    .description("Summon all three Beast Companions.")
    .flavorText("The whole pack answers when you call loud enough.")
    .collectible(true)
    .build(),
  
  // Apollo's Snipe
  createCard()
    .id(7109)
    .name("Apollo's Snipe")
    .manaCost(2)
    .class("Hunter")
    .rarity("common")
    .type("spell")
    .addKeyword("secret")
    .spellEffect({
      type: "secret",
      targetType: "none"
    })
    .customProperty("secretTrigger", "enemy_plays_minion")
    .customProperty("secretEffect", {
      type: "damage",
      value: 4,
      target: "played_minion"
    })
    .description("Rune: After your opponent plays a minion, deal 4 damage to it.")
    .flavorText("A face-down card, a moment of suspense, then BAM!")
    .collectible(true)
    .build(),
  
  // Hermes' Trick
  createCard()
    .id(7110)
    .name("Hermes' Trick")
    .manaCost(2)
    .class("Hunter")
    .rarity("rare")
    .type("spell")
    .addKeyword("secret")
    .spellEffect({
      type: "secret",
      targetType: "none"
    })
    .customProperty("secretTrigger", "enemy_hero_attacks")
    .customProperty("secretEffect", {
      type: "redirect_attack",
      target: "random_character"
    })
    .description("Rune: When an enemy attacks your hero, redirect it to a random character.")
    .flavorText("Sometimes you're just in the wrong place at the wrong time.")
    .collectible(true)
    .build(),

  // ----- NEW WEAPONS -----
  
  // Diana's Crossbow
  createCard()
    .id(7200)
    .name("Diana's Crossbow")
    .manaCost(2)
    .attack(2)
    .durability(2)
    .class("Hunter")
    .rarity("common")
    .type("weapon")
    .customProperty("onAttack", {
      type: "deal_damage",
      value: 1,
      target: "random_enemy_minion"
    })
    .description("After your hero attacks, deal 1 damage to a random enemy minion.")
    .flavorText("Not just for hunting, but for making a point.")
    .collectible(true)
    .build(),
  
  // Apollo's Bow
  createCard()
    .id(7201)
    .name("Apollo's Bow")
    .manaCost(5)
    .attack(4)
    .durability(2)
    .class("Hunter")
    .rarity("epic")
    .type("weapon")
    .customProperty("immune", true)
    .description("Your hero is Immune while attacking.")
    .flavorText("The perfect weapon for taking down targets from a safe distance.")
    .collectible(true)
    .build(),

  // Wildtamer's Whip
  createCard()
    .id(7202)
    .name("Wildtamer's Whip")
    .manaCost(3)
    .attack(2)
    .durability(3)
    .class("Hunter")
    .rarity("rare")
    .type("weapon")
    .customProperty("onAttack", {
      type: "buff_random",
      target: "friendly_beast",
      buffAttack: 1,
      buffHealth: 1
    })
    .description("After your hero attacks, give a random friendly Beast +1/+1.")
    .flavorText("Not for punishment, but for guidance... mostly.")
    .collectible(true)
    .build(),

  // ----- TOKEN CARDS -----
  
  // Wolf Pup (token)
  createCard()
    .id(7506)
    .name("Wolf Pup")
    .manaCost(1)
    .attack(2)
    .health(1)
    .class("Hunter")
    .rarity("common")
    .type("minion")
    .race("Beast")
    .description("")
    .flavorText("Small but fierce. Will grow into a big problem.")
    .collectible(false)
    .build()
];

// Function to register all Hunter cards in the registry
export function registerHunterCards(): void {
  if (IS_DEV) debug.card('Registering Hunter cards...');
  
  for (const card of hunterCards) {
    registerCard(card);
  }
  
  if (IS_DEV) debug.card(`Registered ${hunterCards.length} Hunter cards`);
}

export default hunterCards;
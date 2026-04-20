/**
 * Necromancer Cards Collection
 * 
 * This file contains Necromancer-specific cards using the card builder API.
 * Necromancer cards focus on graveyard mechanics and raising undead minions.
 * 
 * Core Mechanics:
 * - Graveyard tracking: Accessing minions that have died during the game
 * - Resurrection: Summoning minions from the graveyard
 * - Undead synergy: Cards that become stronger based on Undead minions
 * - Self-sacrifice: Trading health for powerful effects
 */

import { debug } from '../../config/debugConfig';
import { SpellTargetType } from "../../types";
import { createCard } from "../cardManagement/cardBuilder";

const IS_DEV = import.meta.env?.DEV ?? false;
import { registerCard } from "../cardManagement/cardRegistry";
import { getGraveyard, countGraveyardByRace } from "../cardManagement/graveyardTracker";

// Create an array to hold all Necromancer cards
const necromancerCards = [
  // ----- MINIONS -----
  
  // Bone Collector
  createCard()
    .id(4000)
    .name("Bone Collector")
    .manaCost(2)
    .attack(1)
    .health(2)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .race("Undead")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_from_graveyard_count",
      condition: { check: "graveyard_count", race: "Undead", minimum: 1 },
      value: 1 // Buff amount per Undead
    })
    .description("Battlecry: Gain +1/+1 for each Undead in your graveyard.")
    .flavorText("The bones remember who they were in life. And they miss it.")
    .collectible(true)
    .build(),
  
  // Grave Robber
  createCard()
    .id(4001)
    .name("Grave Robber")
    .manaCost(3)
    .attack(3)
    .health(3)
    .class("Necromancer")
    .rarity("rare")
    .type("minion")
    .addKeyword("battlecry")
    .battlecry({
      type: "discover_from_graveyard",
      condition: { check: "graveyard_size", minimum: 1 },
      discoveryCount: 3
    })
    .description("Battlecry: Foresee a minion that died this game.")
    .flavorText("One man's grave is another man's treasure chest.")
    .collectible(true)
    .build(),
  
  // Skeletal Lord
  createCard()
    .id(4002)
    .name("Skeletal Lord")
    .manaCost(6)
    .attack(5)
    .health(5)
    .class("Necromancer")
    .rarity("epic")
    .type("minion")
    .race("Undead")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon_skeletons_based_on_graveyard",
      value: 3, // Maximum number of skeletons to summon
      summonCardId: 4900 // ID of the skeleton card to summon
    })
    .description("Battlecry: Summon a 2/2 Skeleton for each minion in your graveyard (up to 3).")
    .flavorText("He's assembled quite the workforce.")
    .collectible(true)
    .build(),
  
  // Death's Harvester
  createCard()
    .id(4003)
    .name("Death's Harvester")
    .manaCost(4)
    .attack(3)
    .health(5)
    .class("Necromancer")
    .rarity("rare")
    .type("minion")
    .customProperty("onMinionDeath", {
      type: "buff_self",
      buffAttack: 1,
      buffHealth: 1,
      condition: "friendly_minion"
    })
    .description("Whenever a friendly minion dies, gain +1/+1.")
    .flavorText("Death fuels his power. It's a sustainable resource.")
    .collectible(true)
    .build(),
  
  // Grave Pact
  createCard() 
    .id(4004)
    .name("Grave Pact")
    .manaCost(5)
    .attack(4)
    .health(4)
    .class("Necromancer")
    .rarity("epic")
    .type("minion")
    .addKeyword("deathrattle")
    .deathrattle({
      type: "summon_highest_cost_from_graveyard",
      targetType: "none"
    })
    .description("Deathrattle: Summon the highest cost minion that died this game.")
    .flavorText("Death is just a temporary setback.")
    .collectible(true)
    .build(),
  
  // Graveyard Guardian
  createCard()
    .id(4005)
    .name("Graveyard Guardian")
    .manaCost(4)
    .attack(3)
    .health(4)
    .class("Necromancer")
    .rarity("rare")
    .type("minion")
    .customProperty("manaDiscount", {
      type: "cost_reduction",
      value: 1,
      condition: "graveyard_count"
    })
    .description("Your minions cost (1) less for each minion in your graveyard.")
    .flavorText("The more that die, the stronger we become.")
    .collectible(true)
    .build(),
  
  // Skeletal Warrior
  createCard()
    .id(4006)
    .name("Skeletal Warrior")
    .manaCost(2)
    .attack(2)
    .health(1)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .race("Undead")
    .addKeyword("deathrattle")
    .deathrattle({
      type: "summon_token",
      summonCardId: 4900,
      value: 1
    })
    .description("Deathrattle: Summon a 1/1 Skeleton.")
    .flavorText("Even in death, it raises more to serve.")
    .collectible(true)
    .build(),
  
  // Banshee
  createCard()
    .id(4007)
    .name("Banshee")
    .manaCost(3)
    .attack(3)
    .health(2)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .race("Undead")
    .addKeyword("battlecry")
    .battlecry({
      type: "silence",
      targetType: "any_minion",
      requiresTarget: true
    })
    .description("Battlecry: Silence a minion.")
    .flavorText("Her scream silences the living and the dead.")
    .collectible(true)
    .build(),
  
  // Reanimated Dragon
  createCard()
    .id(4008)
    .name("Reanimated Dragon")
    .manaCost(7)
    .attack(6)
    .health(6)
    .class("Necromancer")
    .rarity("epic")
    .type("minion")
    .race("Undead")
    // Using just one race for now as race2 is not supported in the Card Builder API
    .customProperty("secondaryRace", "Dragon") // Store second race as a custom property instead
    .addKeyword("battlecry")
    .battlecry({
      type: "damage_all",
      value: 3
    })
    .customProperty("excludeSelf", true) // Exclude this minion from the damage effect
    .description("Battlecry: Deal 3 damage to all other minions.")
    .flavorText("Even dragons bow to the Necromancer's will.")
    .collectible(true)
    .build(),
  
  // Lich Queen
  createCard()
    .id(4009)
    .name("Lich Queen")
    .manaCost(9)
    .attack(4)
    .health(8)
    .class("Necromancer")
    .rarity("mythic")
    .type("minion")
    .race("Undead")
    .customProperty("endOfTurn", {
      type: "resurrect_random",
      value: 1
    })
    .description("At the end of your turn, resurrect a friendly minion that died this game.")
    .flavorText("Her reign is eternal, her servants undying.")
    .collectible(true)
    .build(),
  
  // Death Knight
  createCard()
    .id(4010)
    .name("Death Knight")
    .manaCost(5)
    .attack(4)
    .health(5)
    .class("Necromancer")
    .rarity("mythic")
    .type("minion")
    .race("Undead")
    .addKeyword("battlecry")
    .battlecry({
      type: "consume_target",
      targetType: "any_minion",
      requiresTarget: true
    })
    .description("Battlecry: Destroy a minion and gain its Attack and Health.")
    .flavorText("A warrior reborn, fueled by the souls of the slain.")
    .collectible(true)
    .build(),
  
  // Ghoul
  createCard()
    .id(4011)
    .name("Ghoul")
    .manaCost(2)
    .attack(2)
    .health(2)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .race("Undead")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_conditional",
      condition: { check: "graveyard_size", minimum: 3 },
      buffAttack: 2,
      buffHealth: 2
    })
    .description("Battlecry: If your graveyard has at least 3 minions, gain +2/+2.")
    .flavorText("It feasts on the fallen, growing with each bite.")
    .collectible(true)
    .build(),
  
  // Tombstone
  createCard()
    .id(4012)
    .name("Tombstone")
    .manaCost(3)
    .attack(0)
    .health(5)
    .class("Necromancer")
    .rarity("rare")
    .type("minion")
    .customProperty("startOfTurn", {
      type: "summon_token",
      summonCardId: 4901, // Zombie ID
      value: 1
    })
    .description("At the start of your turn, summon a 2/2 Zombie.")
    .flavorText("A monument to the dead, and a gateway for their return.")
    .collectible(true)
    .build(),
  
  // Graveborn
  createCard()
    .id(4013)
    .name("Graveborn")
    .manaCost(4)
    .attack(3)
    .health(4)
    .class("Necromancer")
    .rarity("rare")
    .type("minion")
    .customProperty("onMinionDeath", {
      type: "buff_attack",
      value: 1
    })
    .description("Whenever a minion dies, gain +1 Attack.")
    .flavorText("Fed by the fallen, it grows ever stronger.")
    .collectible(true)
    .build(),
  
  // Necromancer's Apprentice
  createCard()
    .id(4014)
    .name("Necromancer's Apprentice")
    .manaCost(3)
    .attack(2)
    .health(3)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .customProperty("spellDiscount", {
      type: "targeted_spell_discount",
      value: 1
    })
    .description("Your spells that target minions cost (1) less.")
    .flavorText("Learning the dark arts, one spell at a time.")
    .collectible(true)
    .build(),
  
  // ----- SPELLS -----
  
  // Raise Dead
  createCard()
    .id(4100)
    .name("Raise Dead")
    .manaCost(2)
    .class("Necromancer")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "summon_from_graveyard",
      targetType: "none"
    })
    .description("Summon a random minion that died this game.")
    .flavorText("Some say it's unnatural to raise the dead. Necromancers say it's recycling.")
    .collectible(true)
    .build(),
  
  // Death's Toll
  createCard()
    .id(4101)
    .name("Death's Toll")
    .manaCost(3)
    .class("Necromancer")
    .rarity("rare") 
    .type("spell")
    .spellEffect({
      type: "damage_based_on_race_count",
      targetType: "enemy_minions",
      value: 1, // Damage per Undead
      requiresTarget: false
    })
    .customProperty("raceToCount", "Undead") // Use a custom property instead of 'race'
    .description("Deal 1 damage to all enemy minions for each Undead in your graveyard.")
    .flavorText("The dead demand compensation.")
    .collectible(true)
    .build(),
  
  // Soul Harvest (Hero Power)
  createCard()
    .id(4102)
    .name("Soul Harvest")
    .manaCost(0)
    .class("Necromancer")
    .rarity("basic") // Hero power
    .type("spell")
    .spellEffect({
      type: "hero_power",
      targetType: "none",
      value: 2 // Self-damage amount
    })
    .customProperty("summonCardId", 4900) // Skeleton ID
    .description("Hero Power: Take 2 damage. Summon a 2/1 Skeleton with Rush.")
    .flavorText("The power to create life comes at a cost.")
    .collectible(false) // Hero powers aren't collectible
    .build(),
  
  // Graveyard Ritual
  createCard()
    .id(4103)
    .name("Graveyard Ritual")
    .manaCost(5)
    .class("Necromancer")
    .rarity("epic")
    .type("spell")
    .spellEffect({
      type: "discover_from_graveyard",
      targetType: "none",
      discoveryCount: 3
    })
    .customProperty("buffAmount", 2) // Custom property for buff amount
    .description("Foresee a minion that died this game. Summon it with +2/+2.")
    .flavorText("Choose your fallen champion. This time, they'll be stronger.")
    .collectible(true)
    .build(),
  
  // Soul Drain
  createCard()
    .id(4105)
    .name("Soul Drain")
    .manaCost(4)
    .class("Necromancer")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "damage",
      targetType: "any_minion",
      value: 3,
      requiresTarget: true
    })
    .customProperty("conditionalHeal", {
      type: "heal_on_kill",
      value: 3
    })
    .description("Deal 3 damage to a minion. If it dies, restore 3 health to your hero.")
    .flavorText("Life for life, death for power.")
    .collectible(true)
    .build(),
  
  // Undead Horde
  createCard()
    .id(4106)
    .name("Undead Horde")
    .manaCost(6)
    .class("Necromancer")
    .rarity("rare")
    .type("spell")
    .spellEffect({
      type: "summon_multiple",
      targetType: "none",
      summonCardId: 4901, // Zombie ID
      count: 3
    })
    .description("Summon three 2/2 Zombies.")
    .flavorText("The dead rise in numbers too great to count.")
    .collectible(true)
    .build(),
  
  // Necrotic Plague
  createCard()
    .id(4107)
    .name("Necrotic Plague")
    .manaCost(5)
    .class("Necromancer")
    .rarity("epic")
    .type("spell")
    .spellEffect({
      type: "destroy_all",
      targetType: "all_minions",
      requiresTarget: false
    })
    .customProperty("healthThreshold", 2)
    .customProperty("generateToken", true)
    .customProperty("tokenCardId", 4900) // Skeleton ID
    .description("Destroy all minions with 2 or less health. For each minion destroyed, add a 1/1 Skeleton to your hand.")
    .flavorText("A sickness that leaves only bones behind.")
    .collectible(true)
    .build(),
  
  // Death's Embrace
  createCard()
    .id(4108)
    .name("Death's Embrace")
    .manaCost(2)
    .class("Necromancer")
    .rarity("common")
    .type("spell")
    .spellEffect({
      type: "buff",
      targetType: "any_minion",
      value: 2, // Base buff amount
      requiresTarget: true
    })
    .customProperty("conditionalRace", "Undead")
    .customProperty("raceBonusAmount", 1)
    .description("Give a minion +2/+2. If it's Undead, give it +3/+3 instead.")
    .flavorText("The touch of death empowers the lifeless.")
    .collectible(true)
    .build(),
  
  // Dark Ritual
  createCard()
    .id(4109)
    .name("Dark Ritual")
    .manaCost(1)
    .class("Necromancer")
    .rarity("rare")
    .type("spell")
    .spellEffect({
      type: "sacrifice",
      targetType: "friendly_minion",
      requiresTarget: true
    })
    .customProperty("drawCards", 2) // Number of cards to draw
    .description("Sacrifice a minion to draw two cards.")
    .flavorText("Power demands sacrifice.")
    .collectible(true)
    .build(),
  
  // Eternal Servitude
  createCard()
    .id(4110)
    .name("Eternal Servitude")
    .manaCost(4)
    .class("Necromancer")
    .rarity("rare")
    .type("spell")
    .spellEffect({
      type: "discover_and_summon_from_graveyard",
      targetType: "none",
      discoveryCount: 3
    })
    .description("Foresee a minion from your graveyard and summon it.")
    .flavorText("Service beyond death is the ultimate loyalty.")
    .collectible(true)
    .build(),
  
  // Mass Resurrection
  createCard()
    .id(4111)
    .name("Mass Resurrection")
    .manaCost(7)
    .class("Necromancer")
    .rarity("epic")
    .type("spell")
    .spellEffect({
      type: "resurrect_multiple",
      targetType: "none",
      count: 3
    })
    .description("Summon three random friendly minions that died this game.")
    .flavorText("The battlefield trembles as the dead return en masse.")
    .collectible(true)
    .build(),
  
  // Necromancer Hero
  createCard()
    .id(4104)
    .name("Necromancer")
    .manaCost(9)
    .class("Necromancer")
    .rarity("mythic")
    .type("hero")
    .customProperty("armor", 5)
    .customProperty("heroPower", {
      id: 4102,
      name: "Soul Harvest",
      manaCost: 2,
      description: "Take 2 damage. Summon a 2/1 Skeleton with Rush.",
      effect: {
        type: "hero_power",
        value: 2,
        targetType: "none"
      },
      collectible: false,
      class: "Necromancer"
    })
    .description("The master of death and undeath, capable of commanding minions beyond the grave.")
    .flavorText("They say life and death are natural cycles. The Necromancer disagrees.")
    .collectible(true)
    .build(),
  
  // ----- WEAPONS -----
  
  // Soulbound Dagger
  createCard()
    .id(4200)
    .name("Soulbound Dagger")
    .manaCost(2)
    .attack(2)
    .durability(2)
    .class("Necromancer")
    .rarity("rare")
    .type("weapon")
    .customProperty("onAttack", {
      type: "add_from_graveyard",
      value: 1
    })
    .description("After your hero attacks, add a random minion from your graveyard to your hand.")
    .flavorText("Bound to the souls it has claimed.")
    .collectible(true)
    .build(),
  
  // ----- TOKEN CARDS -----
  
  // Skeleton (token)
  createCard()
    .id(4900)
    .name("Skeleton")
    .manaCost(1)
    .attack(2)
    .health(1)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .race("Undead")
    .addKeyword("rush")
    .description("Rush")
    .flavorText("What it lacks in flesh, it makes up for in determination.")
    .collectible(false)
    .build(),
  
  // Zombie (token)
  createCard()
    .id(4901)
    .name("Zombie")
    .manaCost(2)
    .attack(2)
    .health(2)
    .class("Necromancer")
    .rarity("common")
    .type("minion")
    .race("Undead")
    .description("")
    .flavorText("It moves slowly, but it never stops coming.")
    .collectible(false)
    .build()
];

// Function to register all Necromancer cards in the registry
export function registerNecromancerCards(): void {
  if (IS_DEV) debug.card('Registering Necromancer cards...');
  
  for (const card of necromancerCards) {
    registerCard(card);
  }
  
  if (IS_DEV) debug.card(`Registered ${necromancerCards.length} Necromancer cards`);
}

export default necromancerCards;

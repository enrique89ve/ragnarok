/**
 * Common Neutral Minions
 * 
 * This file contains common neutral minions using the new card management system.
 */
import { debug } from '../../config/debugConfig';
import { createCard } from '../cardManagement';

const IS_DEV = import.meta.env?.DEV ?? false;

/**
 * Register common neutral minions in the registry
 */
export function registerCommonNeutralMinions(): void {
  if (IS_DEV) debug.card('Registering common neutral minions...');

  // Starting ID for common neutral minions (we'll use 20000+ range)
  let id = 20000;

  // Basic set minions
  createCard()
    .id(id++)
    .name("Darkscale Healer")
    .manaCost(5)
    .attack(4)
    .health(5)
    .description("Battlecry: Restore 2 health to all friendly characters.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal",
      targetType: "all_friendly",
      value: 2
    })
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Dwarven Machinist")
    .manaCost(4)
    .attack(2)
    .health(4)
    .description("Battlecry: Summon a 2/1 Automaton Dragonling.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon",
      summonCardId: 20030 // We'll define Mechanical Dragonling later
    })
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Razorfen Hunter")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Battlecry: Summon a 1/1 Boar.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon",
      summonCardId: 20050 // ID for a 1/1 Boar token
    })
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Sól's Acolyte")
    .manaCost(3)
    .attack(3)
    .health(2)
    .description("Battlecry: Give a friendly minion +1/+1.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff",
      targetType: "friendly_minion",
      requiresTarget: true,
      buffAttack: 1,
      buffHealth: 1
    })
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Draugr Feaster")
    .manaCost(3)
    .attack(2)
    .health(3)
    .description("Whenever a minion dies, gain +1 Attack.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("undead")
    .addKeyword("on_minion_death")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Dire Wolf Alpha")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Adjacent minions have +1 Attack.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("aura")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Ancient Watcher")
    .manaCost(2)
    .attack(4)
    .health(5)
    .description("Can't attack.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("cant_attack")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Valkyrie Crusader")
    .manaCost(3)
    .attack(3)
    .health(1)
    .description("Divine Shield")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("divine_shield")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Earthen Ring Farseer")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Battlecry: Restore 3 Health.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "heal",
      targetType: "any",
      requiresTarget: true,
      value: 3
    })
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Jungle Panther")
    .manaCost(3)
    .attack(4)
    .health(2)
    .description("Stealth")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Ironfur Grizzly")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Taunt")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Vanaheim Elder")
    .manaCost(3)
    .attack(1)
    .health(4)
    .description("Taunt")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Raid Leader")
    .manaCost(3)
    .attack(2)
    .health(2)
    .description("Your other minions have +1 Attack.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("aura")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Fenrir's Rider")
    .manaCost(3)
    .attack(3)
    .health(1)
    .description("Charge")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("charge")
    .addCategory("classic")
    .build();
  
  createCard()
    .id(id++)
    .name("Fenrir's Hatchling")
    .manaCost(2)
    .attack(3)
    .health(2)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Sobek's Spawn")
    .manaCost(2)
    .attack(2)
    .health(3)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Frostwolf Grunt")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Taunt")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("taunt")
    .addCategory("basic")
    .build();
  
  createCard()
    .id(id++)
    .name("Stoneskin Gargoyle")
    .manaCost(3)
    .attack(1)
    .health(4)
    .description("At the start of your turn, restore this minion to full Health.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("turn_start_effect")
    .addCategory("classic")
    .build();
  
  // Mechanical themed minions
  createCard()
    .id(id++)
    .name("Tinkertown Technician")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Battlecry: If you control an Automaton, gain +1/+1 and add a spare part to your hand.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "conditional_buff_and_add",
      condition: "control_automaton",
      buffAttack: 1,
      buffHealth: 1
    })
    .addCategory("mech_synergy")
    .build();
  
  // Token for Dwarven Machinist
  createCard()
    .id(20030) // Using the ID we referenced earlier
    .name("Mechanical Dragonling")
    .manaCost(1)
    .attack(2)
    .health(1)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .collectible(false) // Token card
    .addCategory("token")
    .build();
  
  createCard()
    .id(id++)
    .name("Explodinator")
    .manaCost(4)
    .attack(3)
    .health(2)
    .description("Battlecry: Summon two 0/2 Goblin Bombs.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("battlecry")
    .battlecry({
      type: "summon_multiple",
      summonCardId: 20051, // Goblin Bomb token
      count: 2
    })
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Faithful Lumi")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Battlecry: Give a friendly Automaton +1/+1.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff",
      targetType: "friendly_automaton",
      requiresTarget: true,
      buffAttack: 1,
      buffHealth: 1
    })
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Upgradeable Framebot")
    .manaCost(2)
    .attack(1)
    .health(5)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Skaterbot")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Runic Bond, Rush")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("magnetic")
    .addKeyword("rush")
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Bronze Gatekeeper")
    .manaCost(3)
    .attack(1)
    .health(5)
    .description("Runic Bond, Taunt")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("magnetic")
    .addKeyword("taunt")
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Damaged Stegotron")
    .manaCost(6)
    .attack(5)
    .health(12)
    .description("Taunt. Battlecry: Deal 5 damage to this minion.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("taunt")
    .addKeyword("battlecry")
    .battlecry({
      type: "self_damage",
      value: 5
    })
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Spring Rocket")
    .manaCost(3)
    .attack(2)
    .health(1)
    .description("Battlecry: Deal 2 damage.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("battlecry")
    .battlecry({
      type: "deal_damage",
      targetType: "any",
      requiresTarget: true,
      value: 2
    })
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Spark Engine")
    .manaCost(2)
    .attack(2)
    .health(1)
    .description("Rush. Battlecry: Add a 1/1 Spark with Rush to your hand.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("rush")
    .addKeyword("battlecry")
    .battlecry({
      type: "add_to_hand",
      cardId: 20052 // Spark token
    })
    .addCategory("boomsday")
    .build();
  
  createCard()
    .id(id++)
    .name("Coppertail Imposter")
    .manaCost(4)
    .attack(4)
    .health(4)
    .description("Battlecry: Gain Stealth until your next turn.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("battlecry")
    .battlecry({
      type: "gain_stealth_until_next_turn"
    })
    .addCategory("boomsday")
    .build();
  
  // Other minions
  createCard()
    .id(id++)
    .name("Arena Fanatic")
    .manaCost(4)
    .attack(2)
    .health(3)
    .description("Battlecry: Give all minions in your hand +1/+1.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "buff_hand",
      buffAttack: 1,
      buffHealth: 1
    })
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Cheaty Anklebiter")
    .manaCost(2)
    .attack(2)
    .health(1)
    .description("Lifesteal. Battlecry: Deal 1 damage.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("lifesteal")
    .addKeyword("battlecry")
    .battlecry({
      type: "deal_damage",
      targetType: "any",
      requiresTarget: true,
      value: 1
    })
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Waterboy")
    .manaCost(2)
    .attack(2)
    .health(1)
    .description("Battlecry: The next Hero Power you use this turn costs (0).")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "reduce_hero_power_cost",
      value: 0
    })
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Soup Vendor")
    .manaCost(2)
    .attack(1)
    .health(4)
    .description("Whenever you restore a minion to full Health, draw a card.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("on_heal_to_full")
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Dozing Marksman")
    .manaCost(3)
    .attack(0)
    .health(4)
    .description("Has +4 Attack while damaged.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("enrage")
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Saronite Taskmaster")
    .manaCost(1)
    .attack(2)
    .health(3)
    .description("Deathrattle: Summon a 0/3 Free Agent with Taunt for your opponent.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("deathrattle")
    .deathrattle({
      type: "summon_for_opponent",
      summonCardId: 20053 // Free Agent token
    })
    .addCategory("rastakhan")
    .build();

  createCard()
    .id(id++)
    .name("Spellzerker")
    .manaCost(2)
    .attack(2)
    .health(3)
    .description("Has +2 Spell Damage while damaged.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("conditional_spell_damage")
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Gurubashi Chicken")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Overkill: Gain +5 Attack.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("overkill")
    .addCategory("rastakhan")
    .build();

  // Beast-themed minions
  createCard()
    .id(id++)
    .name("Ornery Tortoise")
    .manaCost(3)
    .attack(3)
    .health(5)
    .description("Battlecry: Deal 5 damage to your hero.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "deal_damage_to_hero",
      value: 5
    })
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Half-Time Scavenger")
    .manaCost(4)
    .attack(3)
    .health(5)
    .description("Stealth. Overkill: Gain 3 Armor.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("stealth")
    .addKeyword("overkill")
    .addCategory("rastakhan")
    .build();
  
  createCard()
    .id(id++)
    .name("Pterrordax Hatchling")
    .manaCost(3)
    .attack(2)
    .health(2)
    .description("Battlecry: Adapt.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "adapt"
    })
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Tortollan Forager")
    .manaCost(2)
    .attack(2)
    .health(2)
    .description("Battlecry: Add a random minion with 5 or more Attack to your hand.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("battlecry")
    .battlecry({
      type: "add_random_to_hand",
      filter: "attack_5_or_more"
    })
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Nesting Roc")
    .manaCost(5)
    .attack(4)
    .health(7)
    .description("Battlecry: If you control at least 2 other minions, gain Taunt.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "conditional_gain_taunt",
      condition: "control_2_minions"
    })
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Sabretooth Stalker")
    .manaCost(6)
    .attack(8)
    .health(2)
    .description("Stealth")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Giant Wasp")
    .manaCost(3)
    .attack(2)
    .health(2)
    .description("Stealth. Poisonous.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("stealth")
    .addKeyword("poisonous")
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Thunder Lizard")
    .manaCost(3)
    .attack(3)
    .health(3)
    .description("Battlecry: If you played an Elemental last turn, Adapt.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("battlecry")
    .battlecry({
      type: "conditional_adapt",
      condition: "played_elemental_last_turn"
    })
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Stegodon")
    .manaCost(4)
    .attack(2)
    .health(6)
    .description("Taunt")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Volatile Elemental")
    .manaCost(2)
    .attack(1)
    .health(1)
    .description("Deathrattle: Deal 3 damage to a random enemy minion.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("deathrattle")
    .deathrattle({
      type: "deal_damage",
      targetType: "random_enemy_minion",
      value: 3
    })
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Duskboar")
    .manaCost(2)
    .attack(4)
    .health(1)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Emerald Hive Queen")
    .manaCost(1)
    .attack(2)
    .health(3)
    .description("Your spells cost (2) more.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("aura")
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Stubborn Gastropod")
    .manaCost(2)
    .attack(1)
    .health(2)
    .description("Taunt. Poisonous.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("taunt")
    .addKeyword("poisonous")
    .addCategory("ungoro")
    .build();
  
  createCard()
    .id(id++)
    .name("Raptor Hatchling")
    .manaCost(1)
    .attack(2)
    .health(1)
    .description("Deathrattle: Shuffle a 4/3 Raptor into your deck.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .addKeyword("deathrattle")
    .deathrattle({
      type: "shuffle_card",
      cardId: 20054 // Raptor token
    })
    .addCategory("ungoro")
    .build();
  
  // Create necessary tokens
  createCard()
    .id(20050) // Boar token
    .name("Boar")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .collectible(false)
    .addCategory("token")
    .build();
  
  createCard()
    .id(20051) // Goblin Bomb token
    .name("Goblin Bomb")
    .manaCost(1)
    .attack(0)
    .health(2)
    .description("Deathrattle: Deal 2 damage to the enemy hero.")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("mech")
    .addKeyword("deathrattle")
    .deathrattle({
      type: "deal_damage",
      targetType: "enemy_hero",
      value: 2
    })
    .collectible(false)
    .addCategory("token")
    .build();
  
  createCard()
    .id(20052) // Spark token
    .name("Spark")
    .manaCost(1)
    .attack(1)
    .health(1)
    .description("Rush")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("elemental")
    .addKeyword("rush")
    .collectible(false)
    .addCategory("token")
    .build();
  
  createCard()
    .id(20053) // Free Agent token
    .name("Free Agent")
    .manaCost(1)
    .attack(0)
    .health(3)
    .description("Taunt")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .addKeyword("taunt")
    .collectible(false)
    .addCategory("token")
    .build();
  
  createCard()
    .id(20054) // Raptor token
    .name("Raptor")
    .manaCost(3)
    .attack(4)
    .health(3)
    .description("")
    .rarity("common")
    .type("minion")
    .heroClass("neutral")
    .race("beast")
    .collectible(false)
    .addCategory("token")
    .build();

  if (IS_DEV) debug.card('Common neutral minions registered successfully.');
}
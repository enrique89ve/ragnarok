/**
 * NorseTypes.ts
 * 
 * Type definitions for Norse mythology characters in Ragnarok Poker.
 * Includes Kings (passive summoners) and Heroes (active combatants).
 */

import { ElementType } from './ChessTypes';

/**
 * Norse element types (extended from base ElementType)
 */
export type NorseElement = 'fire' | 'water' | 'grass' | 'electric' | 'light' | 'dark' | 'ice' | 'neutral';

/**
 * Map Norse elements to game ElementType
 */
export const NORSE_TO_GAME_ELEMENT: Record<NorseElement, ElementType> = {
  fire: 'fire',
  water: 'water',
  grass: 'earth',
  electric: 'wind',
  light: 'holy',
  dark: 'shadow',
  ice: 'water',  // Ice is a variant of Water
  neutral: 'neutral'
};

// ==================== KING TYPES ====================

/**
 * King passive trigger types
 */
export type KingPassiveTrigger = 
  | 'always'           // Continuous aura (stat buffs)
  | 'start_of_turn'    // Beginning of owner's turn
  | 'end_of_turn'      // End of owner's turn
  | 'on_minion_play'   // When owner plays a minion
  | 'on_minion_death'  // When a friendly minion dies
  | 'on_minion_attack' // When a friendly minion attacks
  | 'on_heal';         // When a friendly minion is healed

/**
 * King passive effect types
 */
export type KingPassiveEffectType = 
  | 'buff_attack'       // Grant attack to friendly minions
  | 'buff_health'       // Grant health to friendly minions
  | 'buff_armor'        // Grant armor to friendly minions
  | 'debuff_attack'     // Reduce enemy attack
  | 'damage_all_enemies'// Deal damage to all enemy minions
  | 'heal_all_friendly' // Heal all friendly minions
  | 'summon_token'      // Summon a token minion
  | 'freeze_random'     // Freeze a random enemy
  | 'grant_attack_on_heal' // Give attack when healed
  | 'damage_all'           // Deal damage to ALL minions (friendly + enemy)
  | 'damage_adjacent_random'; // Deal damage to a random adjacent enemy minion

/**
 * Single King passive effect
 */
export interface KingPassiveEffect {
  id: string;
  name: string;
  description: string;
  trigger: KingPassiveTrigger;
  effectType: KingPassiveEffectType;
  value: number;
  isAura: boolean;  // If true, effect is removed when King dies
  affectsAll?: boolean; // If true, affects both friendly AND enemy minions

  // For summon effects
  summonData?: {
    name: string;
    attack: number;
    health: number;
    keywords?: string[];
    randomKeyword?: boolean;
  };
}

/**
 * King definition - summoner with passive abilities
 */
export interface NorseKing {
  id: string;
  name: string;
  title: string;
  description: string;
  role: string;          // Gameplay role (e.g., "Tempo", "Attrition")
  designIntent: string;  // Design philosophy quote
  portrait?: string;
  
  // Kings have NO spells, NO hero power, NO element (they boost all heroes)
  hasSpells: false;
  
  // Two passive effects per King
  passives: [KingPassiveEffect, KingPassiveEffect] | [KingPassiveEffect];
}

// ==================== HERO TYPES ====================

/**
 * Hero power target types
 */
export type HeroPowerTargetType = 
  | 'none'              // No target (auto-cast)
  | 'friendly_minion'   // Target a friendly minion
  | 'enemy_minion'      // Target an enemy minion
  | 'any_minion'        // Target any minion
  | 'friendly_character'// Target friendly hero or minion
  | 'enemy_character'   // Target enemy hero or minion
  | 'any_character'     // Target any character
  | 'random_enemy'      // Random enemy target
  | 'random_friendly'   // Random friendly target
  | 'enemy_hero'        // Target enemy hero only
  | 'graveyard';        // Target dead minion (Hermod)

/**
 * Hero power effect types
 */
export type HeroPowerEffectType = 
  | 'damage_single'           // Deal damage to single target
  | 'damage_aoe'              // Deal damage to all enemies
  | 'damage_random'           // Deal damage to random target
  | 'damage_hero'             // Deal damage to enemy hero
  | 'damage_all'              // Deal damage to all characters
  | 'chain_damage'            // Deal damage with chain/splash
  | 'heal_single'             // Heal single target
  | 'heal_aoe'                // Heal all friendlies
  | 'heal'                    // Heal any target
  | 'heal_and_buff'           // Heal a target AND give stat buffs
  | 'heal_all_friendly'       // Heal all friendly minions
  | 'buff_single'             // Buff a single minion
  | 'buff_aoe'                // Buff all friendly minions
  | 'buff_hero'               // Buff hero (attack + armor)
  | 'debuff_single'           // Debuff a single enemy
  | 'debuff_aoe'              // Debuff all enemies
  | 'summon'                  // Summon a token
  | 'summon_random'           // Summon random from pool
  | 'self_damage_and_summon'  // Take damage and summon
  | 'draw_and_damage'         // Draw cards and take damage
  | 'freeze'                  // Freeze target
  | 'silence'                 // Silence a minion
  | 'stealth'                 // Grant stealth
  | 'draw'                    // Draw cards
  | 'reveal'                  // Reveal opponent cards
  | 'copy'                    // Copy opponent cards
  | 'scry'                    // Look at top of deck
  | 'discover'                // Discover a card
  | 'grant_keyword'           // Grant a keyword (taunt, divine shield, etc.)
  | 'grant_divine_shield'     // Grant divine shield specifically
  | 'equip_weapon'            // Equip a weapon
  | 'equip_random_weapon'     // Equip random weapon
  | 'generate_enemy_class_card' // Generate card from enemy class
  | 'gain_armor'              // Gain armor
  // Egyptian-specific effect types
  | 'conditional_destroy'     // Destroy target if condition met (Ammit)
  | 'set_stats'               // Set attack and health to specific value (Ma'at)
  | 'damage_and_poison'       // Deal damage and apply poison (Serqet)
  | 'bounce_to_hand'          // Return minion to hand (Fujin)
  | 'bounce_and_damage_hero'  // Return to hand and damage hero (Fujin+)
  | 'bounce'                  // Return minion to board/hand (generic bounce)
  | 'bounce_damage'           // Bounce minion and deal damage
  // Greek-specific effect types
  | 'damage_hero_and_buff_pets' // Deal damage to enemy hero and buff friendly pets (Artemis)
  | 'self_damage_and_buff'     // Take damage and buff a friendly minion (Prometheus)
  // Japanese-specific effect types
  | 'sacrifice_summon'        // Destroy friendly and summon (Izanami)
  | 'mana_ramp'               // Gain mana crystals (Inari)
  | 'transform_card'          // Transform a card (Kitsune)
  | 'resurrect_to_hand'       // Return dead minion to hand (Hermod)
  // Gambling/luck effects (Gefjon)
  | 'roll_the_dice'           // Deal 1-6 random damage to a random enemy
  | 'roll_the_dice_double'    // Roll twice, keep higher result
  // Combo archetype (Verdandi)
  | 'generate_fate_strand'    // Add a 0-cost damage spell to hand
  // Escalating archetype (Vali)
  | 'escalating_damage';      // Deal damage that increases each use

/**
 * Hero power definition
 */
export interface NorseHeroPower {
  id: string;
  name: string;
  description: string;
  cost: number;           // Mana cost (usually 2)
  targetType: HeroPowerTargetType;
  effectType: HeroPowerEffectType;
  
  // Effect values
  value?: number;           // Primary value (damage, heal, buff amount)
  secondaryValue?: number;  // Secondary value (e.g., heal hero amount)
  duration?: 'permanent' | 'this_turn' | 'next_turn';
  selfDamage?: number;      // Self-damage amount (for Life Tap style)
  armorValue?: number;      // Armor to gain
  healOnBreak?: number;     // Heal amount when shield/oath breaks (Frigg)
  costHealth?: boolean;     // Pay Health equal to card cost (Hermod)
  buffAttack?: number;      // Bonus attack buff (Bestla upgraded)
  
  // For summon effects
  summonData?: {
    name: string;
    attack: number;
    health: number;
    keywords?: string[];
    race?: string;
    deathrattle?: {
      type?: string;
      value?: number;
      summonName?: string;
      summonAttack?: number;
      summonHealth?: number;
    };
  };
  
  // For random summons (totems, etc.)
  summonPool?: string[];
  bonusStats?: { attack: number; health: number };
  
  // For weapon equip
  weaponData?: { name?: string; attack: number; durability: number; keywords?: string[] };
  weaponCost?: number;
  
  // For discover effects
  discoverType?: string;
  costReduction?: number;
  
  // For keyword grants
  grantKeyword?: string;
  
  // For conditional effects (Egyptian - Ammit, etc.)
  condition?: {
    maxAttack?: number;      // Max attack for conditional destroy
    minAttack?: number;      // Min attack requirement
    maxHealth?: number;      // Max health requirement
    hasKeyword?: string;     // Requires specific keyword
  };
}

/**
 * Upgraded hero power (after weapon spell)
 */
export interface NorseHeroPowerUpgrade extends NorseHeroPower {
  isUpgraded: true;
  baseHeroPowerId: string;
}

/**
 * Weapon upgrade card definition
 */
export interface NorseWeaponUpgrade {
  id: number;
  name: string;
  heroId: string;
  manaCost: 5;  // Always 5 mana
  description: string;
  flavorText?: string;
  
  // Immediate effect when played
  immediateEffect: {
    type: string;
    value?: number;
    count?: number;
    targetType?: string;
    description: string;
    armorValue?: number;
    discount?: number;
    discoverType?: string;
    drawValue?: number;
    condition?: string | { maxAttack?: number; minAttack?: number; maxHealth?: number; };
    weaponData?: { attack: number; durability: number; keywords?: string[] };
    summonData?: { name: string; attack: number; health: number; keywords?: string[]; race?: string };
  };
  
  // The upgraded power it grants
  upgradedPowerId: string;
}

/**
 * Hero passive trigger types
 */
export type HeroPassiveTrigger = 
  | 'on_minion_play'        // When hero plays a minion
  | 'on_spell_cast'         // When hero casts a spell
  | 'on_minion_attack'      // When a friendly minion attacks
  | 'on_minion_death'       // When any minion dies
  | 'on_enemy_minion_death' // When enemy minion dies
  | 'on_damage_dealt'       // When hero/minion deals damage
  | 'on_hero_damage'        // When hero takes damage
  | 'on_heal'               // When any heal occurs
  | 'on_draw'               // When hero draws a card
  | 'on_aoe_damage'         // When AOE damage occurs
  | 'after_spell_cast'      // After casting a spell
  | 'end_of_turn'           // At end of hero's turn
  | 'start_of_turn'         // At start of hero's turn
  | 'always'                // Continuous aura effect
  // Egyptian-specific triggers
  | 'on_enemy_death'        // When enemy minion dies (Ammit)
  | 'on_poison_applied'     // When poison is applied (Serqet)
  // Japanese-specific triggers
  | 'on_friendly_death'     // When friendly minion dies (Izanami)
  | 'on_shield_break'       // When a Divine Shield is broken (Frigg)
  | 'on_freeze'             // When an enemy is frozen (Bestla)
  | 'on_card_play'          // When a card is played (Hermod)
  | 'on_roll_six'           // When Gefjon rolls a 6 (draw a card)
  | 'on_cards_played_3'     // After playing 3+ cards in a turn (Verdandi combo)
  | 'on_take_minion_damage' // When hero takes damage from enemy minion (Vali)
  | 'passive';              // Always active aura effect

/**
 * Hero passive condition
 */
export interface HeroPassiveCondition {
  minionElement?: NorseElement;
  minionKeyword?: string;
  minionType?: string;
  minionRace?: string;
  targetType?: 'friendly' | 'enemy' | 'any';
  requiresStealth?: boolean;
  requiresFrozen?: boolean;
  hasStealth?: boolean;
  hasArmor?: boolean;
  hasKeyword?: string;
  targetSilenced?: boolean;
  targetFrozen?: boolean;
  cardFromAnotherClass?: boolean;
  // Egyptian-specific conditions
  evenMinions?: boolean;        // For Ma'at - even number of minions
  maxAttack?: number;           // For conditional destroy effects
  // Greek-specific conditions
  minionIsPet?: boolean;        // For pet-specific effects (Artemis)
}

/**
 * Hero passive effect types
 */
export type HeroPassiveEffectType = 
  | 'buff_attack'           // Increase attack
  | 'buff_health'           // Increase health
  | 'buff'                  // Increase both attack and health
  | 'buff_stats'            // Increase both attack and health
  | 'buff_damage'           // Increase damage dealt
  | 'buff_hero_attack'      // Increase hero attack
  | 'buff_weapon_attack'    // Increase weapon attack
  | 'buff_weapon_durability'// Increase weapon durability
  | 'debuff_attack'         // Reduce enemy attack
  | 'damage_reduction'      // Reduce damage taken
  | 'spell_damage_reduction'// Reduce spell damage taken
  | 'damage_hero'           // Deal damage to enemy hero
  | 'damage_bonus'          // Bonus damage on attack
  | 'damage_amplify'        // Amplify damage to target
  | 'spell_damage_bonus'    // Increase spell damage
  | 'cost_reduction'        // Reduce card mana costs
  | 'grant_keyword'         // Grant a keyword to minions
  | 'heal'                  // Heal minions
  | 'heal_hero'             // Heal hero specifically
  | 'gain_armor'            // Gain armor
  | 'draw'                  // Draw cards
  | 'reveal'                // Reveal opponent cards
  | 'copy'                  // Copy opponent cards
  // Egyptian-specific effect types
  | 'draw_card'             // Draw a card (Ma'at)
  | 'heal_all_friendly'     // Heal all friendly minions (Khepri)
  // Greek-specific effect types
  | 'buff_random_friendly'  // Buff a random friendly minion (Prometheus)
  | 'heal_bonus';           // Bonus healing (Rhea)

/**
 * Hero passive effect
 */
export interface NorseHeroPassive {
  id: string;
  name: string;
  description: string;
  trigger: HeroPassiveTrigger;
  condition?: HeroPassiveCondition;
  effectType: HeroPassiveEffectType;
  value?: number;
  grantKeyword?: string; // Keyword to grant when effectType is 'grant_keyword'
}

/**
 * Norse Hero definition - active combatant
 */
export interface NorseHero {
  id: string;
  name: string;
  title: string;
  element: NorseElement;
  weakness: NorseElement;
  startingHealth: number;
  description: string;
  portrait?: string;
  lore?: string;
  gender?: 'male' | 'female' | 'non-binary';
  
  // Heroes have spells
  hasSpells: true;
  fixedCardIds: number[];
  
  // Class assignment (for spell pool)
  heroClass?: 'mage' | 'warrior' | 'paladin' | 'hunter' | 'rogue' | 'priest' | 'shaman' | 'warlock' | 'druid' | 'deathknight' | 'berserker' | 'necromancer';
  
  // Hero power (2 mana, once per turn)
  heroPower: NorseHeroPower;
  
  // Weapon upgrade card
  weaponUpgrade: NorseWeaponUpgrade;
  
  // Upgraded hero power (after weapon)
  upgradedHeroPower: NorseHeroPowerUpgrade;
  
  // Personal passive ability
  passive: NorseHeroPassive;
}

// ==================== REGISTRY TYPES ====================

/**
 * All Norse characters registry
 */
export interface NorseCharacterRegistry {
  kings: Record<string, NorseKing>;
  heroes: Record<string, NorseHero>;
}

/**
 * Effect execution context
 */
export interface PassiveExecutionContext {
  ownerId: 'player' | 'opponent';
  trigger: KingPassiveTrigger | HeroPassiveTrigger;
  sourceId: string;
  targetMinions?: string[];
  dyingMinionId?: string;
  playedMinionId?: string;
}

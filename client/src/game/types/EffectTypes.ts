/**
 * Effect Types
 * 
 * This file defines all the type interfaces for card effects in the game.
 * It provides consistent typing for battlecry, deathrattle, spell effects and more.
 */

// Target types
export type TargetType = 
  | 'none'
  | 'any'
  | 'friendly_character'
  | 'enemy_character'
  | 'friendly_minion'
  | 'enemy_minion'
  | 'any_minion'
  | 'all_minions'
  | 'friendly_minions'
  | 'enemy_minions'
  | 'random_minion'
  | 'random_enemy_minion'
  | 'random_friendly_minion'
  | 'adjacent_minions'
  | 'friendly_hero'
  | 'enemy_hero'
  | 'any_hero'
  | 'self';

// Result of an effect execution
export interface EffectResult {
  success: boolean;
  error?: string;
  additionalData?: any;
}

// Base interface for all effect types
export interface BaseEffect {
  type: string;
  requiresTarget?: boolean;
  targetType?: TargetType;
  value?: number;
  condition?: string;
  isRandom?: boolean;
}

// Damage effect
export interface DamageEffect extends BaseEffect {
  type: 'damage';
  value: number;
  splashDamage?: number;
  freezeTarget?: boolean;
  conditionalTarget?: string;
  conditionalValue?: number;
  isSplit?: boolean;
  targetsCount?: number;
}

// Heal effect
export interface HealEffect extends BaseEffect {
  type: 'heal';
  value: number;
}

// AoE Damage effect
export interface AoEDamageEffect extends BaseEffect {
  type: 'aoe_damage';
  value: number;
  includeHeroes?: boolean;
  healValue?: number;
  isBasedOnWeaponAttack?: boolean;
  destroyWeapon?: boolean;
  freezeTarget?: boolean;
}

// Buff effect
export interface BuffEffect extends BaseEffect {
  type: 'buff';
  buffAttack?: number;
  buffHealth?: number;
  temporaryEffect?: boolean;
  grantKeywords?: string[];
  grantDeathrattle?: any;
  grantTaunt?: boolean;
  adjacentOnly?: boolean;
  cardType?: string;
  isBasedOnStats?: boolean;
  includeHeroes?: boolean;
}

// Transform effect
export interface TransformEffect extends BaseEffect {
  type: 'transform';
  summonCardId?: number | string;
  returnToHand?: boolean;
  manaReduction?: number;
  isRepeatable?: boolean;
}

// Summon effect
export interface SummonEffect extends BaseEffect {
  type: 'summon';
  summonCardId?: number | string;
  summonCount?: number;
  summonForOpponent?: boolean;
  fromGraveyard?: boolean;
  fromHand?: boolean;
  specificManaCost?: number;
  specificRace?: string;
  condition?: string;
}

// Draw effect
export interface DrawEffect extends BaseEffect {
  type: 'draw';
  value: number;
  isBasedOnStats?: boolean;
  temporaryEffect?: boolean;
  delayedEffect?: boolean;
  delayedTrigger?: string;
  cardType?: string;
}

// Discover effect
export interface DiscoverEffect extends BaseEffect {
  type: 'discover';
  discoveryType?: string;
  discoveryCount?: number;
  discoveryClass?: string;
  discoveryPoolId?: string;
  discoveryManaCostRange?: {
    min: number;
    max: number;
  };
  manaDiscount?: number;
  manaReduction?: number;
  replaceDeck?: boolean;
  makeDuplicates?: boolean;
}

// Destroy effect
export interface DestroyEffect extends BaseEffect {
  type: 'destroy';
  condition?: string;
  discardCount?: number;
}

// Silence effect
export interface SilenceEffect extends BaseEffect {
  type: 'silence';
  drawCards?: number;
  secondaryEffect?: any;
}

// Quest effect
export interface QuestEffect extends BaseEffect {
  type: 'quest';
  questData?: any;
  progress?: number;
  target?: number;
  completed?: boolean;
  rewardCardId?: number | string;
}

// Add adjacent buff effect
export interface BuffAdjacentEffect extends BaseEffect {
  type: 'buff_adjacent';
  buffType?: string;
}

// This union type includes all possible effect types
export type CardEffect = 
  | DamageEffect
  | HealEffect
  | AoEDamageEffect
  | BuffEffect
  | TransformEffect
  | SummonEffect
  | DrawEffect
  | DiscoverEffect
  | DestroyEffect
  | SilenceEffect
  | QuestEffect
  | BuffAdjacentEffect
  | BaseEffect; // Include base effect for extensibility

// ==================== UNIFIED EFFECT TYPE STRINGS ====================
// These provide type safety for switch statements in utils files

/** Damage-related effect types */
export type DamageEffectType =
  | 'damage'
  | 'damage_single'
  | 'damage_aoe'
  | 'damage_random'
  | 'damage_random_enemy'
  | 'damage_hero'
  | 'damage_all'
  | 'damage_and_shuffle'
  | 'damage_and_poison'
  | 'damage_based_on_armor'
  | 'deal_damage'
  | 'aoe_damage'
  | 'cleave_damage'
  | 'cleave_damage_with_freeze'
  | 'chain_damage'
  | 'random_damage'
  | 'random_damage_and_buff'
  | 'random_damage_with_self_damage'
  | 'cthun_damage'
  | 'cthun_cultist_damage'
  | 'self_damage'
  | 'self_damage_buff'
  | 'shadowflame'
  | 'silence_and_damage'
  | 'split_damage'
  | 'sacrifice_and_aoe_damage'
  | 'weapon_damage_aoe';

/** Healing-related effect types */
export type HealEffectType =
  | 'heal'
  | 'heal_single'
  | 'heal_aoe'
  | 'heal_all_friendly'
  | 'heal_and_buff'
  | 'aoe_heal'
  | 'restore_health';

/** Buff-related effect types */
export type BuffEffectType =
  | 'buff'
  | 'buff_single'
  | 'buff_aoe'
  | 'buff_all'
  | 'buff_all_minions'
  | 'buff_attack'
  | 'buff_health'
  | 'buff_armor'
  | 'buff_self'
  | 'buff_hero'
  | 'buff_tribe'
  | 'buff_hand'
  | 'buff_deck'
  | 'buff_weapon'
  | 'buff_damaged_minions'
  | 'buff_cthun'
  | 'conditional_self_buff';

/** Debuff-related effect types */
export type DebuffEffectType =
  | 'debuff'
  | 'debuff_single'
  | 'debuff_aoe'
  | 'debuff_attack'
  | 'freeze'
  | 'freeze_all'
  | 'freeze_and_damage'
  | 'freeze_random'
  | 'silence'
  | 'silence_all'
  | 'frozen'
  | 'poisonous'
  | 'poisonous_temp'
  | 'sacrifice';

/** Summon-related effect types */
export type SummonEffectType =
  | 'summon'
  | 'summon_random'
  | 'summon_token'
  | 'summon_tokens'
  | 'summon_parts'
  | 'summon_copy'
  | 'summon_copies'
  | 'summon_from_graveyard'
  | 'summon_from_hand'
  | 'summon_highest_cost_from_graveyard'
  | 'summon_yggdrasil_golem'
  | 'summon_minions'
  | 'summon_multiple'
  | 'summon_rush_minions'
  | 'summon_stored'
  | 'conditional_summon'
  | 'conditional_summon_hand_titans'
  | 'self_damage_and_summon'
  | 'sacrifice_summon'
  | 'resurrect'
  | 'resurrect_multiple'
  | 'resurrect_random';

/** Draw-related effect types */
export type DrawEffectType =
  | 'draw'
  | 'draw_multiple'
  | 'draw_both'
  | 'draw_specific'
  | 'draw_by_type'
  | 'draw_from_deck'
  | 'draw_until'
  | 'draw_and_damage'
  | 'conditional_draw'
  | 'discard'
  | 'discard_random'
  | 'mill'
  | 'mill_cards';

/** Transform-related effect types */
export type TransformEffectType =
  | 'transform'
  | 'transform_all'
  | 'transform_and_silence'
  | 'transform_copy'
  | 'transform_copy_from_deck'
  | 'transform_deck'
  | 'transform_healing_to_damage'
  | 'transform_into_copy'
  | 'transform_random'
  | 'transform_random_in_hand'
  | 'set_attack'
  | 'set_health'
  | 'set_hero_health'
  | 'set_stats'
  | 'double_health'
  | 'copy'
  | 'copy_card'
  | 'copy_card_to_hand'
  | 'copy_from_opponent_deck'
  | 'swap_attack_health'
  | 'swap_decks'
  | 'swap_hero_power'
  | 'swap_stats'
  | 'swap_stats_with_target';

/** Control-related effect types */
export type ControlEffectType =
  | 'mind_control'
  | 'mind_control_random'
  | 'mind_control_temporary'
  | 'return'
  | 'return_to_hand'
  | 'return_to_hand_next_turn'
  | 'bounce'
  | 'bounce_to_hand'
  | 'bounce_damage'
  | 'bounce_and_damage_hero'
  | 'destroy'
  | 'destroy_all'
  | 'destroy_all_minions'
  | 'destroy_random'
  | 'destroy_tribe'
  | 'conditional_destroy'
  | 'conditional_freeze_or_destroy'
  | 'steal_card'
  | 'shuffle_card'
  | 'shuffle_cards'
  | 'shuffle_copies'
  | 'shuffle_into_deck';

/** Keyword-related effect types */
export type KeywordEffectType =
  | 'grant_keyword'
  | 'grant_divine_shield'
  | 'grant_deathrattle'
  | 'grant_immunity'
  | 'divine_shield'
  | 'divine shield'
  | 'divine_shield_gain'
  | 'stealth'
  | 'give_stealth'
  | 'gain_stealth_until_next_turn'
  | 'taunt'
  | 'charge'
  | 'lifesteal'
  | 'rush'
  | 'windfury'
  | 'spell_damage';

/** Resource-related effect types */
export type ResourceEffectType =
  | 'armor'
  | 'gain_armor'
  | 'gain_armor_and_draw'
  | 'gain_armor_and_immunity'
  | 'gain_armor_and_lifesteal'
  | 'conditional_armor'
  | 'mana_crystal'
  | 'gain_mana'
  | 'gain_mana_crystal'
  | 'gain_mana_crystals'
  | 'mana_discount'
  | 'mana_gain'
  | 'mana_reduction'
  | 'cost_reduction'
  | 'reduce_deck_cost'
  | 'reduce_next_spell_cost'
  | 'reduce_opponent_mana'
  | 'reduce_spell_cost';

/** Discovery-related effect types */
export type DiscoveryEffectType =
  | 'discover'
  | 'add_to_hand'
  | 'add_card'
  | 'give_cards'
  | 'equip_weapon'
  | 'random_weapon'
  | 'reveal'
  | 'scry'
  | 'kazakus_potion';

/** Special/unique effect types */
export type SpecialEffectType =
  | 'yogg_saron'
  | 'cast_all_spells'
  | 'resurrect_deathrattle'
  | 'crystal_core'
  | 'quest'
  | 'extra_turn'
  | 'change_hero_power'
  | 'replace_hero_power'
  | 'hero_attack'
  | 'damaged_hero'
  | 'conditional_effect'
  | 'conditional_damage'
  | 'conditional_full_heal'
  | 'conditional_free_hero_power'
  | 'conditional_next_spell_costs_zero'
  | 'grant_attack_on_heal'
  | 'always'
  | 'combo'
  | 'holding_dragon'
  | 'no_minions'
  | 'replay_battlecries'
  | 'replay_spells';

/** Class identifiers used in some effect switches */
export type ClassEffectType =
  | 'berserker'
  | 'druid'
  | 'hunter'
  | 'mage'
  | 'paladin'
  | 'priest'
  | 'rogue'
  | 'shaman'
  | 'warlock'
  | 'warrior';

/** Unified battlecry effect type - all valid battlecry effect strings */
export type BattlecryEffectType =
  | DamageEffectType
  | HealEffectType
  | BuffEffectType
  | DebuffEffectType
  | SummonEffectType
  | DrawEffectType
  | TransformEffectType
  | ControlEffectType
  | KeywordEffectType
  | ResourceEffectType
  | DiscoveryEffectType
  | SpecialEffectType;

/** Unified spell effect type - all valid spell effect strings */
export type SpellEffectTypeString =
  | DamageEffectType
  | HealEffectType
  | BuffEffectType
  | DebuffEffectType
  | SummonEffectType
  | DrawEffectType
  | TransformEffectType
  | ControlEffectType
  | KeywordEffectType
  | ResourceEffectType
  | DiscoveryEffectType
  | SpecialEffectType
  | ClassEffectType;

/** Unified deathrattle effect type - all valid deathrattle effect strings */
export type DeathrattleEffectType =
  | DamageEffectType
  | HealEffectType
  | BuffEffectType
  | SummonEffectType
  | DrawEffectType
  | KeywordEffectType
  | ResourceEffectType;
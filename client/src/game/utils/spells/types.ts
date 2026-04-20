/**
 * Spell Types and Shared Interfaces
 * 
 * This file contains types and interfaces shared across all spell modules.
 * Part of the spellUtils refactoring for production-quality code organization.
 */

import { GameState, SpellEffect, CardInstance } from '../../types';

/**
 * Standard signature for all spell execution functions
 */
export type SpellExecutor = (
  state: GameState,
  effect: SpellEffect,
  targetId?: string,
  targetType?: 'minion' | 'hero'
) => GameState;

/**
 * Spell effect type for animation scheduling
 */
export type SpellEffectType = 
  | 'damage' 
  | 'heal' 
  | 'buff' 
  | 'debuff' 
  | 'summon' 
  | 'aoe' 
  | 'draw' 
  | 'quest' 
  | 'transform' 
  | 'default';

/**
 * Maps effect type strings to SpellEffectType
 */
export function getSpellEffectType(effectType: string): SpellEffectType {
  const typeMap: Record<string, SpellEffectType> = {
    'damage': 'damage',
    'heal': 'heal',
    'buff': 'buff',
    'debuff': 'debuff',
    'summon': 'summon',
    'aoe_damage': 'aoe',
    'cleave_damage': 'aoe',
    'draw': 'draw',
    'quest': 'quest',
    'transform': 'transform',
    'freeze': 'debuff',
    'silence': 'debuff',
  };
  return typeMap[effectType] || 'default';
}

/**
 * Queue parameters for spell damage popup
 */
export interface SpellDamagePopupParams {
  spellName: string;
  damage: number;
  targetName?: string;
}

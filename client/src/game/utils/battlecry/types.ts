/**
 * Battlecry Utils Module Types
 * 
 * Type definitions specific to the battlecry system.
 */

import { GameState, CardInstance, CardData } from '../../types';
import { BattlecryEffect as EffectBattlecry } from '../../types/CardTypes';

/**
 * Battlecry effect types supported by the system
 */
export type BattlecryType = 
  | 'damage'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'summon'
  | 'draw'
  | 'discover'
  | 'discover_triclass'
  | 'silence'
  | 'freeze'
  | 'destroy'
  | 'transform'
  | 'copy'
  | 'return'
  | 'steal'
  | 'mind_control'
  | 'equip_weapon'
  | 'give_keyword'
  | 'conditional'
  | 'highlander'
  | 'adaptive'
  | 'recruit'
  | 'combo';

/**
 * Target specification for battlecry effects
 */
export interface BattlecryTarget {
  targetId?: string;
  targetType?: 'minion' | 'hero';
  targetPlayer?: 'player' | 'opponent' | 'any';
}

/**
 * Result of a battlecry execution
 */
export interface BattlecryResult {
  state: GameState;
  success: boolean;
  message?: string;
  animations?: BattlecryAnimation[];
}

/**
 * Animation data for battlecry visual effects
 */
export interface BattlecryAnimation {
  type: 'damage' | 'heal' | 'buff' | 'summon' | 'transform' | 'draw';
  sourceId: string;
  targetId?: string;
  value?: number;
}

/**
 * Categories for battlecryUtils functions (for future modular extraction)
 */
export enum BattlecryCategory {
  EXECUTION = 'execution',
  TARGETING = 'targeting',
  VALIDATION = 'validation',
  DAMAGE = 'damage',
  HEAL = 'heal',
  BUFF = 'buff',
  SUMMON = 'summon',
  DISCOVER = 'discover',
  TRANSFORM = 'transform',
  HIGHLANDER = 'highlander'
}

/**
 * Function metadata for migration tracking
 */
export interface BattlecryFunctionInfo {
  name: string;
  category: BattlecryCategory;
  lineCount: number;
  dependencies: string[];
  migrated: boolean;
}

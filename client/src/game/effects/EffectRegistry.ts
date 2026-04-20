/**
 * @deprecated NOT wired into the live game loop.
 *
 * The game executes effects through:
 *   - battlecryUtils.ts  (battlecries)
 *   - deathrattleUtils.ts (deathrattles)
 *   - spellUtils.ts       (spells)
 *
 * This registry holds 130+ handler functions (effects/handlers/*) that
 * operate on GameContext, but the game state is GameState. The two shapes
 * differ (GameContext has currentPlayer/opponentPlayer; GameState has
 * players.player/players.opponent). Bridge files that attempted to
 * translate between them (battlecryBridge, deathrattleBridge, spellBridge)
 * were removed because:
 *   1. The deathrattle bridge cast GameState as GameContext (broken).
 *   2. The battlecry bridge had syncContextToState() but was never
 *      imported by game code.
 *   3. The spell bridge had the same casting bug as the deathrattle one.
 *
 * The handler files themselves are preserved — they contain significant
 * effect logic that could be properly integrated if a GameContext adapter
 * is built. Until then, utils are the canonical execution path.
 *
 * initEffectSystem() in App.tsx still registers handlers so that
 * getRegisteredHandlers() / hasHandler() remain usable for tooling.
 */
import { GameContext } from '../GameContext';
import { Card, SpellEffect, BattlecryEffect, DeathrattleEffect } from '../types/CardTypes';
import { EffectResult } from '../types/EffectTypes';
import { debug } from '../config/debugConfig';

// Type definitions for effect handlers
export type BattlecryHandler = (context: GameContext, effect: BattlecryEffect, sourceCard: Card) => EffectResult;
export type DeathrattleHandler = (context: GameContext, effect: DeathrattleEffect, sourceCard: Card) => EffectResult;
export type SpellEffectHandler = (context: GameContext, effect: SpellEffect, sourceCard: Card) => EffectResult;

/**
 * Central registry for all card effect handlers
 */
export class EffectRegistry {
  // Handler registries
  private static battlecryHandlers: Record<string, BattlecryHandler> = {};
  private static deathrattleHandlers: Record<string, DeathrattleHandler> = {};
  private static spellEffectHandlers: Record<string, SpellEffectHandler> = {};
  private static comboHandlers: Record<string, BattlecryHandler> = {};
  
  // Handler registration methods
  static registerBattlecryHandler(type: string, handler: BattlecryHandler): void {
    this.battlecryHandlers[type] = handler;
  }
  
  static registerDeathrattleHandler(type: string, handler: DeathrattleHandler): void {
    this.deathrattleHandlers[type] = handler;
  }
  
  static registerSpellEffectHandler(type: string, handler: SpellEffectHandler): void {
    this.spellEffectHandlers[type] = handler;
  }
  
  static registerComboHandler(type: string, handler: BattlecryHandler): void {
    this.comboHandlers[type] = handler;
  }
  
  // Effect execution methods
  static executeBattlecry(context: GameContext, effect: BattlecryEffect, sourceCard: Card): EffectResult {
    const handler = this.battlecryHandlers[effect.type];
    
    if (!handler) {
      debug.error(`Unknown battlecry type: ${effect.type}`);
      return { success: false, error: `Unknown battlecry type: ${effect.type}` };
    }
    
    try {
      return handler(context, effect, sourceCard);
    } catch (error) {
      debug.error(`Error executing battlecry ${effect.type}:`, error);
      return { 
        success: false, 
        error: `Error executing battlecry ${effect.type}: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  static executeDeathrattle(context: GameContext, effect: DeathrattleEffect, sourceCard: Card): EffectResult {
    const handler = this.deathrattleHandlers[effect.type];
    
    if (!handler) {
      debug.error(`Unknown deathrattle type: ${effect.type}`);
      return { success: false, error: `Unknown deathrattle type: ${effect.type}` };
    }
    
    try {
      return handler(context, effect, sourceCard);
    } catch (error) {
      debug.error(`Error executing deathrattle ${effect.type}:`, error);
      return { 
        success: false, 
        error: `Error executing deathrattle ${effect.type}: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  static executeSpellEffect(context: GameContext, effect: SpellEffect, sourceCard: Card): EffectResult {
    const handler = this.spellEffectHandlers[effect.type];
    
    if (!handler) {
      debug.error(`Unknown spell effect type: ${effect.type}`);
      return { success: false, error: `Unknown spell effect type: ${effect.type}` };
    }
    
    try {
      return handler(context, effect, sourceCard);
    } catch (error) {
      debug.error(`Error executing spell effect ${effect.type}:`, error);
      return { 
        success: false, 
        error: `Error executing spell effect ${effect.type}: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  static executeCombo(context: GameContext, effect: BattlecryEffect, sourceCard: Card): EffectResult {
    const handler = this.comboHandlers[effect.type];
    
    if (!handler) {
      debug.error(`Unknown combo type: ${effect.type}`);
      return { success: false, error: `Unknown combo type: ${effect.type}` };
    }
    
    try {
      return handler(context, effect, sourceCard);
    } catch (error) {
      debug.error(`Error executing combo ${effect.type}:`, error);
      return { 
        success: false, 
        error: `Error executing combo ${effect.type}: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  // Utility methods
  
  /**
   * Check if an effect type has a registered handler
   */
  static hasHandler(effectCategory: 'battlecry' | 'deathrattle' | 'spellEffect' | 'combo', type: string): boolean {
    switch (effectCategory) {
      case 'battlecry':
        return !!this.battlecryHandlers[type];
      case 'deathrattle':
        return !!this.deathrattleHandlers[type];
      case 'spellEffect':
        return !!this.spellEffectHandlers[type];
      case 'combo':
        return !!this.comboHandlers[type];
      default:
        return false;
    }
  }
  
  /**
   * Get a list of all registered handlers by category
   */
  static getRegisteredHandlers(category?: 'battlecry' | 'deathrattle' | 'spellEffect' | 'combo'): string[] {
    if (category) {
      switch (category) {
        case 'battlecry':
          return Object.keys(this.battlecryHandlers);
        case 'deathrattle':
          return Object.keys(this.deathrattleHandlers);
        case 'spellEffect':
          return Object.keys(this.spellEffectHandlers);
        case 'combo':
          return Object.keys(this.comboHandlers);
      }
    }
    
    return [
      ...Object.keys(this.battlecryHandlers).map(type => `battlecry:${type}`),
      ...Object.keys(this.deathrattleHandlers).map(type => `deathrattle:${type}`),
      ...Object.keys(this.spellEffectHandlers).map(type => `spellEffect:${type}`),
      ...Object.keys(this.comboHandlers).map(type => `combo:${type}`)
    ];
  }
}

// Export default instance
export default EffectRegistry;
/**
 * Effect Handler Registration
 * 
 * This file registers all effect handlers with the EffectRegistry
 */
import { EffectRegistry } from '../EffectRegistry';
import battlecryHandlers from './battlecry';
import deathrattleHandlers from './deathrattle';
import spellEffectHandlers from './spellEffect';
import comboHandlers from './combo';

/**
 * Register all effect handlers with the EffectRegistry
 */
export function registerAllEffectHandlers() {
  // Register battlecry handlers
  Object.entries(battlecryHandlers).forEach(([type, handler]) => {
    EffectRegistry.registerBattlecryHandler(type, handler as any);
  });
  
  // Register deathrattle handlers
  Object.entries(deathrattleHandlers).forEach(([type, handler]) => {
    EffectRegistry.registerDeathrattleHandler(type, handler as any);
  });
  
  // Register spell effect handlers
  Object.entries(spellEffectHandlers).forEach(([type, handler]) => {
    EffectRegistry.registerSpellEffectHandler(type, handler as any);
  });
  
  // Register combo handlers
  Object.entries(comboHandlers).forEach(([type, handler]) => {
    EffectRegistry.registerComboHandler(type, handler as any);
  });
  
}

export default registerAllEffectHandlers;

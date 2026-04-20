/**
 * DestroyManaCrystal Battlecry Handler
 * 
 * Implements the "destroy_mana_crystal" battlecry effect.
 * Destroys mana crystal(s) from either opponent or self.
 * Example card: Felguard - destroys one of your own mana crystals
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_mana_crystal battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data (effect.value is number of crystals, effect.targetType determines whose)
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyManaCrystal(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_mana_crystal for ${sourceCard.name}`);
    
    const crystalsToDestroy = effect.value ?? 1;
    const targetType = effect.targetType || 'self';
    
    let targetPlayer: any;
    let ownerDescription: string;
    
    if (targetType === 'enemy' || targetType === 'opponent' || targetType === 'enemy_hero') {
      targetPlayer = context.opponentPlayer;
      ownerDescription = "opponent's";
    } else {
      targetPlayer = context.currentPlayer;
      ownerDescription = 'your';
    }
    
    const currentMax = targetPlayer.mana?.max ?? 10;
    const currentCurrent = targetPlayer.mana?.current ?? 0;
    
    if (currentMax <= 0) {
      context.logGameEvent(`No mana crystals to destroy`);
      return { success: true, additionalData: { crystalsDestroyed: 0 } };
    }
    
    const actualDestroyed = Math.min(crystalsToDestroy, currentMax);
    
    if (targetPlayer.mana) {
      targetPlayer.mana.max = Math.max(0, currentMax - actualDestroyed);
      targetPlayer.mana.current = Math.min(targetPlayer.mana.current, targetPlayer.mana.max);
    }
    
    context.logGameEvent(`${sourceCard.name} destroyed ${actualDestroyed} of ${ownerDescription} mana crystal(s)`);
    context.logGameEvent(`${ownerDescription.charAt(0).toUpperCase() + ownerDescription.slice(1)} max mana is now ${targetPlayer.mana?.max ?? 0}`);
    
    return { 
      success: true, 
      additionalData: { 
        crystalsDestroyed: actualDestroyed,
        targetPlayer: targetType,
        newMaxMana: targetPlayer.mana?.max ?? 0
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_mana_crystal:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_mana_crystal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * SwapHeroPower SpellEffect Handler
 * 
 * Implements the "swap_hero_power" spellEffect effect.
 * Swaps the player's hero power with the opponent's or replaces it.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeSwapHeroPower(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:swap_hero_power for ${sourceCard.name}`);
    
    const newHeroPower = effect.heropower || effect.newHeroPower;
    const usesBeforeSwapBack = effect.usesBeforeSwapBack || 0;
    const swapWithOpponent = effect.swapWithOpponent === true;
    
    const currentPlayer = context.currentPlayer as any;
    const opponentPlayer = context.opponentPlayer as any;
    
    const originalHeroPower = { ...currentPlayer.hero.heroPower };
    
    if (swapWithOpponent) {
      const opponentHeroPower = { ...opponentPlayer.hero.heroPower };
      
      currentPlayer.hero.heroPower = opponentHeroPower;
      opponentPlayer.hero.heroPower = originalHeroPower;
      
      context.logGameEvent(`Swapped hero powers with opponent`);
    } else if (newHeroPower) {
      currentPlayer.hero.originalHeroPower = originalHeroPower;
      currentPlayer.hero.heroPower = {
        id: newHeroPower.id || newHeroPower,
        name: newHeroPower.name || 'New Hero Power',
        cost: newHeroPower.cost !== undefined ? newHeroPower.cost : 2,
        effect: newHeroPower.effect || newHeroPower,
        usesRemaining: usesBeforeSwapBack > 0 ? usesBeforeSwapBack : undefined
      };
      
      context.logGameEvent(`Replaced hero power with ${currentPlayer.hero.heroPower.name}`);
    }
    
    if (usesBeforeSwapBack > 0) {
      currentPlayer.temporaryEffects = currentPlayer.temporaryEffects || [];
      currentPlayer.temporaryEffects.push({
        type: 'hero_power_swap',
        usesRemaining: usesBeforeSwapBack,
        originalHeroPower: originalHeroPower,
        source: sourceCard.name
      });
      
      context.logGameEvent(`Hero power will revert after ${usesBeforeSwapBack} uses`);
    }
    
    return { 
      success: true,
      additionalData: { 
        originalHeroPower: originalHeroPower.name,
        newHeroPower: currentPlayer.hero.heroPower.name,
        usesBeforeSwapBack
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:swap_hero_power:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:swap_hero_power: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

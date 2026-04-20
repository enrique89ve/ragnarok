/**
 * SetMana Battlecry Handler
 * 
 * Implements the "set_mana" battlecry effect.
 * Sets mana crystals to a specific value for one or both players.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a set_mana battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSetMana(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:set_mana for ${sourceCard.name}`);
    
    const value = effect.value;
    const affectBothPlayers = effect.affectBothPlayers !== false;
    const affectOpponent = effect.affectOpponent === true;
    
    if (value === undefined) {
      context.logGameEvent(`SetMana effect missing value property`);
      return { success: false, error: 'No mana value specified' };
    }
    
    const manaValue = Math.max(0, Math.min(10, value));
    
    const previousCurrentMana = context.currentPlayer.mana.max;
    const previousOpponentMana = context.opponentPlayer.mana.max;
    
    if (!affectOpponent || affectBothPlayers) {
      context.currentPlayer.mana.max = manaValue;
      context.currentPlayer.mana.current = Math.min(context.currentPlayer.mana.current, manaValue);
      context.logGameEvent(`${sourceCard.name} set your mana crystals to ${manaValue} (was ${previousCurrentMana})`);
    }
    
    if (affectOpponent || affectBothPlayers) {
      context.opponentPlayer.mana.max = manaValue;
      context.opponentPlayer.mana.current = Math.min(context.opponentPlayer.mana.current, manaValue);
      context.logGameEvent(`${sourceCard.name} set opponent's mana crystals to ${manaValue} (was ${previousOpponentMana})`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        manaValue,
        previousCurrentMana,
        previousOpponentMana
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:set_mana:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:set_mana: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

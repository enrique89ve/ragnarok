/**
 * GiveMana Battlecry Handler
 * 
 * Implements the "give_mana" battlecry effect.
 * Gives extra mana crystals for the next turn.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a give_mana battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGiveMana(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:give_mana for ${sourceCard.name}`);
    
    const value = effect.value || 1;
    const permanent = effect.permanent === true;
    const toOpponent = effect.toOpponent === true;
    
    if (value <= 0) {
      context.logGameEvent(`GiveMana effect has invalid value: ${value}`);
      return { success: false, error: 'Invalid mana value' };
    }
    
    const targetPlayer = toOpponent ? context.opponentPlayer : context.currentPlayer;
    const previousMaxMana = targetPlayer.mana.max;
    
    if (permanent) {
      targetPlayer.mana.max = Math.min(10, targetPlayer.mana.max + value);
      targetPlayer.mana.current = Math.min(targetPlayer.mana.max, targetPlayer.mana.current + value);
      context.logGameEvent(`${sourceCard.name} permanently granted ${value} mana crystal(s). New max: ${targetPlayer.mana.max}`);
    } else {
      targetPlayer.mana.current = Math.min(10, targetPlayer.mana.current + value);
      context.logGameEvent(`${sourceCard.name} gave ${value} temporary mana. Current: ${targetPlayer.mana.current}`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        value,
        permanent,
        toOpponent,
        previousMaxMana,
        newMaxMana: targetPlayer.mana.max,
        newCurrentMana: targetPlayer.mana.current
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:give_mana:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:give_mana: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

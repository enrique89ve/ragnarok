/**
 * AlterMana Battlecry Handler
 * 
 * Implements the "alter_mana" battlecry effect.
 * Increases or decreases mana crystals (permanently or temporarily).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute an alter_mana battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeAlterMana(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:alter_mana for ${sourceCard.name}`);
    
    const value = effect.value || 0;
    const temporaryEffect = effect.temporaryEffect === true;
    const affectOpponent = effect.affectOpponent === true;
    const affectEmpty = effect.affectEmpty === true;
    
    if (value === 0) {
      context.logGameEvent(`AlterMana effect has value of 0, no change needed`);
      return { success: true };
    }
    
    const targetPlayer = affectOpponent ? context.opponentPlayer : context.currentPlayer;
    const previousMaxMana = targetPlayer.mana.max;
    const previousCurrentMana = targetPlayer.mana.current;
    
    if (temporaryEffect) {
      targetPlayer.mana.current = Math.max(0, Math.min(10, targetPlayer.mana.current + value));
      context.logGameEvent(`${sourceCard.name} ${value > 0 ? 'added' : 'removed'} ${Math.abs(value)} mana temporarily. Current mana: ${targetPlayer.mana.current}`);
    } else {
      if (affectEmpty) {
        targetPlayer.mana.max = Math.max(0, Math.min(10, targetPlayer.mana.max + value));
        context.logGameEvent(`${sourceCard.name} ${value > 0 ? 'gained' : 'destroyed'} ${Math.abs(value)} empty mana crystal(s). Max mana: ${targetPlayer.mana.max}`);
      } else {
        targetPlayer.mana.max = Math.max(0, Math.min(10, targetPlayer.mana.max + value));
        if (value > 0) {
          targetPlayer.mana.current = Math.min(targetPlayer.mana.max, targetPlayer.mana.current + value);
        } else {
          targetPlayer.mana.current = Math.min(targetPlayer.mana.max, targetPlayer.mana.current);
        }
        context.logGameEvent(`${sourceCard.name} ${value > 0 ? 'gained' : 'destroyed'} ${Math.abs(value)} mana crystal(s). Mana: ${targetPlayer.mana.current}/${targetPlayer.mana.max}`);
      }
    }
    
    return { 
      success: true, 
      additionalData: { 
        value,
        temporaryEffect,
        previousMaxMana,
        previousCurrentMana,
        newMaxMana: targetPlayer.mana.max,
        newCurrentMana: targetPlayer.mana.current
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:alter_mana:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:alter_mana: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

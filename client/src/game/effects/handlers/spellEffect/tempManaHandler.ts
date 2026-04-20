/**
 * TempMana SpellEffect Handler
 * 
 * Implements the "temp_mana" spellEffect effect.
 * Grants temporary mana crystals for this turn only.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTempMana(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:temp_mana for ${sourceCard.name}`);
    
    const manaValue = effect.value || 1;
    
    const currentPlayer = context.currentPlayer as any;
    
    const currentMana = currentPlayer.currentMana || currentPlayer.mana?.current || 0;
    const newMana = Math.min(currentMana + manaValue, 10);
    const actualGain = newMana - currentMana;
    
    currentPlayer.currentMana = newMana;
    if (currentPlayer.mana) {
      currentPlayer.mana.current = newMana;
    }
    currentPlayer.temporaryMana = (currentPlayer.temporaryMana || 0) + actualGain;
    
    context.logGameEvent(`Gained ${actualGain} temporary mana crystal(s) (total: ${newMana})`);
    
    return { 
      success: true,
      additionalData: { 
        manaGained: actualGain,
        totalMana: newMana
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:temp_mana:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:temp_mana: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

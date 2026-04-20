/**
 * GainMana SpellEffect Handler
 * 
 * Implements the "gain_mana" spellEffect effect.
 * Grants mana crystals (permanent or temporary).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeGainMana(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:gain_mana for ${sourceCard.name}`);
    
    const manaValue = effect.value || 1;
    const isTemporary = effect.isTemporaryMana !== false;
    const isPermanent = effect.isPermanent === true;
    
    const currentPlayer = context.currentPlayer;
    
    if (isPermanent) {
      const maxManaLimit = 10;
      const newMaxMana = Math.min((currentPlayer.mana.max || 0) + manaValue, maxManaLimit);
      const manaGained = newMaxMana - (currentPlayer.mana.max || 0);
      
      currentPlayer.mana.max = newMaxMana;
      currentPlayer.mana.current = Math.min((currentPlayer.mana.current || 0) + manaGained, newMaxMana);
      
      context.logGameEvent(`Gained ${manaGained} permanent mana crystal(s)`);
      
      return { 
        success: true,
        additionalData: { manaGained, isTemporary: false }
      };
    } else {
      const newCurrentMana = Math.min((currentPlayer.mana.current || 0) + manaValue, 10);
      const manaGained = newCurrentMana - (currentPlayer.mana.current || 0);
      
      currentPlayer.mana.current = newCurrentMana;
      
      if (isTemporary) {
        const playerWithTempMana = currentPlayer as any;
        playerWithTempMana.temporaryMana = (playerWithTempMana.temporaryMana || 0) + manaGained;
      }
      
      context.logGameEvent(`Gained ${manaGained} ${isTemporary ? 'temporary' : ''} mana`);
      
      return { 
        success: true,
        additionalData: { manaGained, isTemporary }
      };
    }
  } catch (error) {
    debug.error(`Error executing spellEffect:gain_mana:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:gain_mana: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

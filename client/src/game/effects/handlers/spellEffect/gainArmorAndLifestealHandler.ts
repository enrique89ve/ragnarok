/**
 * GainArmorAndLifesteal SpellEffect Handler
 * 
 * Implements the "gain_armor_and_lifesteal" spellEffect effect.
 * Grants armor and gives lifesteal to the hero for a duration.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeGainArmorAndLifesteal(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:gain_armor_and_lifesteal for ${sourceCard.name}`);
    
    const armorValue = effect.value || effect.armorValue || 5;
    const duration = effect.duration || 1;
    
    const currentPlayer = context.currentPlayer;
    
    currentPlayer.armor = (currentPlayer.armor || 0) + armorValue;
    context.logGameEvent(`Gained ${armorValue} armor`);
    
    (currentPlayer.hero as any).hasLifesteal = true;
    (currentPlayer.hero as any).lifestealDuration = duration;
    context.logGameEvent(`Hero gained Lifesteal for ${duration} turn(s)`);
    
    const playerWithEffects = currentPlayer as any;
    playerWithEffects.temporaryEffects = playerWithEffects.temporaryEffects || [];
    playerWithEffects.temporaryEffects.push({
      type: 'lifesteal',
      duration: duration,
      source: sourceCard.name
    });
    
    return { 
      success: true,
      additionalData: { armorGained: armorValue, lifestealDuration: duration }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:gain_armor_and_lifesteal:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:gain_armor_and_lifesteal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

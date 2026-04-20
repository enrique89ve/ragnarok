/**
 * NextSpellCostsHealth SpellEffect Handler
 * 
 * Implements the "next_spell_costs_health" spellEffect effect.
 * The next spell costs health instead of mana.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeNextSpellCostsHealth(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:next_spell_costs_health for ${sourceCard.name}`);
    
    const duration = effect.duration || 1;
    const spellCount = effect.spellCount || 1;
    
    const currentPlayer = context.currentPlayer as any;
    
    currentPlayer.nextSpellCostsHealth = true;
    currentPlayer.nextSpellCostsHealthCount = spellCount;
    
    currentPlayer.temporaryEffects = currentPlayer.temporaryEffects || [];
    currentPlayer.temporaryEffects.push({
      type: 'next_spell_costs_health',
      duration: duration,
      spellCount: spellCount,
      source: sourceCard.name
    });
    
    context.logGameEvent(`Next ${spellCount} spell(s) will cost Health instead of Mana`);
    
    return { 
      success: true,
      additionalData: { spellCount }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:next_spell_costs_health:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:next_spell_costs_health: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

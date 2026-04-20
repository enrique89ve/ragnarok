/**
 * ManaReduction SpellEffect Handler
 * 
 * Implements the "mana_reduction" spellEffect effect.
 * Reduces the mana cost of cards in hand or the next spell.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeManaReduction(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:mana_reduction for ${sourceCard.name}`);
    
    const reductionValue = effect.value || 3;
    const isTemporary = effect.temporaryEffect === true;
    const targetCardType = effect.targetCardType || 'spell';
    const applyToNextOnly = effect.applyToNextOnly !== false;
    
    const currentPlayer = context.currentPlayer as any;
    let cardsReduced = 0;
    
    if (applyToNextOnly) {
      currentPlayer.nextSpellCostReduction = (currentPlayer.nextSpellCostReduction || 0) + reductionValue;
      context.logGameEvent(`Next ${targetCardType} costs ${reductionValue} less`);
      
      currentPlayer.temporaryEffects = currentPlayer.temporaryEffects || [];
      currentPlayer.temporaryEffects.push({
        type: 'mana_reduction',
        value: reductionValue,
        targetCardType: targetCardType,
        isTemporary: isTemporary,
        source: sourceCard.name
      });
      
      cardsReduced = 1;
    } else {
      currentPlayer.hand.forEach((cardInstance: any) => {
        const card = cardInstance.card;
        const matchesType = targetCardType === 'all' || card.type === targetCardType;
        
        if (matchesType && card.manaCost !== undefined && card.manaCost > 0) {
          const reduction = Math.min(reductionValue, card.manaCost);
          card.manaCost -= reduction;
          cardInstance.costModifier = (cardInstance.costModifier || 0) - reduction;
          cardsReduced++;
          context.logGameEvent(`Reduced cost of ${card.name} by ${reduction}`);
        }
      });
    }
    
    return { 
      success: true,
      additionalData: { cardsReduced, reductionValue }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:mana_reduction:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:mana_reduction: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

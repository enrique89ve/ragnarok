/**
 * Gain Armor Reduce Cost Effect Handler
 * 
 * Implements the "gain_armor_reduce_cost" spellEffect effect.
 * Gains armor and reduces cost of cards based on certain conditions.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeGainArmorReduceCost(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:gain_armor_reduce_cost for ${sourceCard.name}`);
    
    const armorValue = effect.value || 5;
    const costReduction = effect.costReduction || 1;
    const targetCardType = effect.targetCardType || 'all';
    
    const currentPlayer = context.currentPlayer as any;
    
    currentPlayer.hero.armor = (currentPlayer.hero.armor || 0) + armorValue;
    context.logGameEvent(`Gained ${armorValue} armor`);
    
    let cardsReduced = 0;
    currentPlayer.hand.forEach((cardInstance: any) => {
      const card = cardInstance.card;
      const matchesType = targetCardType === 'all' || card.type === targetCardType;
      
      if (matchesType && card.manaCost !== undefined && card.manaCost > 0) {
        const reduction = Math.min(costReduction, card.manaCost);
        card.manaCost -= reduction;
        cardInstance.costModifier = (cardInstance.costModifier || 0) - reduction;
        cardsReduced++;
        context.logGameEvent(`Reduced cost of ${card.name} by ${reduction}`);
      }
    });
    
    return { 
      success: true,
      additionalData: { armorGained: armorValue, cardsReduced }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:gain_armor_reduce_cost:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:gain_armor_reduce_cost: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

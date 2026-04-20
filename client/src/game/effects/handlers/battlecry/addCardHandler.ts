/**
 * AddCard Battlecry Handler
 * 
 * Adds a specific card to the player's hand by cardId.
 * Example card: Face Collector (ID: 20807)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeAddCard(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing add_card battlecry for ${sourceCard.name}`);
    
    const cardId = effect.cardId || effect.value;
    const cardCount = effect.cardCount || effect.count || 1;
    const costReduction = effect.costReduction || 0;
    
    if (!cardId) {
      return { success: false, error: 'No cardId specified for add_card effect' };
    }
    
    const addedCards: CardInstance[] = [];
    
    for (let i = 0; i < cardCount; i++) {
      if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
        context.logGameEvent(`Hand is full, cannot add more cards.`);
        break;
      }
      
      const baseCost = effect.manaCost ?? 0;
      const finalCost = Math.max(0, baseCost - costReduction);
      
      const newCardInstance: CardInstance = {
        instanceId: `added-${cardId}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        card: {
          id: typeof cardId === 'number' ? cardId : parseInt(cardId, 10),
          name: effect.cardName || `Card ${cardId}`,
          description: effect.cardDescription || '',
          manaCost: finalCost,
          type: effect.cardType || 'minion',
          rarity: effect.rarity || 'common',
          heroClass: effect.heroClass || 'neutral',
          attack: effect.attack,
          health: effect.health
        } as Card,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      context.currentPlayer.hand.push(newCardInstance);
      addedCards.push(newCardInstance);
      context.logGameEvent(`Added ${newCardInstance.card.name} to hand.`);
    }
    
    return { 
      success: true, 
      additionalData: { addedCards, count: addedCards.length }
    };
  } catch (error) {
    debug.error('Error executing add_card:', error);
    return { success: false, error: `Failed to execute add_card: ${error}` };
  }
}

/**
 * AddCard Deathrattle Handler
 * 
 * Implements the "add_card" deathrattle effect.
 * Adds a specific card to the player's hand when the minion dies.
 * Example card: Rhonin (adds 3 Arcane Missiles to hand)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { CardData, CardInstance, DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execute an add_card deathrattle effect
 */
export default function executeAddCardAddCard(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: CardData | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:add_card for ${cardName}`);
    
    const cardId = effect.cardId || effect.summonCardId;
    const count = effect.value || effect.count || 1;
    
    if (!cardId) {
      return { success: false, error: 'No cardId specified for add_card effect' };
    }
    
    const cardToAdd = getCardById(Number(cardId));
    if (!cardToAdd) {
      return { success: false, error: `Card with ID ${cardId} not found` };
    }
    
    const addedCards: CardInstance[] = [];
    
    for (let i = 0; i < count; i++) {
      if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
        context.logGameEvent(`Hand is full, cannot add more cards`);
        break;
      }
      
      const newCardInstance: CardInstance = {
        instanceId: uuidv4(),
        card: cardToAdd,
        currentHealth: 'health' in cardToAdd ? (cardToAdd.health ?? 0) : 0,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      context.currentPlayer.hand.push(newCardInstance as any);
      addedCards.push(newCardInstance);
      context.logGameEvent(`Added ${cardToAdd.name} to hand from ${cardName}'s deathrattle`);
    }
    
    return {
      success: true,
      additionalData: { addedCards }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:add_card:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:add_card: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

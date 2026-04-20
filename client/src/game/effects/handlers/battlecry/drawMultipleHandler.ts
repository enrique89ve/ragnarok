/**
 * DrawMultiple Battlecry Handler
 * 
 * Implements the "draw_multiple" battlecry effect.
 * Draws multiple cards from the deck.
 * Example card: Countess Ashmore (ID: 20805)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';


/**
 * Execute a draw_multiple battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data containing count property
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDrawMultiple(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    const count = effect.count || effect.value || 1;
    context.logGameEvent(`${sourceCard.name} battlecry: Draw ${count} card(s)`);
    
    const drawnCards: Card[] = [];
    const burnedCards: Card[] = [];
    
    for (let i = 0; i < count; i++) {
      if (context.currentPlayer.deck.length === 0) {
        context.logGameEvent(`Deck is empty - no more cards to draw`);
        break;
      }
      
      const cardInstance = context.currentPlayer.deck.shift();
      if (!cardInstance) continue;
      
      if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
        context.currentPlayer.hand.push(cardInstance);
        drawnCards.push(cardInstance.card);
        context.logGameEvent(`Drew ${cardInstance.card.name}`);
      } else {
        burnedCards.push(cardInstance.card);
        context.logGameEvent(`Hand is full! ${cardInstance.card.name} was burned`);
      }
    }
    
    context.currentPlayer.cardsDrawnThisTurn += drawnCards.length;
    
    return {
      success: true,
      additionalData: {
        drawnCards,
        burnedCards,
        totalDrawn: drawnCards.length,
        totalBurned: burnedCards.length
      }
    };
  } catch (error) {
    debug.error(`Error executing draw_multiple:`, error);
    return {
      success: false,
      error: `Error executing draw_multiple: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

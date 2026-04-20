/**
 * Draw Deathrattle Handler
 * 
 * Implements the "draw" deathrattle effect.
 * Draws cards when the minion dies.
 * Example: Loot Hoarder (draw 1 card)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a draw deathrattle effect
 */
export default function executeDrawDraw(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:draw for ${cardName}`);
    
    const drawCount = effect.value || effect.count || 1;
    const cardType = effect.cardType;
    const specificRace = effect.specificRace;
    
    let drawnCards: CardInstance[] = [];
    
    if (cardType || specificRace) {
      for (let i = 0; i < drawCount; i++) {
        const validCardIndex = context.currentPlayer.deck.findIndex(card => {
          if (cardType && card.card.type !== cardType) return false;
          if (specificRace && card.card.race !== specificRace) return false;
          return true;
        });
        
        if (validCardIndex !== -1) {
          const [drawnCard] = context.currentPlayer.deck.splice(validCardIndex, 1);
          if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
            context.currentPlayer.hand.push(drawnCard);
            drawnCards.push(drawnCard);
            context.logGameEvent(`Drew ${drawnCard.card.name} from ${cardName}'s deathrattle`);
          } else {
            context.logGameEvent(`Hand is full, ${drawnCard.card.name} was burned`);
          }
        } else {
          context.logGameEvent(`No matching card found in deck for ${cardName}'s deathrattle`);
        }
      }
    } else {
      drawnCards = context.drawCards(drawCount);
    }
    
    return {
      success: true,
      additionalData: { drawnCards, count: drawnCards.length }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:draw:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:draw: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

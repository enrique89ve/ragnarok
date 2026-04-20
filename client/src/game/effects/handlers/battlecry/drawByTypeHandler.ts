/**
 * DrawByType Battlecry Handler
 * 
 * Implements the "draw_by_type" battlecry effect.
 * Draws cards matching a specific type (minion/spell/weapon) or race.
 * Example card: The Curator (ID: 20121) - Draw a Beast, Dragon, and Murloc
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';
import { hasKeyword } from '../../../utils/cards/keywordUtils';


/**
 * Execute a draw_by_type battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data containing cardType or drawTypes property
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDrawByType(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    const cardType = effect.cardType;
    const drawTypes = effect.drawTypes || (cardType ? [cardType] : []);
    const count = effect.count || 1;
    
    context.logGameEvent(`${sourceCard.name} battlecry: Draw card(s) by type`);
    
    const drawnCards: Card[] = [];
    const burnedCards: Card[] = [];
    
    for (const typeOrRace of drawTypes) {
      let found = false;
      
      for (let i = 0; i < context.currentPlayer.deck.length; i++) {
        const cardInstance = context.currentPlayer.deck[i];
        const card = cardInstance.card;
        
        const matchesType = card.type === typeOrRace;
        const matchesRace = (card.race || '').toLowerCase() === typeOrRace.toLowerCase();
        const matchesKeyword = hasKeyword(cardInstance, typeOrRace);
        
        if (matchesType || matchesRace || matchesKeyword) {
          context.currentPlayer.deck.splice(i, 1);
          
          if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
            context.currentPlayer.hand.push(cardInstance);
            drawnCards.push(card);
            context.logGameEvent(`Drew ${card.name} (${typeOrRace})`);
          } else {
            burnedCards.push(card);
            context.logGameEvent(`Hand is full! ${card.name} was burned`);
          }
          found = true;
          break;
        }
      }
      
      if (!found) {
        context.logGameEvent(`No ${typeOrRace} card found in deck`);
      }
    }
    
    if (drawTypes.length === 0 && cardType) {
      let cardsDrawn = 0;
      for (let i = 0; i < context.currentPlayer.deck.length && cardsDrawn < count; i++) {
        const cardInstance = context.currentPlayer.deck[i];
        if (cardInstance.card.type === cardType) {
          context.currentPlayer.deck.splice(i, 1);
          i--;
          
          if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
            context.currentPlayer.hand.push(cardInstance);
            drawnCards.push(cardInstance.card);
            context.logGameEvent(`Drew ${cardInstance.card.name}`);
          } else {
            burnedCards.push(cardInstance.card);
            context.logGameEvent(`Hand is full! ${cardInstance.card.name} was burned`);
          }
          cardsDrawn++;
        }
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
    debug.error(`Error executing draw_by_type:`, error);
    return {
      success: false,
      error: `Error executing draw_by_type: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

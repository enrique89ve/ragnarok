/**
 * DrawUntil Battlecry Handler
 * 
 * Implements the "draw_until" battlecry effect.
 * Draws cards until a condition is met.
 * Example card: Wrathion (ID: 20302) - Draw cards until you draw a non-Dragon
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

const MAX_DRAW_LIMIT = 20;

/**
 * Execute a draw_until battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data containing stopCondition property
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDrawUntil(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    const stopCondition = effect.stopCondition || effect.condition;
    const targetCost = effect.targetCost || effect.untilCardCost;
    const targetRace = effect.targetRace || effect.race;
    const targetType = effect.targetType || effect.cardType;
    const handSize = effect.handSize || MAX_HAND_SIZE;
    
    context.logGameEvent(`${sourceCard.name} battlecry: Draw until condition met`);
    
    const drawnCards: Card[] = [];
    const burnedCards: Card[] = [];
    let drawCount = 0;
    let conditionMet = false;
    
    while (!conditionMet && drawCount < MAX_DRAW_LIMIT) {
      if (context.currentPlayer.deck.length === 0) {
        context.logGameEvent(`Deck is empty - stopping draw`);
        break;
      }
      
      if (stopCondition === 'until_hand_full' && context.currentPlayer.hand.length >= handSize) {
        context.logGameEvent(`Hand is full - stopping draw`);
        conditionMet = true;
        break;
      }
      
      const cardInstance = context.currentPlayer.deck.shift();
      if (!cardInstance) break;
      
      drawCount++;
      
      if (context.currentPlayer.hand.length < handSize) {
        context.currentPlayer.hand.push(cardInstance);
        drawnCards.push(cardInstance.card);
        context.logGameEvent(`Drew ${cardInstance.card.name}`);
      } else {
        burnedCards.push(cardInstance.card);
        context.logGameEvent(`Hand is full! ${cardInstance.card.name} was burned`);
      }
      
      switch (stopCondition) {
        case 'until_card_cost':
          if (cardInstance.card.manaCost === targetCost) {
            context.logGameEvent(`Drew a ${targetCost}-cost card - stopping`);
            conditionMet = true;
          }
          break;
          
        case 'until_non_race':
        case 'until_not_race':
          if (cardInstance.card.race !== targetRace) {
            context.logGameEvent(`Drew a non-${targetRace} card - stopping`);
            conditionMet = true;
          }
          break;
          
        case 'until_race':
          if ((cardInstance.card.race || '').toLowerCase() === (targetRace || '').toLowerCase()) {
            context.logGameEvent(`Drew a ${targetRace} - stopping`);
            conditionMet = true;
          }
          break;
          
        case 'until_type':
          if (cardInstance.card.type === targetType) {
            context.logGameEvent(`Drew a ${targetType} - stopping`);
            conditionMet = true;
          }
          break;
          
        case 'until_non_type':
          if (cardInstance.card.type !== targetType) {
            context.logGameEvent(`Drew a non-${targetType} - stopping`);
            conditionMet = true;
          }
          break;
          
        case 'until_minion':
          if (cardInstance.card.type === 'minion') {
            context.logGameEvent(`Drew a minion - stopping`);
            conditionMet = true;
          }
          break;
          
        case 'until_spell':
          if (cardInstance.card.type === 'spell') {
            context.logGameEvent(`Drew a spell - stopping`);
            conditionMet = true;
          }
          break;
          
        default:
          conditionMet = true;
          break;
      }
    }
    
    context.currentPlayer.cardsDrawnThisTurn += drawnCards.length;
    
    return {
      success: true,
      additionalData: {
        drawnCards,
        burnedCards,
        totalDrawn: drawnCards.length,
        totalBurned: burnedCards.length,
        conditionMet
      }
    };
  } catch (error) {
    debug.error(`Error executing draw_until:`, error);
    return {
      success: false,
      error: `Error executing draw_until: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

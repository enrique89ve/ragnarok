/**
 * DrawSpecific Battlecry Handler
 * 
 * Implements the "draw_specific" battlecry effect.
 * Draws a specific card by ID or matching criteria.
 * Example card: Kronx Dragonhoof (ID: 20310) - Draw Galakrond if in deck
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';


/**
 * Execute a draw_specific battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data containing cardId or cardName property
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDrawSpecific(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    const cardId = effect.cardId;
    const cardName = effect.cardName;
    const manaCost = effect.manaCost;
    const highestCost = effect.highestCost;
    const lowestCost = effect.lowestCost;
    
    context.logGameEvent(`${sourceCard.name} battlecry: Draw specific card`);
    
    let foundIndex = -1;
    let foundCard: CardInstance | null = null;
    
    if (cardId !== undefined) {
      foundIndex = context.currentPlayer.deck.findIndex(
        ci => ci.card.id === cardId || String(ci.card.id) === String(cardId)
      );
    } else if (cardName) {
      foundIndex = context.currentPlayer.deck.findIndex(
        ci => ci.card.name.toLowerCase() === cardName.toLowerCase() ||
              ci.card.name.toLowerCase().includes(cardName.toLowerCase())
      );
    } else if (highestCost) {
      let highestManaCost = -1;
      context.currentPlayer.deck.forEach((ci, idx) => {
        if (ci.card.manaCost > highestManaCost) {
          highestManaCost = ci.card.manaCost;
          foundIndex = idx;
        }
      });
    } else if (lowestCost) {
      let lowestManaCost = Infinity;
      context.currentPlayer.deck.forEach((ci, idx) => {
        if (ci.card.manaCost < lowestManaCost) {
          lowestManaCost = ci.card.manaCost;
          foundIndex = idx;
        }
      });
    } else if (manaCost !== undefined) {
      foundIndex = context.currentPlayer.deck.findIndex(
        ci => ci.card.manaCost === manaCost
      );
    }
    
    if (foundIndex !== -1) {
      foundCard = context.currentPlayer.deck[foundIndex];
      context.currentPlayer.deck.splice(foundIndex, 1);
      
      if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
        context.currentPlayer.hand.push(foundCard);
        context.logGameEvent(`Drew ${foundCard.card.name}`);
        context.currentPlayer.cardsDrawnThisTurn++;
        
        return {
          success: true,
          additionalData: {
            drawnCard: foundCard.card,
            foundInDeck: true
          }
        };
      } else {
        context.logGameEvent(`Hand is full! ${foundCard.card.name} was burned`);
        return {
          success: true,
          additionalData: {
            burnedCard: foundCard.card,
            foundInDeck: true,
            handFull: true
          }
        };
      }
    }
    
    context.logGameEvent(`Specific card not found in deck`);
    
    if (effect.alternateEffect) {
      context.logGameEvent(`Triggering alternate effect`);
      return {
        success: true,
        additionalData: {
          foundInDeck: false,
          triggerAlternate: true,
          alternateEffect: effect.alternateEffect
        }
      };
    }
    
    return {
      success: true,
      additionalData: {
        foundInDeck: false
      }
    };
  } catch (error) {
    debug.error(`Error executing draw_specific:`, error);
    return {
      success: false,
      error: `Error executing draw_specific: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

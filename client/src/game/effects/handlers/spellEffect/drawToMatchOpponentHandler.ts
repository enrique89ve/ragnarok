/**
 * DrawToMatchOpponent SpellEffect Handler
 * 
 * Implements the "draw_to_match_opponent" spellEffect effect.
 * Draws cards until the player's hand size matches the opponent's.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeDrawToMatchOpponent(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:draw_to_match_opponent for ${sourceCard.name}`);
    
    const currentPlayer = context.currentPlayer;
    const opponentPlayer = context.opponentPlayer;
    
    const currentHandSize = currentPlayer.hand.length;
    const opponentHandSize = opponentPlayer.hand.length;
    
    if (currentHandSize >= opponentHandSize) {
      context.logGameEvent(`Player's hand size (${currentHandSize}) already matches or exceeds opponent's (${opponentHandSize})`);
      return { 
        success: true,
        additionalData: { cardsDrawn: 0 }
      };
    }
    
    const cardsToDraw = opponentHandSize - currentHandSize;
    let cardsDrawn = 0;
    
    for (let i = 0; i < cardsToDraw; i++) {
      if (currentPlayer.deck.length === 0) {
        context.logGameEvent(`Deck is empty, cannot draw more cards`);
        break;
      }
      
      if (currentPlayer.hand.length >= MAX_HAND_SIZE) {
        context.logGameEvent(`Hand is full, cannot draw more cards`);
        break;
      }
      
      context.drawCards(1);
      cardsDrawn++;
    }
    
    context.logGameEvent(`Drew ${cardsDrawn} cards to match opponent's hand size`);
    
    return { 
      success: true,
      additionalData: { cardsDrawn }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:draw_to_match_opponent:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:draw_to_match_opponent: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

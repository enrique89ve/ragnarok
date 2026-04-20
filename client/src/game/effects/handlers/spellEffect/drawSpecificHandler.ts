/**
 * Draw Specific Effect Handler
 * 
 * This handler implements the spellEffect:draw_specific effect.
 * Draws a specific type of card from the deck.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

export default function executeDrawSpecific(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:draw_specific for ${sourceCard.name}`);
    
    const drawCount = effect.value || 1;
    const cardType = effect.cardType;
    const race = effect.race;
    const minManaCost = effect.minManaCost;
    const maxManaCost = effect.maxManaCost;
    const keyword = effect.keyword;
    
    let eligibleCards = [...context.currentPlayer.deck];
    
    if (cardType) {
      eligibleCards = eligibleCards.filter(c => c.card.type === cardType);
    }
    
    if (race) {
      eligibleCards = eligibleCards.filter(c => (c.card.race || '').toLowerCase() === race.toLowerCase());
    }
    
    if (minManaCost !== undefined) {
      eligibleCards = eligibleCards.filter(c => c.card.manaCost >= minManaCost);
    }
    
    if (maxManaCost !== undefined) {
      eligibleCards = eligibleCards.filter(c => c.card.manaCost <= maxManaCost);
    }
    
    if (keyword) {
      eligibleCards = eligibleCards.filter(c => hasKeyword(c, keyword));
    }
    
    if (eligibleCards.length === 0) {
      context.logGameEvent(`No matching cards in deck to draw`);
      return { 
        success: true,
        additionalData: { cardsDrawn: 0 }
      };
    }
    
    const drawnCards: string[] = [];
    const actualDrawCount = Math.min(drawCount, eligibleCards.length);
    
    for (let i = 0; i < actualDrawCount; i++) {
      if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
        context.logGameEvent(`Hand is full, can't draw more cards`);
        break;
      }
      
      const randomIndex = Math.floor(Math.random() * eligibleCards.length);
      const cardToDraw = eligibleCards.splice(randomIndex, 1)[0];
      
      const deckIndex = context.currentPlayer.deck.indexOf(cardToDraw);
      if (deckIndex !== -1) {
        context.currentPlayer.deck.splice(deckIndex, 1);
        context.currentPlayer.hand.push(cardToDraw);
        drawnCards.push(cardToDraw.card.name);
        context.logGameEvent(`Drew ${cardToDraw.card.name}`);
      }
    }
    
    return { 
      success: true,
      additionalData: {
        cardsDrawn: drawnCards.length,
        cardNames: drawnCards,
        filterCriteria: {
          cardType,
          race,
          minManaCost,
          maxManaCost,
          keyword
        }
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:draw_specific:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:draw_specific: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

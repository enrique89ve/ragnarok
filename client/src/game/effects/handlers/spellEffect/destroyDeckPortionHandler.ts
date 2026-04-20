/**
 * Destroy Deck Portion Effect Handler
 * 
 * This handler implements the spellEffect:destroy_deck_portion effect.
 * Destroys a number of cards from the target player's deck.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDestroyDeckPortion(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:destroy_deck_portion for ${sourceCard.name}`);
    
    const cardsToDestroy = effect.value || 1;
    const randomSelection = effect.randomSelection !== false;
    const targetOpponent = effect.targetOpponent !== false;
    
    const targetPlayer = targetOpponent ? context.opponentPlayer : context.currentPlayer;
    const deck = targetPlayer.deck;
    
    if (deck.length === 0) {
      context.logGameEvent(`Target deck is empty, no cards to destroy`);
      return { 
        success: true,
        additionalData: { cardsDestroyed: 0 }
      };
    }
    
    const actualCardsToDestroy = Math.min(cardsToDestroy, deck.length);
    const destroyedCards: string[] = [];
    
    if (randomSelection) {
      for (let i = 0; i < actualCardsToDestroy; i++) {
        const randomIndex = Math.floor(Math.random() * deck.length);
        const destroyed = deck.splice(randomIndex, 1)[0];
        destroyedCards.push(destroyed.card.name);
      }
    } else {
      for (let i = 0; i < actualCardsToDestroy; i++) {
        const destroyed = deck.shift();
        if (destroyed) {
          destroyedCards.push(destroyed.card.name);
        }
      }
    }
    
    context.logGameEvent(`Destroyed ${destroyedCards.length} cards from ${targetOpponent ? "opponent's" : "your"} deck: ${destroyedCards.join(', ')}`);
    
    return { 
      success: true,
      additionalData: {
        cardsDestroyed: destroyedCards.length,
        cardNames: destroyedCards
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:destroy_deck_portion:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:destroy_deck_portion: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

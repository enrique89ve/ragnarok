/**
 * DiscoverFromDeck SpellEffect Handler
 * 
 * Implements the "discover_from_deck" spellEffect effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export function executeDiscoverFromDeckDiscoverFromDeck(
  context: GameContext,
  effect: SpellEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:discover_from_deck for ${sourceCard.name}`);

    const deck = context.currentPlayer.deck;
    const discoverCount = effect.count || 3;

    if (deck.length === 0) {
      context.logGameEvent(`Deck is empty, cannot discover`);
      return { success: false, error: 'Deck is empty' };
    }

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const choices = deck.splice(0, Math.min(discoverCount, deck.length));

    if (choices.length === 0) {
      context.logGameEvent(`No cards available to discover`);
      return { success: false, error: 'No cards available to discover' };
    }

    const chosen = choices[0];
    if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
      for (const c of choices) deck.push(c);
      return { success: false, error: 'Hand is full' };
    }
    context.currentPlayer.hand.push(chosen);
    context.logGameEvent(`Foresaw ${chosen.card.name} and added to hand`);

    for (let i = 1; i < choices.length; i++) {
      deck.push(choices[i]);
    }

    return { 
      success: true, 
      additionalData: { 
        discovered: chosen.card.name,
        choices: choices.map(c => c.card.name) 
      } 
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:discover_from_deck:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:discover_from_deck: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default executeDiscoverFromDeckDiscoverFromDeck;

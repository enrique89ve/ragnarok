/**
 * ReorderDeck Battlecry Handler
 * 
 * Reorders cards in the deck based on mana cost.
 * Example card: Lorekeeper Polkelt (ID: 20311)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeReorderDeck(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing reorder_deck battlecry for ${sourceCard.name}`);
    
    const orderBy = effect.orderBy || 'manaCost';
    const direction = effect.direction || 'descending';
    
    if (context.currentPlayer.deck.length === 0) {
      context.logGameEvent('Deck is empty, nothing to reorder.');
      return { success: true, additionalData: { deckSize: 0 } };
    }
    
    const originalOrder = context.currentPlayer.deck.map(c => c.card.name).join(', ');
    
    context.currentPlayer.deck.sort((a, b) => {
      let valueA: number;
      let valueB: number;
      
      switch (orderBy) {
        case 'manaCost':
          valueA = a.card.manaCost || 0;
          valueB = b.card.manaCost || 0;
          break;
        case 'attack':
          valueA = a.card.attack || 0;
          valueB = b.card.attack || 0;
          break;
        case 'health':
          valueA = a.card.health || 0;
          valueB = b.card.health || 0;
          break;
        case 'name':
          return direction === 'ascending' 
            ? a.card.name.localeCompare(b.card.name)
            : b.card.name.localeCompare(a.card.name);
        default:
          valueA = a.card.manaCost || 0;
          valueB = b.card.manaCost || 0;
      }
      
      return direction === 'ascending' ? valueA - valueB : valueB - valueA;
    });
    
    const newOrder = context.currentPlayer.deck.map(c => c.card.name).join(', ');
    
    context.logGameEvent(`Reordered deck by ${orderBy} (${direction}). Next draw will be highest cost card.`);
    
    return { 
      success: true, 
      additionalData: { 
        deckSize: context.currentPlayer.deck.length,
        orderBy,
        direction,
        topCard: context.currentPlayer.deck[0]?.card.name
      }
    };
  } catch (error) {
    debug.error('Error executing reorder_deck:', error);
    return { success: false, error: `Failed to execute reorder_deck: ${error}` };
  }
}

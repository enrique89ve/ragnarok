/**
 * SwapWithDeck Battlecry Handler
 * 
 * Implements the "swap_with_deck" battlecry effect.
 * Swaps a minion on the board with a random minion from your deck.
 * Example card: Madam Goya (ID: 20215)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeSwapWithDeck(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: CardInstance = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };

  try {
    context.logGameEvent(`Executing battlecry:swap_with_deck for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const potentialTargets = context.getTargets(targetType, sourceCardInstance)
      .filter(m => m.card.type === 'minion');
    
    if (potentialTargets.length === 0) {
      context.logGameEvent(`No valid minion targets for swap_with_deck`);
      return { success: false, error: 'No valid targets' };
    }
    
    const minionsInDeck = context.currentPlayer.deck.filter(c => c.card.type === 'minion');
    
    if (minionsInDeck.length === 0) {
      context.logGameEvent(`No minions in deck to swap with`);
      return { success: false, error: 'No minions in deck' };
    }
    
    const targetMinion = potentialTargets[0];
    
    const randomDeckIndex = Math.floor(Math.random() * minionsInDeck.length);
    const minionFromDeck = minionsInDeck[randomDeckIndex];
    
    const deckIndex = context.currentPlayer.deck.findIndex(c => c.instanceId === minionFromDeck.instanceId);
    if (deckIndex !== -1) {
      context.currentPlayer.deck.splice(deckIndex, 1);
    }
    
    const boardIndex = context.currentPlayer.board.findIndex(m => m.instanceId === targetMinion.instanceId);
    if (boardIndex !== -1) {
      context.currentPlayer.board.splice(boardIndex, 1);
      
      const returnedCard: CardInstance = {
        ...targetMinion,
        currentAttack: targetMinion.card.attack,
        currentHealth: targetMinion.card.health,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      context.currentPlayer.deck.push(returnedCard);
      
      const summonedMinion: CardInstance = {
        ...minionFromDeck,
        currentAttack: minionFromDeck.card.attack,
        currentHealth: minionFromDeck.card.health,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      context.currentPlayer.board.splice(boardIndex, 0, summonedMinion);
      
      for (let i = context.currentPlayer.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [context.currentPlayer.deck[i], context.currentPlayer.deck[j]] = 
          [context.currentPlayer.deck[j], context.currentPlayer.deck[i]];
      }
      
      context.logGameEvent(`${sourceCard.name} swapped ${targetMinion.card.name} with ${minionFromDeck.card.name} from deck`);
      
      return { 
        success: true, 
        additionalData: { 
          returnedToDeck: targetMinion.card.name,
          summonedFromDeck: minionFromDeck.card.name
        } 
      };
    }
    
    return { success: false, error: 'Failed to find target on board' };
  } catch (error) {
    debug.error(`Error executing battlecry:swap_with_deck:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:swap_with_deck: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

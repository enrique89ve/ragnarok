/**
 * TransformCopyFromDeck Battlecry Handler
 * 
 * Transforms the source minion into a copy of a minion from the deck.
 * Example card: Muckmorpher (ID: 30042)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransformCopyFromDeck(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing transform_copy_from_deck battlecry for ${sourceCard.name}`);
    
    const setHealth = effect.value || effect.setHealth;
    const setAttack = effect.setAttack;
    const cardType = effect.cardType || 'minion';
    
    const minionsInDeck = context.currentPlayer.deck.filter(
      card => card.card.type === cardType
    );
    
    if (minionsInDeck.length === 0) {
      context.logGameEvent('No minions in deck to copy from');
      return { success: false, error: 'No minions in deck' };
    }
    
    const randomMinion = minionsInDeck[Math.floor(Math.random() * minionsInDeck.length)];
    
    const sourceOnBoard = context.currentPlayer.board.find(
      m => m.card.id === sourceCard.id
    );
    
    if (!sourceOnBoard) {
      return { success: false, error: 'Source minion not found on board' };
    }
    
    const boardIndex = context.currentPlayer.board.indexOf(sourceOnBoard);
    
    const transformedMinion: CardInstance = {
      instanceId: `deck-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: { ...randomMinion.card },
      currentHealth: setHealth ?? (randomMinion.card.health || 1),
      currentAttack: setAttack ?? (randomMinion.card.attack || 1),
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    context.currentPlayer.board[boardIndex] = transformedMinion;
    
    context.logGameEvent(`${sourceCard.name} transformed into a copy of ${randomMinion.card.name} from deck.`);
    
    return { 
      success: true, 
      additionalData: { 
        originalSource: sourceCard, 
        copiedFrom: randomMinion.card, 
        result: transformedMinion 
      }
    };
  } catch (error) {
    debug.error('Error executing transform_copy_from_deck:', error);
    return { success: false, error: `Failed to execute transform_copy_from_deck: ${error}` };
  }
}

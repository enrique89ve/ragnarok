/**
 * Copy From Opponent Effect Handler
 * 
 * This handler implements the spellEffect:copy_from_opponent effect.
 * Copies a card from the opponent's deck or hand to your hand.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeCopyFromOpponent(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:copy_from_opponent for ${sourceCard.name}`);
    
    const copyCount = effect.value || 1;
    const source = effect.source || 'deck';
    const cardType = effect.cardType;
    
    let sourcePool: any[] = [];
    
    if (source === 'deck') {
      sourcePool = [...context.opponentPlayer.deck];
    } else if (source === 'hand') {
      sourcePool = [...context.opponentPlayer.hand];
    } else if (source === 'both') {
      sourcePool = [...context.opponentPlayer.deck, ...context.opponentPlayer.hand];
    }
    
    if (cardType) {
      sourcePool = sourcePool.filter(cardInstance => cardInstance.card.type === cardType);
    }
    
    if (sourcePool.length === 0) {
      context.logGameEvent(`No cards available to copy from opponent's ${source}`);
      return { 
        success: true,
        additionalData: { copiedCards: 0 }
      };
    }
    
    const shuffled = [...sourcePool].sort(() => Math.random() - 0.5);
    const toCopy = shuffled.slice(0, copyCount);
    
    const copiedCards: string[] = [];
    
    toCopy.forEach(cardInstance => {
      if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
        const copy = {
          ...cardInstance,
          instanceId: 'copy-' + Date.now() + '-' + Math.random().toString(36).substring(7),
          card: { ...cardInstance.card }
        };
        context.currentPlayer.hand.push(copy);
        copiedCards.push(cardInstance.card.name);
        context.logGameEvent(`Copied ${cardInstance.card.name} from opponent's ${source}`);
      } else {
        context.logGameEvent(`Hand is full, couldn't copy ${cardInstance.card.name}`);
      }
    });
    
    return { 
      success: true,
      additionalData: {
        copiedCards: copiedCards.length,
        cardNames: copiedCards
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:copy_from_opponent:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:copy_from_opponent: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

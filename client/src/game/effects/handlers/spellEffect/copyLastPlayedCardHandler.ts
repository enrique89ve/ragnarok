/**
 * Copy Last Played Card Effect Handler
 * 
 * This handler implements the spellEffect:copy_last_played_card effect.
 * Copies the last card played by either player to your hand.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeCopyLastPlayedCard(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:copy_last_played_card for ${sourceCard.name}`);
    
    const fromOpponent = effect.fromOpponent !== false;
    const cardType = effect.cardType;
    
    let lastPlayedCard: any = null;
    
    if ((context as any).lastPlayedCard) {
      lastPlayedCard = (context as any).lastPlayedCard;
    } else if ((context as any).gameHistory && (context as any).gameHistory.length > 0) {
      const history = (context as any).gameHistory;
      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (entry.type === 'card_played') {
          if (fromOpponent && entry.playerId !== context.currentPlayer.id) {
            lastPlayedCard = entry.card;
            break;
          } else if (!fromOpponent) {
            lastPlayedCard = entry.card;
            break;
          }
        }
      }
    }
    
    if (!lastPlayedCard) {
      context.logGameEvent(`No last played card found to copy`);
      return { 
        success: true,
        additionalData: { copied: false }
      };
    }
    
    if (cardType && lastPlayedCard.type !== cardType) {
      context.logGameEvent(`Last played card (${lastPlayedCard.name}) is not of type ${cardType}`);
      return { 
        success: true,
        additionalData: { copied: false }
      };
    }
    
    if (context.currentPlayer.hand.length >= MAX_HAND_SIZE) {
      context.logGameEvent(`Hand is full, couldn't copy ${lastPlayedCard.name}`);
      return { 
        success: true,
        additionalData: { copied: false, reason: 'hand_full' }
      };
    }
    
    const copy = {
      instanceId: 'copy-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      card: { ...lastPlayedCard },
      canAttack: false,
      isPlayed: false,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    context.currentPlayer.hand.push(copy as any);
    context.logGameEvent(`Copied ${lastPlayedCard.name} to hand`);
    
    return { 
      success: true,
      additionalData: {
        copied: true,
        cardName: lastPlayedCard.name
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:copy_last_played_card:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:copy_last_played_card: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

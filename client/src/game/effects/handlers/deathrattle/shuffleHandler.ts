/**
 * Shuffle Deathrattle Handler
 * 
 * Implements the "shuffle" deathrattle effect.
 * Shuffles something (typically this minion or a related card) into the deck.
 * Example: White Eyes (shuffles The Storm Guardian into your deck)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execute a shuffle deathrattle effect
 */
export default function executeShuffleShuffle(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const card = 'card' in sourceCard ? sourceCard.card : sourceCard;
    const cardName = card.name;
    
    context.logGameEvent(`Executing deathrattle:shuffle for ${cardName}`);
    
    const summonCardId = effect.summonCardId || effect.cardId;
    const shuffleSelf = effect.shuffleSelf || !summonCardId;
    const count = effect.value || effect.count || 1;
    
    let cardToShuffle: any;
    
    if (shuffleSelf) {
      cardToShuffle = card;
    } else if (summonCardId) {
      cardToShuffle = getCardById(Number(summonCardId));
      if (!cardToShuffle) {
        return { success: false, error: `Card with ID ${summonCardId} not found` };
      }
    } else {
      cardToShuffle = card;
    }
    
    let shuffledCount = 0;
    
    for (let i = 0; i < count; i++) {
      const newCardInstance: CardInstance = {
        instanceId: uuidv4(),
        card: cardToShuffle,
        currentHealth: cardToShuffle.health,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      const randomIndex = Math.floor(Math.random() * (context.currentPlayer.deck.length + 1));
      context.currentPlayer.deck.splice(randomIndex, 0, newCardInstance);
      shuffledCount++;
      context.logGameEvent(`Shuffled ${cardToShuffle.name} into your deck from ${cardName}'s deathrattle`);
    }
    
    return {
      success: true,
      additionalData: { 
        shuffledCount, 
        shuffledCardName: cardToShuffle.name
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:shuffle:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:shuffle: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

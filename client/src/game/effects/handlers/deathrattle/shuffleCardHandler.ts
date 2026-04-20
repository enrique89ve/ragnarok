/**
 * ShuffleCard Deathrattle Handler
 * 
 * Implements the "shuffle_card" deathrattle effect.
 * Shuffles a specific card into the deck when this minion dies.
 * Example: Hakkar, the Soulflayer (shuffles Corrupted Blood into both decks)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { CardData, CardInstance, DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execute a shuffle_card deathrattle effect
 */
export default function executeShuffleCardShuffleCard(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: CardData | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:shuffle_card for ${cardName}`);
    
    const cardId = effect.cardId || effect.summonCardId;
    const count = effect.value || effect.count || 1;
    const shuffleForOpponent = effect.shuffleForOpponent || effect.bothPlayers || false;
    
    if (!cardId) {
      return { success: false, error: 'No cardId specified for shuffle_card effect' };
    }
    
    const cardToShuffle = getCardById(Number(cardId));
    if (!cardToShuffle) {
      return { success: false, error: `Card with ID ${cardId} not found` };
    }
    
    let shuffledCount = 0;
    
    for (let i = 0; i < count; i++) {
      const newCardInstance: CardInstance = {
        instanceId: uuidv4(),
        card: cardToShuffle,
        currentHealth: 'health' in cardToShuffle ? (cardToShuffle.health ?? 0) : 0,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      const randomIndex = Math.floor(Math.random() * (context.currentPlayer.deck.length + 1));
      context.currentPlayer.deck.splice(randomIndex, 0, newCardInstance as any);
      shuffledCount++;
      context.logGameEvent(`Shuffled ${cardToShuffle.name} into your deck`);
    }
    
    if (shuffleForOpponent) {
      for (let i = 0; i < count; i++) {
        const opponentCardInstance: CardInstance = {
          instanceId: uuidv4(),
          card: cardToShuffle,
          currentHealth: 'health' in cardToShuffle ? (cardToShuffle.health ?? 0) : 0,
          canAttack: false,
          isPlayed: false,
          isSummoningSick: false,
          attacksPerformed: 0
        };
        
        const randomIndex = Math.floor(Math.random() * (context.opponentPlayer.deck.length + 1));
        context.opponentPlayer.deck.splice(randomIndex, 0, opponentCardInstance as any);
        context.logGameEvent(`Shuffled ${cardToShuffle.name} into opponent's deck`);
      }
    }
    
    return {
      success: true,
      additionalData: { shuffledCount, cardName: cardToShuffle.name }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:shuffle_card:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:shuffle_card: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

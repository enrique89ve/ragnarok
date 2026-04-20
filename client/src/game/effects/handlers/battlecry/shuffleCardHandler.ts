/**
 * ShuffleCard Battlecry Handler
 * 
 * Shuffles a card into the player's deck.
 * Example card: Ancient Shade (ID: 30028)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeShuffleCard(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing shuffle_card battlecry for ${sourceCard.name}`);
    
    const cardId = effect.cardId || effect.value;
    const cardName = effect.cardName || 'Shuffled Card';
    const count = effect.count || effect.value || 1;
    const shuffleIntoOpponentDeck = effect.shuffleIntoOpponentDeck || false;
    
    const targetDeck = shuffleIntoOpponentDeck 
      ? context.opponentPlayer.deck 
      : context.currentPlayer.deck;
    
    const shuffledCards: CardInstance[] = [];
    
    for (let i = 0; i < count; i++) {
      const newCard: CardInstance = {
        instanceId: `shuffled-${cardId || 'custom'}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        card: {
          id: typeof cardId === 'number' ? cardId : (cardId ? parseInt(cardId, 10) : 99998),
          name: cardName,
          description: effect.cardDescription || '',
          manaCost: effect.manaCost || 0,
          type: effect.cardType || 'spell',
          rarity: effect.rarity || 'common',
          heroClass: effect.heroClass || 'neutral',
          attack: effect.attack,
          health: effect.health,
          deathrattle: effect.deathrattle
        } as Card,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      const randomIndex = Math.floor(Math.random() * (targetDeck.length + 1));
      targetDeck.splice(randomIndex, 0, newCard);
      shuffledCards.push(newCard);
      
      context.logGameEvent(`Shuffled ${cardName} into ${shuffleIntoOpponentDeck ? "opponent's" : 'your'} deck.`);
    }
    
    return { 
      success: true, 
      additionalData: { shuffledCards, count: shuffledCards.length }
    };
  } catch (error) {
    debug.error('Error executing shuffle_card:', error);
    return { success: false, error: `Failed to execute shuffle_card: ${error}` };
  }
}

/**
 * GiveCards Battlecry Handler
 * 
 * Gives cards to a player (from effect.cards array).
 * Example card: King Mukla (ID: 20135)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeGiveCards(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing give_cards battlecry for ${sourceCard.name}`);
    
    const cardCount = effect.cardCount || effect.count || 1;
    const cardId = effect.cardId;
    const giveToOpponent = effect.giveToOpponent ?? true;
    const cards = effect.cards || [];
    
    const targetPlayer = giveToOpponent ? context.opponentPlayer : context.currentPlayer;
    const givenCards: CardInstance[] = [];
    
    for (let i = 0; i < cardCount; i++) {
      if (targetPlayer.hand.length >= MAX_HAND_SIZE) {
        context.logGameEvent(`${giveToOpponent ? 'Opponent' : 'Your'} hand is full.`);
        break;
      }
      
      let cardToGive: Card;
      
      if (cards.length > 0) {
        cardToGive = cards[i % cards.length];
      } else if (cardId) {
        cardToGive = {
          id: typeof cardId === 'number' ? cardId : parseInt(cardId, 10),
          name: effect.cardName || 'Banana',
          description: effect.cardDescription || '',
          manaCost: effect.manaCost || 1,
          type: effect.cardType || 'spell',
          rarity: 'common',
          heroClass: 'neutral'
        } as Card;
      } else {
        cardToGive = {
          id: 99999,
          name: 'Banana',
          description: 'Give a minion +1/+1.',
          manaCost: 1,
          type: 'spell',
          rarity: 'common',
          heroClass: 'neutral'
        } as Card;
      }
      
      const newCardInstance: CardInstance = {
        instanceId: `given-${cardToGive.id}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        card: cardToGive,
        canAttack: false,
        isPlayed: false,
        isSummoningSick: false,
        attacksPerformed: 0
      };
      
      targetPlayer.hand.push(newCardInstance);
      givenCards.push(newCardInstance);
      context.logGameEvent(`Gave ${cardToGive.name} to ${giveToOpponent ? 'opponent' : 'player'}.`);
    }
    
    return { 
      success: true, 
      additionalData: { givenCards, count: givenCards.length, giveToOpponent }
    };
  } catch (error) {
    debug.error('Error executing give_cards:', error);
    return { success: false, error: `Failed to execute give_cards: ${error}` };
  }
}

/**
 * EatOpponentCard Battlecry Handler
 * 
 * Steals/eats a card from opponent's hand and gains its stats.
 * Example card: Mutanus the Devourer (ID: 20313)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeEatOpponentCard(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing eat_opponent_card battlecry for ${sourceCard.name}`);
    
    const cardType = effect.cardType || 'minion';
    const gainStats = effect.gainStats ?? true;
    const fromHand = effect.fromHand ?? true;
    const fromDeck = effect.fromDeck ?? false;
    
    let targetPool: CardInstance[] = [];
    
    if (fromHand) {
      targetPool = context.opponentPlayer.hand.filter(
        card => card.card.type === cardType
      );
    } else if (fromDeck) {
      targetPool = context.opponentPlayer.deck.filter(
        card => card.card.type === cardType
      );
    }
    
    if (targetPool.length === 0) {
      context.logGameEvent(`No ${cardType}s in opponent's ${fromHand ? 'hand' : 'deck'} to eat.`);
      return { success: true, additionalData: { eatenCard: null } };
    }
    
    const randomIndex = Math.floor(Math.random() * targetPool.length);
    const eatenCard = targetPool[randomIndex];
    
    const sourceLocation = fromHand ? context.opponentPlayer.hand : context.opponentPlayer.deck;
    const cardIndex = sourceLocation.indexOf(eatenCard);
    if (cardIndex !== -1) {
      sourceLocation.splice(cardIndex, 1);
    }
    
    context.logGameEvent(`Ate ${eatenCard.card.name} from opponent's ${fromHand ? 'hand' : 'deck'}.`);
    
    if (gainStats && eatenCard.card.type === 'minion') {
      const sourceOnBoard = context.currentPlayer.board.find(
        m => m.card.id === sourceCard.id
      );
      
      if (sourceOnBoard) {
        const attackGain = eatenCard.card.attack || 0;
        const healthGain = eatenCard.card.health || 0;
        
        sourceOnBoard.currentAttack = (sourceOnBoard.currentAttack || sourceCard.attack || 0) + attackGain;
        sourceOnBoard.currentHealth = (sourceOnBoard.currentHealth || sourceCard.health || 0) + healthGain;
        
        context.logGameEvent(`${sourceCard.name} gained +${attackGain}/+${healthGain}.`);
      }
    }
    
    return { 
      success: true, 
      additionalData: { 
        eatenCard: eatenCard.card,
        attackGained: eatenCard.card.attack || 0,
        healthGained: eatenCard.card.health || 0
      }
    };
  } catch (error) {
    debug.error('Error executing eat_opponent_card:', error);
    return { success: false, error: `Failed to execute eat_opponent_card: ${error}` };
  }
}

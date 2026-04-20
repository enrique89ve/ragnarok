/**
 * OpponentSummonFromHand Battlecry Handler
 * 
 * Forces the opponent to summon a random minion from their hand.
 * Example card: Dirty Rat (ID: 32011)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeOpponentSummonFromHand(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing opponent_summon_from_hand battlecry for ${sourceCard.name}`);
    
    const cardType = effect.cardType || 'minion';
    const count = effect.count || 1;
    
    const minionsInHand = context.opponentPlayer.hand.filter(
      card => card.card.type === cardType
    );
    
    if (minionsInHand.length === 0) {
      context.logGameEvent(`Opponent has no ${cardType}s in hand.`);
      return { success: true, additionalData: { summonedMinions: [] } };
    }
    
    if (context.opponentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
      context.logGameEvent("Opponent's board is full.");
      return { success: true, additionalData: { summonedMinions: [], boardFull: true } };
    }
    
    const summonedMinions: CardInstance[] = [];
    
    for (let i = 0; i < count && minionsInHand.length > 0; i++) {
      if (context.opponentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) break;
      
      const randomIndex = Math.floor(Math.random() * minionsInHand.length);
      const minionToSummon = minionsInHand[randomIndex];
      
      const handIndex = context.opponentPlayer.hand.indexOf(minionToSummon);
      if (handIndex !== -1) {
        context.opponentPlayer.hand.splice(handIndex, 1);
      }
      
      const summonedMinion: CardInstance = {
        ...minionToSummon,
        instanceId: `forced-summon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        currentHealth: minionToSummon.card.health,
        currentAttack: minionToSummon.card.attack,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      context.opponentPlayer.board.push(summonedMinion);
      summonedMinions.push(summonedMinion);
      
      minionsInHand.splice(randomIndex, 1);
      
      context.logGameEvent(`Forced opponent to summon ${minionToSummon.card.name}.`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        summonedMinions,
        count: summonedMinions.length
      }
    };
  } catch (error) {
    debug.error('Error executing opponent_summon_from_hand:', error);
    return { success: false, error: `Failed to execute opponent_summon_from_hand: ${error}` };
  }
}

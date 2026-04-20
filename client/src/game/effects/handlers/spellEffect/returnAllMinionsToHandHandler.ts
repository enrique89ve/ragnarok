/**
 * ReturnAllMinionsToHand SpellEffect Handler
 * 
 * Implements the "return_all_minions_to_hand" spellEffect effect.
 * Returns all minions on the board to their owners' hands.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeReturnAllMinionsToHand(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:return_all_minions_to_hand for ${sourceCard.name}`);
    
    const includeFriendly = effect.includeFriendly !== false;
    const includeEnemy = effect.includeEnemy !== false;
    const resetStats = effect.resetStats !== false;
    
    let minionsReturned = 0;
    
    const contextAny = context as any;
    
    if (includeFriendly) {
      const friendlyMinions = [...context.currentPlayer.board];
      friendlyMinions.forEach(minion => {
        const minionAny = minion as any;
        if (context.currentPlayer.hand.length < MAX_HAND_SIZE) {
          context.currentPlayer.board = context.currentPlayer.board.filter(
            (m: any) => m.instanceId !== minion.instanceId
          );
          
          if (resetStats) {
            minion.currentHealth = minion.card.health;
            minion.card.attack = minionAny.card.baseAttack || minion.card.attack;
            delete minionAny.enchantments;
            delete minionAny.grantedDeathrattles;
          }
          
          context.currentPlayer.hand.push(minion);
          minionsReturned++;
          context.logGameEvent(`${minion.card.name} returned to player's hand`);
        } else {
          contextAny.destroyMinion(minion);
          context.logGameEvent(`${minion.card.name} destroyed (hand full)`);
        }
      });
    }
    
    if (includeEnemy) {
      const enemyMinions = [...context.opponentPlayer.board];
      enemyMinions.forEach(minion => {
        const minionAny = minion as any;
        if (context.opponentPlayer.hand.length < MAX_HAND_SIZE) {
          context.opponentPlayer.board = context.opponentPlayer.board.filter(
            (m: any) => m.instanceId !== minion.instanceId
          );
          
          if (resetStats) {
            minion.currentHealth = minion.card.health;
            minion.card.attack = minionAny.card.baseAttack || minion.card.attack;
            delete minionAny.enchantments;
            delete minionAny.grantedDeathrattles;
          }
          
          context.opponentPlayer.hand.push(minion);
          minionsReturned++;
          context.logGameEvent(`${minion.card.name} returned to opponent's hand`);
        } else {
          contextAny.destroyMinion(minion);
          context.logGameEvent(`${minion.card.name} destroyed (hand full)`);
        }
      });
    }
    
    return { 
      success: true,
      additionalData: { minionsReturned }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:return_all_minions_to_hand:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:return_all_minions_to_hand: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

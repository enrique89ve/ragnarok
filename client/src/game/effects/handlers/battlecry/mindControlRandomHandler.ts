/**
 * MindControlRandom Battlecry Handler
 * 
 * Implements the "mind_control_random" battlecry effect.
 * Takes control of a random enemy minion.
 * Example card: Mind Control Tech (ID: 31015)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeMindControlRandom(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:mind_control_random for ${sourceCard.name}`);
    
    const condition = effect.condition;
    const conditionValue = effect.conditionValue || 4;
    
    const enemyMinions = context.getEnemyMinions();
    
    if (condition === 'enemy_minion_count') {
      if (enemyMinions.length < conditionValue) {
        context.logGameEvent(`Mind control condition not met: enemy has ${enemyMinions.length} minions, needs ${conditionValue}`);
        return { success: true, additionalData: { conditionNotMet: true, reason: 'Not enough enemy minions' } };
      }
    }
    
    if (enemyMinions.length === 0) {
      context.logGameEvent(`No enemy minions to mind control`);
      return { success: true, additionalData: { noTargets: true } };
    }
    
    if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
      context.logGameEvent(`Cannot mind control: board is full`);
      return { success: false, error: 'Board is full' };
    }
    
    const randomIndex = Math.floor(Math.random() * enemyMinions.length);
    const stolenMinion = enemyMinions[randomIndex];
    
    const opponentBoardIndex = context.opponentPlayer.board.findIndex(
      m => m.instanceId === stolenMinion.instanceId
    );
    
    if (opponentBoardIndex !== -1) {
      context.opponentPlayer.board.splice(opponentBoardIndex, 1);
      
      stolenMinion.isPlayerOwned = true;
      stolenMinion.canAttack = false;
      stolenMinion.isSummoningSick = true;
      
      context.currentPlayer.board.push(stolenMinion);
      
      context.logGameEvent(`${sourceCard.name} took control of ${stolenMinion.card.name}!`);
      
      return { 
        success: true, 
        additionalData: { 
          stolenMinion: stolenMinion.card.name
        } 
      };
    }
    
    return { success: false, error: 'Failed to find minion on opponent board' };
  } catch (error) {
    debug.error(`Error executing battlecry:mind_control_random:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:mind_control_random: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

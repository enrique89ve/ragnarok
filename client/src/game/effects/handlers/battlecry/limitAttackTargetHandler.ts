/**
 * LimitAttackTarget Battlecry Handler
 * 
 * Limits what the minion can attack (e.g., can't attack heroes this turn).
 * Example card: Charged Devilsaur (ID: 30024)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeLimitAttackTarget(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing limit_attack_target battlecry for ${sourceCard.name}`);
    
    const canAttackHeroes = effect.canAttackHeroes ?? false;
    const canOnlyAttackMinions = effect.canOnlyAttackMinions ?? true;
    const duration = effect.duration || 'this_turn';
    
    const sourceOnBoard = context.currentPlayer.board.find(
      m => m.card.id === sourceCard.id
    );
    
    if (!sourceOnBoard) {
      return { success: false, error: 'Source minion not found on board' };
    }
    
    (sourceOnBoard as any).canAttackHeroes = canAttackHeroes;
    (sourceOnBoard as any).canOnlyAttackMinions = canOnlyAttackMinions;
    (sourceOnBoard as any).attackRestrictionDuration = duration;
    
    if (canOnlyAttackMinions) {
      sourceOnBoard.canAttack = true;
      sourceOnBoard.isSummoningSick = false;
    }
    
    const restrictionText = canOnlyAttackMinions 
      ? 'Can only attack minions this turn' 
      : (canAttackHeroes ? 'Can attack heroes' : 'Cannot attack heroes');
    
    context.logGameEvent(`${sourceCard.name}: ${restrictionText}.`);
    
    return { 
      success: true, 
      additionalData: { 
        canAttackHeroes,
        canOnlyAttackMinions,
        duration,
        hasRush: canOnlyAttackMinions
      }
    };
  } catch (error) {
    debug.error('Error executing limit_attack_target:', error);
    return { success: false, error: `Failed to execute limit_attack_target: ${error}` };
  }
}

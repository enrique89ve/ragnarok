/**
 * TransformCopy Battlecry Handler
 * 
 * Transforms the source minion into a copy of another minion.
 * Example card: Prince Taldaram (ID: 20704)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransformCopy(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing transform_copy battlecry for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    const keepStats = effect.keepStats || false;
    const setStats = effect.setStats;
    
    const sourceCardInstance: CardInstance = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    const validTargets = targets.filter(t => t.card.id !== sourceCard.id);
    
    if (validTargets.length === 0) {
      context.logGameEvent('No valid targets for transform_copy');
      return { success: false, error: 'No valid targets' };
    }
    
    const target = validTargets[0];
    
    const sourceOnBoard = context.currentPlayer.board.find(
      m => m.card.id === sourceCard.id
    );
    
    if (!sourceOnBoard) {
      return { success: false, error: 'Source minion not found on board' };
    }
    
    const boardIndex = context.currentPlayer.board.indexOf(sourceOnBoard);
    
    const copiedMinion: CardInstance = {
      instanceId: `copy-transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: { ...target.card },
      currentHealth: keepStats ? (sourceOnBoard.currentHealth || sourceCard.health || 3) : (target.currentHealth || target.card.health),
      currentAttack: keepStats ? (sourceOnBoard.currentAttack || sourceCard.attack || 3) : (target.currentAttack || target.card.attack),
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0,
      hasDivineShield: target.hasDivineShield,
      isPoisonous: target.isPoisonous,
      hasLifesteal: target.hasLifesteal
    };
    
    if (setStats) {
      copiedMinion.currentAttack = setStats.attack ?? copiedMinion.currentAttack;
      copiedMinion.currentHealth = setStats.health ?? copiedMinion.currentHealth;
    }
    
    context.currentPlayer.board[boardIndex] = copiedMinion;
    
    context.logGameEvent(`${sourceCard.name} transformed into a copy of ${target.card.name}.`);
    
    return { 
      success: true, 
      additionalData: { originalSource: sourceCard, copiedFrom: target, result: copiedMinion }
    };
  } catch (error) {
    debug.error('Error executing transform_copy:', error);
    return { success: false, error: `Failed to execute transform_copy: ${error}` };
  }
}

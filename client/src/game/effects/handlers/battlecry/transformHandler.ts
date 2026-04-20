/**
 * Transform Battlecry Handler
 * 
 * Transforms a minion into another specific minion.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransform(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing transform battlecry for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    const transformIntoId = effect.transformIntoId || effect.summonCardId;
    const transformIntoName = effect.transformIntoName || 'Transformed Minion';
    
    const sourceCardInstance: CardInstance = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent('No valid targets for transform');
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    const board = context.currentPlayer.board.includes(target) 
      ? context.currentPlayer.board 
      : context.opponentPlayer.board;
    const index = board.indexOf(target);
    
    if (index === -1) {
      return { success: false, error: 'Target not found on board' };
    }
    
    const transformedMinion: CardInstance = {
      instanceId: `transformed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: {
        id: typeof transformIntoId === 'number' ? transformIntoId : (transformIntoId ? parseInt(transformIntoId, 10) : 99996),
        name: transformIntoName,
        description: effect.transformIntoDescription || '',
        manaCost: effect.transformManaCost || target.card.manaCost,
        type: 'minion',
        rarity: effect.transformRarity || 'common',
        heroClass: effect.transformHeroClass || 'neutral',
        attack: effect.transformAttack ?? 1,
        health: effect.transformHealth ?? 1
      } as Card,
      currentHealth: effect.transformHealth ?? 1,
      currentAttack: effect.transformAttack ?? 1,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    board[index] = transformedMinion;
    
    context.logGameEvent(`Transformed ${target.card.name} into ${transformedMinion.card.name}.`);
    
    return { 
      success: true, 
      additionalData: { originalTarget: target, transformedMinion }
    };
  } catch (error) {
    debug.error('Error executing transform:', error);
    return { success: false, error: `Failed to execute transform: ${error}` };
  }
}

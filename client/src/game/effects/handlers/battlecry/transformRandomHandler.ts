/**
 * TransformRandom Battlecry Handler
 * 
 * Transforms a minion into a random minion.
 * Example card: Tinkmaster Overspark (ID: 20606)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransformRandom(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing transform_random battlecry for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    const transformOptions = effect.transformOptions || [
      { name: 'Squirrel', attack: 1, health: 1 },
      { name: 'Devilsaur', attack: 5, health: 5 }
    ];
    
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
      context.logGameEvent('No valid targets for transform_random');
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
    
    const randomOption = transformOptions[Math.floor(Math.random() * transformOptions.length)];
    
    const transformedMinion: CardInstance = {
      instanceId: `transformed-random-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      card: {
        id: randomOption.id || 99995,
        name: randomOption.name || 'Random Creature',
        description: randomOption.description || '',
        manaCost: randomOption.manaCost || 1,
        type: 'minion',
        rarity: randomOption.rarity || 'common',
        heroClass: 'neutral',
        attack: randomOption.attack || 1,
        health: randomOption.health || 1
      } as Card,
      currentHealth: randomOption.health || 1,
      currentAttack: randomOption.attack || 1,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    board[index] = transformedMinion;
    
    context.logGameEvent(`Transformed ${target.card.name} into ${transformedMinion.card.name}.`);
    
    return { 
      success: true, 
      additionalData: { originalTarget: target, transformedMinion, selectedOption: randomOption }
    };
  } catch (error) {
    debug.error('Error executing transform_random:', error);
    return { success: false, error: `Failed to execute transform_random: ${error}` };
  }
}

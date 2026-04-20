/**
 * Destroy Effect Handler
 * 
 * This handler implements the spellEffect:destroy effect.
 * Destroys a target minion.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeDestroy(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };
  
  try {
    context.logGameEvent(`Executing spellEffect:destroy for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    const secondaryEffect = effect.secondaryEffect;
    const healValue = effect.healValue || 0;
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for destroy`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    if (target.card.type !== 'minion') {
      return { success: false, error: 'Can only destroy minions' };
    }
    
    const targetName = target.card.name;
    const targetHealth = target.currentHealth || target.card.health || 0;
    
    target.currentHealth = 0;
    context.logGameEvent(`Destroyed ${targetName}`);
    
    const isOnCurrentBoard = context.currentPlayer.board.includes(target);
    if (isOnCurrentBoard) {
      const index = context.currentPlayer.board.indexOf(target);
      if (index !== -1) {
        const removed = context.currentPlayer.board.splice(index, 1)[0];
        context.currentPlayer.graveyard.push(removed);
      }
    } else {
      const index = context.opponentPlayer.board.indexOf(target);
      if (index !== -1) {
        const removed = context.opponentPlayer.board.splice(index, 1)[0];
        context.opponentPlayer.graveyard.push(removed);
      }
    }
    
    if (secondaryEffect === 'heal_hero' && healValue > 0) {
      context.healTarget(context.currentPlayer.hero, healValue);
      context.logGameEvent(`Healed hero for ${healValue}`);
    }
    
    if (secondaryEffect === 'gain_armor' && effect.value) {
      context.currentPlayer.armor += effect.value;
      context.logGameEvent(`Gained ${effect.value} armor`);
    }
    
    return { 
      success: true,
      additionalData: {
        destroyedMinion: targetName,
        destroyedHealth: targetHealth
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:destroy:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:destroy: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

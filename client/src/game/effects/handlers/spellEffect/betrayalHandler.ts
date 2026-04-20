/**
 * Betrayal Effect Handler
 * 
 * This handler implements the spellEffect:betrayal effect.
 * Forces an enemy minion to deal its attack damage to adjacent minions.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeBetrayal(
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
    context.logGameEvent(`Executing spellEffect:betrayal for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'enemy_minion';
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for betrayal`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    if (target.card.type !== 'minion') {
      return { success: false, error: 'Target must be a minion' };
    }
    
    const attackValue = target.card.attack || 0;
    const adjacentMinions = context.getAdjacentMinions(target);
    
    if (adjacentMinions.length === 0) {
      context.logGameEvent(`${target.card.name} has no adjacent minions to betray`);
      return { 
        success: true,
        additionalData: {
          adjacentDamaged: 0
        }
      };
    }
    
    adjacentMinions.forEach(adjacent => {
      context.logGameEvent(`${target.card.name} deals ${attackValue} damage to ${adjacent.card.name} (Betrayal)`);
      context.dealDamage(adjacent, attackValue);
    });
    
    return { 
      success: true,
      additionalData: {
        attackerName: target.card.name,
        attackValue,
        adjacentDamaged: adjacentMinions.length
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:betrayal:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:betrayal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

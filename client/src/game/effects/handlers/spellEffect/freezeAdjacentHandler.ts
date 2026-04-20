/**
 * FreezeAdjacent SpellEffect Handler
 * 
 * Implements the "freeze_adjacent" spellEffect effect.
 * Freezes minions adjacent to the target.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeFreezeAdjacent(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:freeze_adjacent for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'any_minion';
    const includeTarget = effect.includeTarget !== false;
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for freeze_adjacent effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    let frozenCount = 0;
    const target = targets[0];
    
    if (includeTarget && target.card.type === 'minion') {
      (target as any).isFrozen = true;
      context.logGameEvent(`${target.card.name} is frozen`);
      frozenCount++;
    }
    
    const adjacentMinions = context.getAdjacentMinions(target);
    adjacentMinions.forEach(adjacentMinion => {
      (adjacentMinion as any).isFrozen = true;
      context.logGameEvent(`${adjacentMinion.card.name} (adjacent) is frozen`);
      frozenCount++;
    });
    
    return { 
      success: true,
      additionalData: { frozenCount }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:freeze_adjacent:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:freeze_adjacent: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

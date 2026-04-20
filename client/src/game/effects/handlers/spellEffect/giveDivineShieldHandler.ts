/**
 * GiveDivineShield SpellEffect Handler
 * 
 * Implements the "give_divine_shield" spellEffect effect.
 * Grants Divine Shield to target minions.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

export default function executeGiveDivineShield(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:give_divine_shield for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minions';
    const requiresTarget = effect.requiresTarget !== false;
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0 && requiresTarget) {
      context.logGameEvent(`No valid targets for give_divine_shield effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    let shieldsGranted = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        (target as any).hasDivineShield = true;
        addKeyword(target, 'divine_shield');
        shieldsGranted++;
        context.logGameEvent(`${target.card.name} gained Divine Shield`);
      }
    });
    
    return { 
      success: true,
      additionalData: { shieldsGranted }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:give_divine_shield:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:give_divine_shield: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

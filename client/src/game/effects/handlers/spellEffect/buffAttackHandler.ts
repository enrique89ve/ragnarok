/**
 * Buff Attack Effect Handler
 * 
 * This handler implements the spellEffect:buff_attack effect.
 * Applies a simple attack buff to a target minion.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeBuffAttack(
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
    context.logGameEvent(`Executing spellEffect:buff_attack for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const buffValue = effect.value || 1;
    const targetsAll = effect.targetsAll || false;
    
    let targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for buff_attack`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (!targetsAll) {
      targets = [targets[0]];
    }
    
    targets.forEach(target => {
      if (target.card.attack !== undefined) {
        target.card.attack += buffValue;
        context.logGameEvent(`${target.card.name} attack increased by +${buffValue} (now ${target.card.attack})`);
      }
    });
    
    return { 
      success: true,
      additionalData: {
        buffedCount: targets.length,
        buffValue
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_attack:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_attack: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

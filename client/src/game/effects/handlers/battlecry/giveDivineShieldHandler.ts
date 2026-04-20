/**
 * GiveDivineShield Battlecry Handler
 * 
 * Gives Divine Shield to target minions.
 * Example card: Argent Protector (ID: 8020)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeGiveDivineShield(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing give_divine_shield battlecry for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    const affectAll = effect.affectAll || false;
    
    const sourceCardInstance: CardInstance = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true,
      isSummoningSick: false,
      attacksPerformed: 0
    };
    
    let targets = context.getTargets(targetType, sourceCardInstance);
    
    targets = targets.filter(t => t.card.id !== sourceCard.id);
    
    if (targets.length === 0) {
      context.logGameEvent('No valid targets for give_divine_shield');
      return { success: false, error: 'No valid targets' };
    }
    
    const affectedMinions: CardInstance[] = [];
    const minionsToAffect = affectAll ? targets : [targets[0]];
    
    for (const target of minionsToAffect) {
      if (!target.hasDivineShield) {
        target.hasDivineShield = true;
        affectedMinions.push(target);
        context.logGameEvent(`Gave Divine Shield to ${target.card.name}.`);
      } else {
        context.logGameEvent(`${target.card.name} already has Divine Shield.`);
      }
    }
    
    return { 
      success: true, 
      additionalData: { 
        affectedMinions,
        count: affectedMinions.length
      }
    };
  } catch (error) {
    debug.error('Error executing give_divine_shield:', error);
    return { success: false, error: `Failed to execute give_divine_shield: ${error}` };
  }
}

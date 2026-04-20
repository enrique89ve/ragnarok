/**
 * SetStats Battlecry Handler
 * 
 * Implements the "set_stats" battlecry effect.
 * Sets attack and health to specific values for target minion(s).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a set_stats battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSetStats(
  context: GameContext, 
  effect: BattlecryEffect, 
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
    context.logGameEvent(`Executing battlecry:set_stats for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'all_minions';
    const setAttack = effect.setAttack;
    const setHealth = effect.setHealth;
    
    if (setAttack === undefined && setHealth === undefined) {
      context.logGameEvent(`SetStats effect has no stat values specified`);
      return { success: false, error: 'No stat values specified' };
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:set_stats`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for set_stats effect`);
      return { success: true };
    }
    
    let modifiedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        const previousAttack = target.currentAttack || target.card.attack || 0;
        const previousHealth = target.currentHealth || target.card.health || 0;
        
        if (setAttack !== undefined) {
          target.currentAttack = setAttack;
          target.card.attack = setAttack;
        }
        
        if (setHealth !== undefined) {
          target.currentHealth = setHealth;
          target.card.health = setHealth;
        }
        
        modifiedCount++;
        context.logGameEvent(`${sourceCard.name} set ${target.card.name}'s stats to ${setAttack ?? previousAttack}/${setHealth ?? previousHealth} (was ${previousAttack}/${previousHealth})`);
      }
    });
    
    return { 
      success: true, 
      additionalData: { 
        modifiedCount,
        setAttack,
        setHealth
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:set_stats:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:set_stats: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * DivineShieldGain Battlecry Handler
 * 
 * Implements the "divine_shield_gain" battlecry effect.
 * Grants Divine Shield to target minion(s).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a divine_shield_gain battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDivineShieldGain(
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
    context.logGameEvent(`Executing battlecry:divine_shield_gain for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'self';
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:divine_shield_gain`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for divine shield gain effect`);
      return { success: true };
    }
    
    let shieldedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        target.hasDivineShield = true;
        
        addKeyword(target, 'divine_shield');
        
        shieldedCount++;
        context.logGameEvent(`${sourceCard.name} granted Divine Shield to ${target.card.name}`);
      }
    });
    
    return { success: true, additionalData: { shieldedCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:divine_shield_gain:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:divine_shield_gain: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Buff Effect Handler
 * 
 * This handler implements the battlecry:buff effect.
 * Applies attack and health buffs to target minion(s).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a Buff effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuff(
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
    context.logGameEvent(`Executing battlecry:buff for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'friendly_minion';
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const grantKeywords = effect.grantKeywords || [];
    
    if (buffAttack === 0 && buffHealth === 0 && grantKeywords.length === 0) {
      context.logGameEvent(`Buff effect has no buffs specified`);
      return { success: true };
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:buff`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for buff effect`);
      return { success: true };
    }
    
    let buffedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        if (buffAttack !== 0) {
          target.currentAttack = (target.currentAttack || target.card.attack || 0) + buffAttack;
          target.card.attack = (target.card.attack || 0) + buffAttack;
        }
        
        if (buffHealth !== 0) {
          target.currentHealth = (target.currentHealth || target.card.health || 0) + buffHealth;
          target.card.health = (target.card.health || 0) + buffHealth;
        }
        
        grantKeywords.forEach((keyword: string) => {
          addKeyword(target, keyword);
          
          const lowerKeyword = keyword.toLowerCase();
          if (lowerKeyword === 'taunt') {
            (target as any).hasTaunt = true;
          } else if (lowerKeyword === 'divine_shield') {
            target.hasDivineShield = true;
          } else if (lowerKeyword === 'lifesteal') {
            target.hasLifesteal = true;
          } else if (lowerKeyword === 'rush') {
            target.isRush = true;
          } else if (lowerKeyword === 'poisonous') {
            target.isPoisonous = true;
          }
        });
        
        buffedCount++;
        context.logGameEvent(`${sourceCard.name} buffed ${target.card.name} by +${buffAttack}/+${buffHealth}`);
      }
    });
    
    return { success: true, additionalData: { buffedCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:buff:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

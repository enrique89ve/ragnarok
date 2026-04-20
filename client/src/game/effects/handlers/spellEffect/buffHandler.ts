/**
 * Buff Effect Handler
 * 
 * This handler implements the spellEffect:buff effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a Buff effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffBuff(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  // Create a temporary CardInstance for targeting purposes
  const sourceCardInstance: any = {
    instanceId: 'temp-' + Date.now(),
    card: sourceCard,
    canAttack: false,
    isPlayed: true,
    isSummoningSick: false,
    attacksPerformed: 0
  };
  try {
    // Log the effect execution
    context.logGameEvent(`Executing spellEffect:buff for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'friendly_minion';
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    const grantKeywords = effect.grantKeywords || [];
    const temporaryEffect = effect.temporaryEffect === true;
    
    // Implementation
    if (requiresTarget || targetType !== 'none') {
      // Get targets based on targetType
      const targets = context.getTargets(targetType, sourceCardInstance);
      
      if (targets.length === 0) {
        context.logGameEvent(`No valid targets for spellEffect:buff`);
        return { success: false, error: 'No valid targets' };
      }
      
      let buffedCount = 0;
      
      targets.forEach(target => {
        if (target.card.type === 'minion') {
          // Apply attack buff
          if (buffAttack !== 0) {
            target.card.attack = (target.card.attack || 0) + buffAttack;
          }
          
          // Apply health buff
          if (buffHealth !== 0) {
            target.card.health = (target.card.health || 0) + buffHealth;
            if (target.currentHealth !== undefined) {
              target.currentHealth += buffHealth;
            }
          }
          
          // Grant keywords
          if (grantKeywords.length > 0) {
            grantKeywords.forEach((keyword: string) => {
              addKeyword(target, keyword);
            });
          }
          
          buffedCount++;
          context.logGameEvent(`Buff effect applied to ${target.card.name}: +${buffAttack}/+${buffHealth}`);
        }
      });
      
      return { 
        success: true,
        additionalData: { buffedCount, buffAttack, buffHealth }
      };
    } else {
      context.logGameEvent(`Buff effect applied with no targets`);
      return { success: true };
    }
  } catch (error) {
    debug.error(`Error executing spellEffect:buff:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

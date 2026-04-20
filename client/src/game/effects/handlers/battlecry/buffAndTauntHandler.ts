/**
 * BuffAndTaunt Battlecry Handler
 * 
 * Implements the "buff_and_taunt" battlecry effect.
 * Buffs target minion and gives it Taunt.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a buff_and_taunt battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeBuffAndTaunt(
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
    context.logGameEvent(`Executing battlecry:buff_and_taunt for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget !== false;
    const targetType = effect.targetType || 'friendly_minion';
    const buffAttack = effect.buffAttack || 0;
    const buffHealth = effect.buffHealth || 0;
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:buff_and_taunt`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for buff_and_taunt effect`);
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
        
        addKeyword(target, 'taunt');
        (target as any).hasTaunt = true;
        
        buffedCount++;
        context.logGameEvent(`${sourceCard.name} gave ${target.card.name} +${buffAttack}/+${buffHealth} and Taunt`);
      }
    });
    
    return { success: true, additionalData: { buffedCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:buff_and_taunt:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:buff_and_taunt: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

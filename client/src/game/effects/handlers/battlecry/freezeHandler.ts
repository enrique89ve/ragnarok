/**
 * Freeze Battlecry Handler
 * 
 * Implements the "freeze" battlecry effect.
 * This handler freezes a target character, preventing it from attacking on the next turn.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';

/**
 * Execute a freeze battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns Effect result with success/failure status
 */
export default function executeFreeze(
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
    context.logGameEvent(`Executing battlecry:freeze for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'enemy_character';
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:freeze`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for freeze effect`);
      return { success: true };
    }
    
    let frozenCount = 0;
    
    targets.forEach(target => {
      target.isFrozen = true;
      frozenCount++;
      context.logGameEvent(`${sourceCard.name} froze ${target.card.name}`);
    });
    
    return { success: true, additionalData: { frozenCount } };
  } catch (error) {
    debug.error(`Error executing battlecry:freeze:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:freeze: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
/**
 * Set Health Effect Handler
 * 
 * This handler implements the battlecry:set_health effect.
 * This is used by cards like Alexstrasza that set a hero's remaining health to a specific value.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a Set Health effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @param effect.value - The health value to set
 * @param effect.requiresTarget - Whether this effect requires a target
 * @param effect.targetType - The type of target (any_hero, friendly_hero, enemy_hero)
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSetHealthSetHealth(
  context: GameContext, 
  effect: BattlecryEffect, 
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
    context.logGameEvent(`Executing battlecry:set_health for ${sourceCard.name}`);
    
    // Get effect properties with defaults
    const healthValue = effect.value || 15; // Default to 15 (Alexstrasza's effect)
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'any_hero';
    
    if (!requiresTarget) {
      context.logGameEvent(`Set health effect does not require explicit target — using default targeting`);
    }
    
    // Validate target type - should be a hero target
    if (targetType !== 'any_hero' && targetType !== 'friendly_hero' && targetType !== 'enemy_hero') {
      context.logGameEvent(`Invalid target type for set_health: ${targetType}`);
      return { success: false, error: `Invalid target type: ${targetType}` };
    }
    
    // Get valid targets
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for set_health effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    // Apply the effect to each target (typically there will be just one hero target)
    let appliedSuccessfully = false;
    
    targets.forEach(target => {
      // Check if target is a hero
      if (target.card.type === 'hero') {
        // Set the hero's health to the specified value
        if (target === context.currentPlayer.hero) {
          context.currentPlayer.health = healthValue;
          context.logGameEvent(`Set ${context.currentPlayer.id}'s health to ${healthValue}`);
          appliedSuccessfully = true;
        } else if (target === context.opponentPlayer.hero) {
          context.opponentPlayer.health = healthValue;
          context.logGameEvent(`Set ${context.opponentPlayer.id}'s health to ${healthValue}`);
          appliedSuccessfully = true;
        }
      }
    });
    
    if (!appliedSuccessfully) {
      context.logGameEvent(`Failed to set health - no valid hero targets`);
      return { success: false, error: 'No valid hero targets' };
    }
    
    return { 
      success: true,
      additionalData: { 
        newHealthValue: healthValue
      }
    };
  } catch (error) {
    debug.error(`Error executing battlecry:set_health:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:set_health: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
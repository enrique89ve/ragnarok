/**
 * GrantPersistentEffect Battlecry Handler
 * 
 * Implements the "grant_persistent_effect" battlecry effect.
 * Grants an ongoing effect that persists throughout the game.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a grant_persistent_effect battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGrantPersistentEffect(
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
    context.logGameEvent(`Executing battlecry:grant_persistent_effect for ${sourceCard.name}`);
    
    const persistentEffect = effect.effect || effect.persistentEffect;
    const permanent = effect.permanent !== false;
    const targetType = effect.targetType || 'self';
    const duration = effect.duration || 'permanent';
    
    if (!persistentEffect) {
      context.logGameEvent(`GrantPersistentEffect missing effect property`);
      return { success: false, error: 'No effect specified' };
    }
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0 && targetType !== 'none') {
      context.logGameEvent(`No valid targets for grant_persistent_effect`);
      return { success: true };
    }
    
    const newPersistentEffect = {
      id: `persistent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceCardId: sourceCard.id,
      sourceCardName: sourceCard.name,
      effect: persistentEffect,
      permanent,
      duration,
      turnApplied: context.turnCount,
      targets: targets.map(t => t.instanceId),
      isActive: true
    };
    
    context.activeEffects.push(newPersistentEffect);
    
    let effectDescription = '';
    if (typeof persistentEffect === 'string') {
      effectDescription = persistentEffect;
    } else if (persistentEffect.type) {
      effectDescription = persistentEffect.type;
    }
    
    targets.forEach(target => {
      applyPersistentEffectToTarget(target, persistentEffect);
      context.logGameEvent(`${sourceCard.name} granted persistent effect "${effectDescription}" to ${target.card.name}`);
    });
    
    if (targets.length === 0) {
      context.logGameEvent(`${sourceCard.name} activated persistent effect "${effectDescription}"`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        effectId: newPersistentEffect.id,
        effectType: effectDescription,
        targetsAffected: targets.length,
        permanent,
        duration
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:grant_persistent_effect:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:grant_persistent_effect: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function applyPersistentEffectToTarget(target: any, effect: any): void {
  if (!target.persistentEffects) {
    target.persistentEffects = [];
  }
  
  target.persistentEffects.push(effect);
  
  if (typeof effect === 'object') {
    switch (effect.type) {
      case 'damage_reduction':
        target.damageReduction = (target.damageReduction || 0) + (effect.value || 0);
        break;
      case 'attack_bonus':
        target.currentAttack = (target.currentAttack || target.card.attack || 0) + (effect.value || 0);
        break;
      case 'health_bonus':
        target.currentHealth = (target.currentHealth || target.card.health || 0) + (effect.value || 0);
        break;
      case 'immune':
        target.isImmune = true;
        break;
      case 'cant_be_targeted':
        target.hasElusive = true;
        break;
    }
  }
}

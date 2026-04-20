/**
 * GrantImmunity SpellEffect Handler
 * 
 * Implements the "grant_immunity" spellEffect effect.
 * Grants temporary immunity to the hero or minions.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeGrantImmunity(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:grant_immunity for ${sourceCard.name}`);
    
    const duration = effect.duration || 1;
    const targetType = effect.targetType || 'friendly_hero';
    const isHeroImmunity = targetType.includes('hero');
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const currentPlayer = context.currentPlayer as any;
    let immunitiesGranted = 0;
    
    if (isHeroImmunity) {
      currentPlayer.hero.isImmune = true;
      currentPlayer.hero.immunityDuration = duration;
      
      currentPlayer.temporaryEffects = currentPlayer.temporaryEffects || [];
      currentPlayer.temporaryEffects.push({
        type: 'immunity',
        target: 'hero',
        duration: duration,
        source: sourceCard.name
      });
      
      immunitiesGranted++;
      context.logGameEvent(`Hero is now immune for ${duration} turn(s)`);
    } else {
      const targets = context.getTargets(targetType, sourceCardInstance);
      
      targets.forEach(target => {
        if (target.card.type === 'minion') {
          const targetAny = target as any;
          targetAny.isImmune = true;
          targetAny.immunityDuration = duration;
          
          targetAny.temporaryEffects = targetAny.temporaryEffects || [];
          targetAny.temporaryEffects.push({
            type: 'immunity',
            duration: duration,
            source: sourceCard.name
          });
          
          immunitiesGranted++;
          context.logGameEvent(`${target.card.name} is now immune for ${duration} turn(s)`);
        }
      });
    }
    
    return { 
      success: true,
      additionalData: { immunitiesGranted, duration }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:grant_immunity:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:grant_immunity: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

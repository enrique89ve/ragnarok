/**
 * Death Coil Effect Handler
 * 
 * This handler implements the spellEffect:death_coil effect.
 * Deals damage to an enemy OR heals a friendly undead/character.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

export default function executeDeathCoil(
  context: GameContext, 
  effect: SpellEffect, 
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
    context.logGameEvent(`Executing spellEffect:death_coil for ${sourceCard.name}`);
    
    const damageValue = effect.value || 5;
    const healValue = effect.healValue || effect.value || 5;
    const targetType = effect.targetType || 'any';
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for death_coil`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    
    const isEnemy = context.opponentPlayer.board.includes(target) || 
                    target === context.opponentPlayer.hero;
    
    const isFriendly = context.currentPlayer.board.includes(target) || 
                       target === context.currentPlayer.hero;
    
    if (isEnemy) {
      context.dealDamage(target, damageValue);
      context.logGameEvent(`Death Coil dealt ${damageValue} damage to enemy ${target.card.name}`);
      
      return { 
        success: true,
        additionalData: {
          action: 'damage',
          value: damageValue,
          targetName: target.card.name
        }
      };
    } else if (isFriendly) {
      const isUndead = (target.card.race as string) === 'undead' ||
                       hasKeyword(target, 'undead');
      
      context.healTarget(target, healValue);
      context.logGameEvent(`Death Coil healed friendly ${target.card.name} for ${healValue}`);
      
      return { 
        success: true,
        additionalData: {
          action: 'heal',
          value: healValue,
          targetName: target.card.name,
          isUndead
        }
      };
    }
    
    return { 
      success: false, 
      error: 'Target is neither enemy nor friendly'
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:death_coil:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:death_coil: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

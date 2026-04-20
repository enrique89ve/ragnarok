/**
 * GrantStealth Battlecry Handler
 * 
 * Implements the "grant_stealth" battlecry effect.
 * Grants Stealth to target minion(s) for a duration.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a grant_stealth battlecry effect
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeGrantStealth(
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
    context.logGameEvent(`Executing battlecry:grant_stealth for ${sourceCard.name}`);
    
    const requiresTarget = effect.requiresTarget === true;
    const targetType = effect.targetType || 'friendly_minion';
    const duration = effect.duration || 'until_attack';
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (requiresTarget && targets.length === 0) {
      context.logGameEvent(`No valid targets for battlecry:grant_stealth`);
      return { success: false, error: 'No valid targets' };
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No targets available for grant_stealth effect`);
      return { success: true };
    }
    
    let stealthedCount = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        (target as any).hasStealth = true;
        (target as any).stealthDuration = duration;
        (target as any).stealthAppliedTurn = context.turnCount;
        
        addKeyword(target, 'stealth');
        
        stealthedCount++;
        
        let durationText = '';
        switch (duration) {
          case 'until_attack':
            durationText = 'until it attacks';
            break;
          case 'one_turn':
            durationText = 'for 1 turn';
            break;
          case 'permanent':
            durationText = 'permanently';
            break;
          default:
            if (typeof duration === 'number') {
              durationText = `for ${duration} turn(s)`;
            } else {
              durationText = 'until it attacks';
            }
        }
        
        context.logGameEvent(`${sourceCard.name} granted Stealth to ${target.card.name} ${durationText}`);
      }
    });
    
    return { 
      success: true, 
      additionalData: { 
        stealthedCount,
        duration
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:grant_stealth:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:grant_stealth: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

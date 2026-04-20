/**
 * GrantDeathrattle SpellEffect Handler
 * 
 * Implements the "grant_deathrattle" spellEffect effect.
 * Grants a deathrattle effect to target minions.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

export default function executeGrantDeathrattle(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:grant_deathrattle for ${sourceCard.name}`);
    
    const deathrattleEffect = effect.deathrattle || effect.grantedDeathrattle || {
      type: 'damage',
      value: effect.value || 2,
      targetType: 'random_enemy_minion'
    };
    const summonCardId = effect.summonCardId;
    const targetType = effect.targetType || 'friendly_minion';
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for grant_deathrattle effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    let deathrattlesGranted = 0;
    
    targets.forEach(target => {
      if (target.card.type === 'minion') {
        let finalDeathrattle = deathrattleEffect;
        
        if (summonCardId) {
          finalDeathrattle = {
            type: 'summon',
            summonCardId: summonCardId,
            value: effect.value || 1
          };
        }
        
        const targetAny = target as any;
        targetAny.grantedDeathrattles = targetAny.grantedDeathrattles || [];
        targetAny.grantedDeathrattles.push({
          source: sourceCard.name,
          effect: finalDeathrattle
        });
        
        addKeyword(target, 'deathrattle');
        
        deathrattlesGranted++;
        context.logGameEvent(`${target.card.name} gained Deathrattle from ${sourceCard.name}`);
      }
    });
    
    return { 
      success: true,
      additionalData: { deathrattlesGranted }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:grant_deathrattle:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:grant_deathrattle: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

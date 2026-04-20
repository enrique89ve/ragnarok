/**
 * KillAndSummon SpellEffect Handler
 * 
 * Implements the "kill_and_summon" spellEffect effect.
 * Destroys a minion and summons another in its place.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

export default function executeKillAndSummon(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:kill_and_summon for ${sourceCard.name}`);
    
    const summonCardId = effect.summonCardId;
    const summonCount = effect.value || effect.summonCount || 1;
    const targetType = effect.targetType || 'any_minion';
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const targets = context.getTargets(targetType, sourceCardInstance);
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for kill_and_summon effect`);
      return { success: false, error: 'No valid targets' };
    }
    
    const target = targets[0];
    let minionsKilled = 0;
    let minionsSummoned = 0;
    
    const contextAny = context as any;
    context.logGameEvent(`Destroying ${target.card.name}`);
    contextAny.destroyMinion(target);
    minionsKilled++;
    
    if (summonCardId) {
      for (let i = 0; i < summonCount; i++) {
        const boardSpace = context.currentPlayer.board.length;
        if (boardSpace < MAX_BATTLEFIELD_SIZE) {
          const summonedMinion = contextAny.summonMinion(summonCardId, context.currentPlayer);
          if (summonedMinion) {
            minionsSummoned++;
            context.logGameEvent(`Summoned minion from card ID ${summonCardId}`);
          }
        }
      }
    }
    
    return { 
      success: true,
      additionalData: { minionsKilled, minionsSummoned }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:kill_and_summon:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:kill_and_summon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

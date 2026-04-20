/**
 * TransformAll SpellEffect Handler
 * 
 * Implements the "transform_all" spellEffect effect.
 * Transforms all minions into a specified minion type.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeTransformAll(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:transform_all for ${sourceCard.name}`);
    
    const transformCardId = effect.summonCardId || effect.transformInto;
    const includeFriendly = effect.includeFriendly !== false;
    const includeEnemy = effect.includeEnemy !== false;
    
    if (!transformCardId) {
      context.logGameEvent(`No transform target specified`);
      return { success: false, error: 'No transform target specified' };
    }
    
    let transformedCount = 0;
    
    const transformMinion = (minion: any, player: any) => {
      const contextAny = context as any;
      const transformedCard = contextAny.getCardById ? contextAny.getCardById(transformCardId) : null;
      
      if (transformedCard) {
        const originalName = minion.card.name;
        
        minion.card = { ...transformedCard };
        minion.currentHealth = transformedCard.health || 1;
        minion.card.attack = transformedCard.attack || 1;
        
        delete minion.enchantments;
        delete minion.grantedDeathrattles;
        delete minion.temporaryEffects;
        minion.isSilenced = false;
        (minion as any).isFrozen = false;
        (minion as any).hasDivineShield = false;
        
        context.logGameEvent(`${originalName} transformed into ${transformedCard.name}`);
        transformedCount++;
      }
    };
    
    if (includeFriendly) {
      [...context.currentPlayer.board].forEach(minion => {
        transformMinion(minion, context.currentPlayer);
      });
    }
    
    if (includeEnemy) {
      [...context.opponentPlayer.board].forEach(minion => {
        transformMinion(minion, context.opponentPlayer);
      });
    }
    
    return { 
      success: true,
      additionalData: { 
        transformedCount,
        transformedInto: transformCardId
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:transform_all:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:transform_all: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * FreezeAndDraw SpellEffect Handler
 * 
 * Implements the "freeze_and_draw" spellEffect effect.
 * Freezes a target and draws cards.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_HAND_SIZE } from '../../../constants/gameConstants';

export default function executeFreezeAndDraw(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:freeze_and_draw for ${sourceCard.name}`);
    
    const drawCards = effect.drawCards || effect.value || 1;
    const targetType = effect.targetType || 'enemy_minion';
    const requiresTarget = effect.requiresTarget !== false;
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    let frozenCount = 0;
    
    if (requiresTarget) {
      const targets = context.getTargets(targetType, sourceCardInstance);
      
      if (targets.length === 0) {
        context.logGameEvent(`No valid targets for freeze_and_draw effect`);
        return { success: false, error: 'No valid targets' };
      }
      
      targets.forEach(target => {
        if (target.card.type === 'minion') {
          (target as any).isFrozen = true;
          frozenCount++;
          context.logGameEvent(`${target.card.name} is frozen`);
        }
      });
    }
    
    let cardsDrawn = 0;
    for (let i = 0; i < drawCards; i++) {
      if (context.currentPlayer.deck.length > 0 && context.currentPlayer.hand.length < MAX_HAND_SIZE) {
        context.drawCards(1);
        cardsDrawn++;
      }
    }
    
    context.logGameEvent(`Drew ${cardsDrawn} cards`);
    
    return { 
      success: true,
      additionalData: { frozenCount, cardsDrawn }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:freeze_and_draw:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:freeze_and_draw: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

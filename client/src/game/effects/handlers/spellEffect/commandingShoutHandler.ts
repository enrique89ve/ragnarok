/**
 * Commanding Shout Effect Handler
 * 
 * This handler implements the spellEffect:commanding_shout effect.
 * Prevents friendly minions from dropping below 1 health this turn.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeCommandingShout(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:commanding_shout for ${sourceCard.name}`);
    
    const drawCards = effect.drawCards || 0;
    const duration = effect.duration || 1;
    
    const friendlyMinions = context.getFriendlyMinions();
    
    friendlyMinions.forEach(minion => {
      (minion as any).cantDropBelowOne = true;
      (minion as any).cantDropBelowOneDuration = duration;
      context.logGameEvent(`${minion.card.name} can't be reduced below 1 health this turn`);
    });
    
    if (drawCards > 0) {
      context.drawCards(drawCards);
      context.logGameEvent(`Drew ${drawCards} card(s)`);
    }
    
    context.logGameEvent(`Commanding Shout: ${friendlyMinions.length} minions protected`);
    
    return { 
      success: true,
      additionalData: {
        protectedMinions: friendlyMinions.length,
        drawnCards: drawCards
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:commanding_shout:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:commanding_shout: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

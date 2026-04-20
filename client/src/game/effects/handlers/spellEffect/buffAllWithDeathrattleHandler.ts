/**
 * Buff All With Deathrattle Effect Handler
 * 
 * This handler implements the spellEffect:buff_all_with_deathrattle effect.
 * Buffs all minions that have a deathrattle effect.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

export default function executeBuffAllWithDeathrattle(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:buff_all_with_deathrattle for ${sourceCard.name}`);
    
    const buffAttack = effect.buffAttack || effect.value || 0;
    const buffHealth = effect.buffHealth || effect.value || 0;
    const friendlyOnly = effect.friendlyOnly !== false;
    
    let minions = friendlyOnly ? context.getFriendlyMinions() : context.getAllMinions();
    
    const deathrattleMinions = minions.filter(minion => {
      return minion.card.deathrattle !== undefined ||
             hasKeyword(minion, 'deathrattle');
    });
    
    if (deathrattleMinions.length === 0) {
      context.logGameEvent(`No minions with deathrattle to buff`);
      return { 
        success: true,
        additionalData: { buffedCount: 0 }
      };
    }
    
    deathrattleMinions.forEach(minion => {
      if (buffAttack > 0 && minion.card.attack !== undefined) {
        minion.card.attack += buffAttack;
      }
      
      if (buffHealth > 0) {
        if (minion.currentHealth !== undefined) {
          minion.currentHealth += buffHealth;
        }
        if (minion.card.health !== undefined) {
          minion.card.health += buffHealth;
        }
      }
      
      context.logGameEvent(`${minion.card.name} buffed by +${buffAttack}/+${buffHealth} (has deathrattle)`);
    });
    
    return { 
      success: true,
      additionalData: {
        buffedCount: deathrattleMinions.length,
        buffAttack,
        buffHealth
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:buff_all_with_deathrattle:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:buff_all_with_deathrattle: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

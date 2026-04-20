/**
 * AoE With On Kill Effect Handler
 * 
 * This handler implements the spellEffect:aoe_with_on_kill effect.
 * Deals AoE damage and provides a bonus effect when minions are killed.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeAoeWithOnKill(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:aoe_with_on_kill for ${sourceCard.name}`);
    
    const damageValue = effect.value || 1;
    const healValue = effect.healValue || 0;
    const drawOnKill = effect.drawOnKill || 0;
    const buffOnKill = effect.buffOnKill || 0;
    
    const enemyMinions = context.getEnemyMinions();
    let minionsKilled = 0;
    
    enemyMinions.forEach(target => {
      const previousHealth = target.currentHealth || target.card.health || 0;
      context.dealDamage(target, damageValue);
      
      if (target.currentHealth !== undefined && target.currentHealth <= 0 && previousHealth > 0) {
        minionsKilled++;
      }
    });
    
    context.logGameEvent(`AoE dealt ${damageValue} damage to ${enemyMinions.length} minions, killed ${minionsKilled}`);
    
    if (minionsKilled > 0) {
      if (healValue > 0) {
        const totalHeal = healValue * minionsKilled;
        context.healTarget(context.currentPlayer.hero, totalHeal);
        context.logGameEvent(`On kill: Healed hero for ${totalHeal}`);
      }
      
      if (drawOnKill > 0) {
        const cardsToDraw = drawOnKill * minionsKilled;
        context.drawCards(cardsToDraw);
        context.logGameEvent(`On kill: Drew ${cardsToDraw} cards`);
      }
      
      if (buffOnKill > 0) {
        const friendlyMinions = context.getFriendlyMinions();
        friendlyMinions.forEach(minion => {
          if (minion.card.attack !== undefined) {
            minion.card.attack += buffOnKill;
          }
          if (minion.currentHealth !== undefined) {
            minion.currentHealth += buffOnKill;
          }
        });
        context.logGameEvent(`On kill: Buffed friendly minions by +${buffOnKill}/+${buffOnKill}`);
      }
    }
    
    return { 
      success: true,
      additionalData: {
        minionsKilled,
        enemiesHit: enemyMinions.length
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:aoe_with_on_kill:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:aoe_with_on_kill: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

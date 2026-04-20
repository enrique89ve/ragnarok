/**
 * AoE Damage Effect Handler
 * 
 * This handler implements the spellEffect:aoe_damage effect.
 * Deals damage to all enemy minions (and optionally heroes).
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeAoeDamage(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:aoe_damage for ${sourceCard.name}`);
    
    const minVal = (effect as any).minValue;
    const maxVal = (effect as any).maxValue;
    const damageValue = (minVal !== undefined && maxVal !== undefined)
      ? Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal
      : (effect.value || 1);
    const includeHeroes = effect.includeHeroes || false;
    const includeFriendly = effect.includeFriendly || false;
    const freezeTarget = effect.freezeTarget || false;
    const healValue = effect.healValue || 0;
    
    let targets: any[] = [];
    
    if (includeFriendly) {
      targets = [...context.getAllMinions()];
      if (includeHeroes) {
        targets.push(context.currentPlayer.hero, context.opponentPlayer.hero);
      }
    } else {
      targets = [...context.getEnemyMinions()];
      if (includeHeroes) {
        targets.push(context.opponentPlayer.hero);
      }
    }
    
    let totalDamageDealt = 0;
    let minionsKilled = 0;
    
    targets.forEach(target => {
      const previousHealth = target.currentHealth || 0;
      context.dealDamage(target, damageValue);
      totalDamageDealt += damageValue;
      
      if (freezeTarget && target.card.type === 'minion') {
        (target as any).isFrozen = true;
        context.logGameEvent(`${target.card.name} is frozen`);
      }
      
      if (target.currentHealth !== undefined && target.currentHealth <= 0 && previousHealth > 0) {
        minionsKilled++;
      }
    });
    
    if (healValue > 0) {
      context.healTarget(context.currentPlayer.hero, healValue);
      context.logGameEvent(`Healed hero for ${healValue} from AoE effect`);
    }
    
    return { 
      success: true,
      additionalData: {
        targetsHit: targets.length,
        totalDamageDealt,
        minionsKilled
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:aoe_damage:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:aoe_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

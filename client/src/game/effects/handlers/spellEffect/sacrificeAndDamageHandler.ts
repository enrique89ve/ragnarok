/**
 * SacrificeAndDamage SpellEffect Handler
 * 
 * Implements the "sacrifice_and_damage" spellEffect effect.
 * Sacrifices a friendly minion and deals damage based on its stats.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, SpellEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

export default function executeSacrificeAndDamage(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing spellEffect:sacrifice_and_damage for ${sourceCard.name}`);
    
    const damageTarget = effect.damageTarget || 'enemy_character';
    const damageSourceStat = effect.damageSourceStat || 'attack';
    const sacrificeTargetType = effect.sacrificeTargetType || 'friendly_minion';
    
    const sourceCardInstance: any = {
      instanceId: 'temp-' + Date.now(),
      card: sourceCard,
      canAttack: false,
      isPlayed: true
    };
    
    const sacrificeTargets = context.getTargets(sacrificeTargetType, sourceCardInstance);
    
    if (sacrificeTargets.length === 0) {
      context.logGameEvent(`No valid targets to sacrifice`);
      return { success: false, error: 'No valid sacrifice target' };
    }
    
    const sacrificedMinion = sacrificeTargets[0];
    let damageValue = 0;
    
    if (damageSourceStat === 'attack') {
      damageValue = sacrificedMinion.card.attack || 0;
    } else if (damageSourceStat === 'health') {
      damageValue = sacrificedMinion.currentHealth || sacrificedMinion.card.health || 0;
    } else if (damageSourceStat === 'both') {
      damageValue = (sacrificedMinion.card.attack || 0) + (sacrificedMinion.currentHealth || sacrificedMinion.card.health || 0);
    }
    
    const contextAny = context as any;
    context.logGameEvent(`Sacrificing ${sacrificedMinion.card.name} (${damageSourceStat}: ${damageValue})`);
    contextAny.destroyMinion(sacrificedMinion);
    
    const damageTargets = context.getTargets(damageTarget, sourceCardInstance);
    let totalDamageDealt = 0;
    
    damageTargets.forEach(target => {
      contextAny.dealDamage(target, damageValue);
      totalDamageDealt += damageValue;
      context.logGameEvent(`Dealt ${damageValue} damage to ${target.card.name}`);
    });
    
    return { 
      success: true,
      additionalData: { 
        sacrificedMinion: sacrificedMinion.card.name,
        damageDealt: totalDamageDealt
      }
    };
  } catch (error) {
    debug.error(`Error executing spellEffect:sacrifice_and_damage:`, error);
    return { 
      success: false, 
      error: `Error executing spellEffect:sacrifice_and_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

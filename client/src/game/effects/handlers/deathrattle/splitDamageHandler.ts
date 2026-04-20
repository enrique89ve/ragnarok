/**
 * SplitDamage Deathrattle Handler
 * 
 * Implements the "split_damage" deathrattle effect.
 * Deals damage split randomly among enemy targets when the minion dies.
 * Example: Augmented Porcupine (deals attack damage split among enemies)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a split_damage deathrattle effect
 */
export default function executeSplitDamageSplitDamage(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const card = 'card' in sourceCard ? sourceCard.card : sourceCard;
    const cardName = card.name;
    
    context.logGameEvent(`Executing deathrattle:split_damage for ${cardName}`);
    
    const totalDamage = effect.value || effect.damage || card.attack || 1;
    const targetType = effect.targetType || 'enemy';
    
    let potentialTargets: CardInstance[] = [];
    
    switch (targetType) {
      case 'enemy':
      case 'enemies':
        potentialTargets = [context.opponentPlayer.hero, ...context.getEnemyMinions()];
        break;
      case 'enemy_minions':
        potentialTargets = context.getEnemyMinions();
        break;
      case 'friendly':
        potentialTargets = [context.currentPlayer.hero, ...context.getFriendlyMinions()];
        break;
      case 'all':
        potentialTargets = [
          context.currentPlayer.hero,
          context.opponentPlayer.hero,
          ...context.getAllMinions()
        ];
        break;
      default:
        potentialTargets = [context.opponentPlayer.hero, ...context.getEnemyMinions()];
    }
    
    if (potentialTargets.length === 0) {
      context.logGameEvent(`No valid targets for split_damage deathrattle`);
      return { success: true, additionalData: { totalDamage: 0, hits: 0 } };
    }
    
    const damageDistribution: Map<CardInstance, number> = new Map();
    
    for (let i = 0; i < totalDamage; i++) {
      const validTargets = potentialTargets.filter(target => {
        if (target.card.type === 'minion' && target.currentHealth !== undefined) {
          return target.currentHealth > 0;
        }
        if (target.card.type === 'hero') {
          if (target === context.currentPlayer.hero) {
            return context.currentPlayer.health > 0;
          } else {
            return context.opponentPlayer.health > 0;
          }
        }
        return true;
      });
      
      if (validTargets.length === 0) break;
      
      const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
      damageDistribution.set(randomTarget, (damageDistribution.get(randomTarget) || 0) + 1);
    }
    
    let totalHits = 0;
    damageDistribution.forEach((damage, target) => {
      context.dealDamage(target, damage);
      totalHits += damage;
      context.logGameEvent(`${cardName}'s deathrattle dealt ${damage} damage to ${target.card.name}`);
    });
    
    return {
      success: true,
      additionalData: { 
        totalDamage,
        hits: totalHits,
        targetsHit: damageDistribution.size
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:split_damage:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:split_damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

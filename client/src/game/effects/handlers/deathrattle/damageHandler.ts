/**
 * Damage Deathrattle Handler
 * 
 * Implements the "damage" deathrattle effect.
 * Deals damage to targets when the minion dies.
 * Example: Abomination (deals 2 damage to all characters)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a damage deathrattle effect
 */
export default function executeDamageDamage(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:damage for ${cardName}`);
    
    const damageAmount = effect.value || effect.damage || 1;
    const targetType = effect.targetType || 'all';
    
    let targets: CardInstance[] = [];
    
    switch (targetType) {
      case 'all':
        targets = [
          context.currentPlayer.hero,
          context.opponentPlayer.hero,
          ...context.getAllMinions()
        ];
        break;
      case 'all_minions':
        targets = context.getAllMinions();
        break;
      case 'enemy_minions':
        targets = context.getEnemyMinions();
        break;
      case 'friendly_minions':
        targets = context.getFriendlyMinions();
        break;
      case 'enemy_hero':
        targets = [context.opponentPlayer.hero];
        break;
      case 'friendly_hero':
        targets = [context.currentPlayer.hero];
        break;
      case 'random_enemy_minion':
        const enemies = context.getEnemyMinions();
        if (enemies.length > 0) {
          targets = [enemies[Math.floor(Math.random() * enemies.length)]];
        }
        break;
      case 'random_enemy':
        const enemyTargets = [context.opponentPlayer.hero, ...context.getEnemyMinions()];
        if (enemyTargets.length > 0) {
          targets = [enemyTargets[Math.floor(Math.random() * enemyTargets.length)]];
        }
        break;
      default:
        targets = context.getAllMinions();
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for damage deathrattle`);
      return { success: true, additionalData: { damagedCount: 0 } };
    }
    
    let damagedCount = 0;
    targets.forEach(target => {
      context.dealDamage(target, damageAmount);
      damagedCount++;
    });
    
    context.logGameEvent(`${cardName}'s deathrattle dealt ${damageAmount} damage to ${damagedCount} target(s)`);
    
    return {
      success: true,
      additionalData: { damagedCount, damageDealt: damageAmount }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:damage:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:damage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Heal Deathrattle Handler
 * 
 * Implements the "heal" deathrattle effect.
 * Heals targets when the minion dies.
 * Example: Zombie Chow (heals enemy hero for 5)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a heal deathrattle effect
 */
export default function executeHealHeal(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:heal for ${cardName}`);
    
    const healAmount = effect.value || effect.heal || 1;
    const targetType = effect.targetType || 'friendly_hero';
    
    let targets: CardInstance[] = [];
    
    switch (targetType) {
      case 'friendly_hero':
        targets = [context.currentPlayer.hero];
        break;
      case 'enemy_hero':
        targets = [context.opponentPlayer.hero];
        break;
      case 'all_friendly':
        targets = [context.currentPlayer.hero, ...context.getFriendlyMinions()];
        break;
      case 'all_enemy':
        targets = [context.opponentPlayer.hero, ...context.getEnemyMinions()];
        break;
      case 'friendly_minions':
        targets = context.getFriendlyMinions();
        break;
      case 'all_minions':
        targets = context.getAllMinions();
        break;
      case 'all':
        targets = [
          context.currentPlayer.hero,
          context.opponentPlayer.hero,
          ...context.getAllMinions()
        ];
        break;
      case 'random_friendly_minion':
        const friendly = context.getFriendlyMinions();
        if (friendly.length > 0) {
          targets = [friendly[Math.floor(Math.random() * friendly.length)]];
        }
        break;
      default:
        targets = [context.currentPlayer.hero];
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for heal deathrattle`);
      return { success: true, additionalData: { healedCount: 0 } };
    }
    
    let healedCount = 0;
    let totalHealed = 0;
    
    targets.forEach(target => {
      context.healTarget(target, healAmount);
      healedCount++;
      totalHealed += healAmount;
    });
    
    context.logGameEvent(`${cardName}'s deathrattle healed ${healedCount} target(s) for ${healAmount} each`);
    
    return {
      success: true,
      additionalData: { healedCount, totalHealed }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:heal:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:heal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Destroy Deathrattle Handler
 * 
 * Implements the "destroy" deathrattle effect.
 * Destroys other minions when this minion dies.
 * Example: Mecha'thun (destroys enemy hero if conditions met)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy deathrattle effect
 */
export default function executeDestroyDestroy(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:destroy for ${cardName}`);
    
    const targetType = effect.targetType || 'random_enemy_minion';
    
    if (effect.condition) {
      const conditionMet = checkDestroyCondition(context, effect.condition);
      if (!conditionMet) {
        context.logGameEvent(`Destroy condition not met for ${cardName}`);
        return { success: true, additionalData: { conditionMet: false } };
      }
    }
    
    let targets: CardInstance[] = [];
    
    switch (targetType) {
      case 'all_minions':
        targets = context.getAllMinions();
        break;
      case 'enemy_minions':
        targets = context.getEnemyMinions();
        break;
      case 'friendly_minions':
        targets = context.getFriendlyMinions();
        break;
      case 'random_enemy_minion':
        const enemies = context.getEnemyMinions();
        if (enemies.length > 0) {
          targets = [enemies[Math.floor(Math.random() * enemies.length)]];
        }
        break;
      case 'enemy_hero':
        context.opponentPlayer.health = 0;
        context.logGameEvent(`${cardName}'s deathrattle destroyed the enemy hero!`);
        return { success: true, additionalData: { destroyedHero: true } };
      case 'enemy_minions_3_or_less':
      case 'all_enemy_minions_low_attack': {
        const atkCap = effect.value || 3;
        targets = context.getEnemyMinions().filter(m => {
          const atk = m.currentAttack ?? (m.card as any).attack ?? 0;
          return atk <= atkCap;
        });
        break;
      }
      default:
        targets = [];
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for destroy deathrattle`);
      return { success: true, additionalData: { destroyedCount: 0 } };
    }
    
    let destroyedCount = 0;
    targets.forEach(target => {
      if (target.currentHealth !== undefined) {
        target.currentHealth = 0;
        context.logGameEvent(`${target.card.name} was destroyed by ${cardName}'s deathrattle`);
        destroyedCount++;
      }
    });
    
    return {
      success: true,
      additionalData: { destroyedCount }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:destroy:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:destroy: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function checkDestroyCondition(context: GameContext, condition: string): boolean {
  switch (condition) {
    case 'empty_hand':
      return context.currentPlayer.hand.length === 0;
    case 'empty_deck':
      return context.currentPlayer.deck.length === 0;
    case 'empty_board':
      return context.currentPlayer.board.length === 0;
    case 'mecha_thun':
      return context.currentPlayer.hand.length === 0 && 
             context.currentPlayer.deck.length === 0;
    default:
      return true;
  }
}

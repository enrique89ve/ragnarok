/**
 * Buff Deathrattle Handler
 * 
 * Implements the "buff" deathrattle effect.
 * Buffs other minions when this minion dies.
 * Example: Spawn of Hyrrokkin (gives all friendly minions +1/+1)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { CardData, CardInstance, DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { addKeyword } from '../../../utils/cards/keywordUtils';

/**
 * Execute a buff deathrattle effect
 */
export default function executeBuffBuff(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: CardData | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:buff for ${cardName}`);
    
    const attackBuff = effect.buffAttack || effect.attack || 0;
    const healthBuff = effect.buffHealth || effect.health || 0;
    const targetType = effect.targetType || 'friendly_minion';
    
    let targets: CardInstance[] = [];
    
    switch (targetType) {
      case 'friendly_minion':
      case 'friendly_minions':
        targets = context.getFriendlyMinions() as any;
        break;
      case 'enemy_minion':
      case 'enemy_minions':
        targets = context.getEnemyMinions() as any;
        break;
      case 'all_minions':
      case 'any_minion':
        targets = context.getAllMinions() as any;
        break;
      case 'random_friendly_minion':
        const friendly = context.getFriendlyMinions();
        if (friendly.length > 0) {
          targets = [friendly[Math.floor(Math.random() * friendly.length)] as any];
        }
        break;
      case 'random_enemy_minion':
        const enemies = context.getEnemyMinions();
        if (enemies.length > 0) {
          targets = [enemies[Math.floor(Math.random() * enemies.length)] as any];
        }
        break;
      default:
        targets = context.getFriendlyMinions() as any;
    }
    
    if (targets.length === 0) {
      context.logGameEvent(`No valid targets for buff deathrattle`);
      return { success: true, additionalData: { buffedCount: 0 } };
    }
    
    let buffedCount = 0;
    targets.forEach(target => {
      if ('attack' in target.card && target.card.attack !== undefined) {
        (target.card as any).attack = target.card.attack + attackBuff;
      }
      if (target.currentHealth !== undefined && 'health' in target.card && target.card.health !== undefined) {
        target.currentHealth += healthBuff;
        (target.card as any).health = target.card.health + healthBuff;
      }
      
      if (effect.grantKeywords && Array.isArray(effect.grantKeywords)) {
        effect.grantKeywords.forEach((keyword: string) => {
          addKeyword(target, keyword);
          if (keyword === 'taunt') (target as any).isTaunt = true;
          if (keyword === 'divine_shield') target.hasDivineShield = true;
          if (keyword === 'rush') (target as any).hasRush = true;
        });
      }
      
      buffedCount++;
      context.logGameEvent(`${target.card.name} received +${attackBuff}/+${healthBuff} buff from ${cardName}`);
    });
    
    return {
      success: true,
      additionalData: { buffedCount, attackBuff, healthBuff }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:buff:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:buff: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

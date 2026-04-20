/**
 * SummonCopy Battlecry Handler
 * 
 * Implements the "summon_copy" battlecry effect.
 * Summons a copy of the source card (itself) or a target minion.
 * Example card: Twin Emperor Vek'lor (ID: 20120)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import { v4 as uuidv4 } from 'uuid';
import { hasKeyword } from '../../../utils/cards/keywordUtils';


/**
 * Check if a condition is met for the summon copy effect
 */
function checkCondition(context: GameContext, condition: string | undefined, sourceCard: Card): boolean {
  if (!condition) return true;
  
  switch (condition) {
    case 'has_cthun':
    case 'cthun_10_attack':
      return true;
    case 'has_taunt':
      return context.currentPlayer.board.some(m => hasKeyword(m, 'taunt'));
    case 'has_divine_shield':
      return context.currentPlayer.board.some(m => m.hasDivineShield);
    case 'holding_dragon':
      return context.currentPlayer.hand.some(c => ((c.card as any).race || '').toLowerCase() === 'dragon');
    case 'combo':
      return (context.currentPlayer.cardsPlayedThisTurn || 0) > 0;
    default:
      return true;
  }
}

/**
 * Execute a summon_copy battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSummonCopy(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing summon_copy battlecry for ${sourceCard.name}`);
    
    const condition = effect.condition as string | undefined;
    const copyTarget = effect.copyTarget as string | undefined;
    const count = effect.count || 1;
    
    const currentBoardSize = context.currentPlayer.board.length;
    const availableSlots = MAX_BATTLEFIELD_SIZE - currentBoardSize;
    
    if (availableSlots <= 0) {
      context.logGameEvent(`Board is full, cannot summon copy`);
      return { success: true, additionalData: { summonedCount: 0 } };
    }
    
    if (!checkCondition(context, condition, sourceCard)) {
      context.logGameEvent(`Condition "${condition}" not met, copy not summoned`);
      return { success: true, additionalData: { conditionNotMet: true, summonedCount: 0 } };
    }
    
    const actualCount = Math.min(count, availableSlots);
    const summonedMinions: CardInstance[] = [];
    
    let cardToCopy: Card = sourceCard;
    
    if (copyTarget === 'target' && effect.targetMinion) {
      cardToCopy = (effect.targetMinion as CardInstance).card;
    } else if (copyTarget === 'random_friendly') {
      const friendlyMinions = context.getFriendlyMinions();
      if (friendlyMinions.length > 0) {
        const randomMinion = friendlyMinions[Math.floor(Math.random() * friendlyMinions.length)];
        cardToCopy = randomMinion.card;
      }
    } else if (copyTarget === 'random_enemy') {
      const enemyMinions = context.getEnemyMinions();
      if (enemyMinions.length > 0) {
        const randomMinion = enemyMinions[Math.floor(Math.random() * enemyMinions.length)];
        cardToCopy = randomMinion.card;
      }
    }
    
    for (let i = 0; i < actualCount; i++) {
      const copyInstance: CardInstance = {
        instanceId: uuidv4(),
        card: { ...cardToCopy },
        currentHealth: cardToCopy.health || 1,
        currentAttack: cardToCopy.attack || 1,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0,
        hasDivineShield: cardToCopy.keywords?.includes('divine_shield'),
        hasLifesteal: cardToCopy.keywords?.includes('lifesteal'),
        isPoisonous: cardToCopy.keywords?.includes('poisonous')
      };
      
      context.currentPlayer.board.push(copyInstance);
      summonedMinions.push(copyInstance);
      
      context.logGameEvent(`Summoned copy of ${cardToCopy.name} (${cardToCopy.attack}/${cardToCopy.health})`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        summonedCount: summonedMinions.length,
        summonedMinions 
      } 
    };
  } catch (error) {
    debug.error(`Error executing summon_copy:`, error);
    return { 
      success: false, 
      error: `Error executing summon_copy: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Summon Deathrattle Handler
 * 
 * Implements the "summon" deathrattle effect.
 * Summons specific minions when this minion dies.
 * Example: Savannah Highmane (summons two 2/2 Hyenas)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance as CardInstanceType } from '../../../types/CardTypes';
import { CardInstance, DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getHealth } from '../../../utils/cards/typeGuards';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a summon deathrattle effect
 */
export default function executeSummonSummon(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: Card | CardInstanceType
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:summon for ${cardName}`);
    
    const summonCardId = effect.summonCardId || effect.cardId || effect.summonId;
    const summonCount = effect.summonCount || effect.count || effect.value || 1;
    const summonForOpponent = effect.summonForOpponent || false;
    
    if (!summonCardId) {
      return { success: false, error: 'No summonCardId specified for summon effect' };
    }
    
    const cardToSummon = getCardById(Number(summonCardId));
    if (!cardToSummon) {
      return { success: false, error: `Card with ID ${summonCardId} not found` };
    }
    
    if (!isMinion(cardToSummon)) {
      return { success: false, error: `Card with ID ${summonCardId} is not a minion` };
    }
    
    const board = summonForOpponent ? context.opponentPlayer.board : context.currentPlayer.board;
    const summonedMinions: CardInstance[] = [];
    
    for (let i = 0; i < summonCount; i++) {
      if (board.length >= MAX_BATTLEFIELD_SIZE) {
        context.logGameEvent(`Board is full, cannot summon more minions`);
        break;
      }
      
      const minionHealth = getHealth(cardToSummon);
      const newMinion: any = {
        instanceId: uuidv4(),
        card: cardToSummon,
        currentHealth: minionHealth,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      if (cardToSummon.keywords?.includes('taunt')) {
        newMinion.isTaunt = true;
      }
      if (cardToSummon.keywords?.includes('divine_shield')) {
        newMinion.hasDivineShield = true;
      }
      if (cardToSummon.keywords?.includes('rush')) {
        newMinion.hasRush = true;
        newMinion.canAttack = true;
      }
      if (cardToSummon.keywords?.includes('charge')) {
        newMinion.hasCharge = true;
        newMinion.canAttack = true;
        newMinion.isSummoningSick = false;
      }
      
      board.push(newMinion as CardInstanceType);
      summonedMinions.push(newMinion);
      context.logGameEvent(`Summoned ${cardToSummon.name} from ${cardName}'s deathrattle`);
    }
    
    return {
      success: true,
      additionalData: { 
        summonedCount: summonedMinions.length,
        summonedMinions
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:summon:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:summon: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

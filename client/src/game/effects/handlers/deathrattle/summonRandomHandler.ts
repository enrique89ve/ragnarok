/**
 * SummonRandom Deathrattle Handler
 * 
 * Implements the "summon_random" deathrattle effect.
 * Summons a random minion matching certain criteria when this minion dies.
 * Example: Piloted Shredder (summons random 2-cost minion)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { CardData, CardInstance, DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getCardsByPredicate, getAllCards } from '../../../data/cardManagement/cardRegistry';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a summon_random deathrattle effect
 */
export default function executeSummonRandomSummonRandom(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: CardData | CardInstance
): EffectResult {
  try {
    const cardName = 'card' in sourceCard ? sourceCard.card.name : sourceCard.name;
    context.logGameEvent(`Executing deathrattle:summon_random for ${cardName}`);
    
    if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
      context.logGameEvent(`Board is full, cannot summon minion`);
      return { success: false, error: 'Board is full' };
    }
    
    const specificManaCost = effect.specificManaCost;
    const maxManaCost = effect.maxManaCost;
    const minManaCost = effect.minManaCost;
    const specificRace = effect.specificRace;
    const count = effect.count || effect.value || 1;
    
    let eligibleMinions = getCardsByPredicate((card) => {
      if (card.type !== 'minion') return false;
      if (!card.collectible) return false;
      
      if (specificManaCost !== undefined && card.manaCost !== specificManaCost) return false;
      if (maxManaCost !== undefined && (card.manaCost || 0) > maxManaCost) return false;
      if (minManaCost !== undefined && (card.manaCost || 0) < minManaCost) return false;
      if (specificRace && card.race !== specificRace) return false;
      
      return true;
    });
    
    if (eligibleMinions.length === 0) {
      eligibleMinions = getAllCards().filter(c => c.type === 'minion' && c.collectible);
    }
    
    if (eligibleMinions.length === 0) {
      context.logGameEvent(`No eligible minions found for summon_random`);
      return { success: true, additionalData: { summonedCount: 0 } };
    }
    
    const summonedMinions: CardInstance[] = [];
    
    for (let i = 0; i < count; i++) {
      if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
        context.logGameEvent(`Board is full, cannot summon more minions`);
        break;
      }
      
      const randomIndex = Math.floor(Math.random() * eligibleMinions.length);
      const selectedCard = eligibleMinions[randomIndex];
      
      const newMinion: CardInstance = {
        instanceId: uuidv4(),
        card: { ...selectedCard },
        currentHealth: 'health' in selectedCard ? (selectedCard.health ?? 0) : 0,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      if (selectedCard.keywords?.includes('taunt')) {
        (newMinion as any).isTaunt = true;
      }
      if (selectedCard.keywords?.includes('divine_shield')) {
        newMinion.hasDivineShield = true;
      }
      if (selectedCard.keywords?.includes('rush')) {
        (newMinion as any).hasRush = true;
        newMinion.canAttack = true;
      }
      if (selectedCard.keywords?.includes('charge')) {
        (newMinion as any).hasCharge = true;
        newMinion.canAttack = true;
        newMinion.isSummoningSick = false;
      }
      
      context.currentPlayer.board.push(newMinion as any);
      summonedMinions.push(newMinion);
      context.logGameEvent(`Summoned random minion ${selectedCard.name} from ${cardName}'s deathrattle`);
    }
    
    return {
      success: true,
      additionalData: { 
        summonedCount: summonedMinions.length,
        summonedMinions
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:summon_random:`, error);
    return {
      success: false,
      error: `Error executing deathrattle:summon_random: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

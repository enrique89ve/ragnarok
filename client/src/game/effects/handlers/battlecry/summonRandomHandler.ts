/**
 * SummonRandom Battlecry Handler
 * 
 * Implements the "summon_random" battlecry effect.
 * Summons random minion(s) from a specified pool or criteria.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import cardDatabase from '../../../services/cardDatabase';
import { v4 as uuidv4 } from 'uuid';


/**
 * Execute a summon_random battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeSummonRandom(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing summon_random battlecry for ${sourceCard.name}`);
    
    const count = effect.value || effect.count || 1;
    const pool = effect.pool as string[] | number[] | undefined;
    const manaCost = effect.manaCost as number | undefined;
    const race = effect.race as string | undefined;
    
    const currentBoardSize = context.currentPlayer.board.length;
    const availableSlots = MAX_BATTLEFIELD_SIZE - currentBoardSize;
    
    if (availableSlots <= 0) {
      context.logGameEvent(`Board is full, cannot summon any minions`);
      return { success: true, additionalData: { summonedCount: 0 } };
    }
    
    const actualCount = Math.min(count, availableSlots);
    let candidateCards: any[] = [];
    
    if (pool && pool.length > 0) {
      candidateCards = pool
        .map(id => cardDatabase.getCardById(id))
        .filter(card => card && card.type === 'minion');
    } else {
      let allMinions = cardDatabase.getCardsByType('minion');
      
      if (manaCost !== undefined) {
        allMinions = allMinions.filter(card => card.manaCost === manaCost);
      }
      
      if (race) {
        allMinions = allMinions.filter(card => ((card as any).race || '').toLowerCase() === race.toLowerCase());
      }
      
      candidateCards = allMinions;
    }
    
    if (candidateCards.length === 0) {
      context.logGameEvent(`No valid minions found to summon`);
      return { success: false, error: 'No valid minions found in pool' };
    }
    
    const summonedMinions: CardInstance[] = [];
    
    for (let i = 0; i < actualCount; i++) {
      const randomIndex = Math.floor(Math.random() * candidateCards.length);
      const selectedCard = candidateCards[randomIndex];
      
      const minionInstance: CardInstance = {
        instanceId: uuidv4(),
        card: {
          id: selectedCard.id,
          name: selectedCard.name,
          description: selectedCard.description || '',
          manaCost: selectedCard.manaCost || 0,
          type: 'minion',
          rarity: selectedCard.rarity || 'common',
          heroClass: selectedCard.heroClass || selectedCard.class || 'neutral',
          attack: selectedCard.attack || 1,
          health: selectedCard.health || 1,
          keywords: selectedCard.keywords || []
        },
        currentHealth: selectedCard.health || 1,
        currentAttack: selectedCard.attack || 1,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      context.currentPlayer.board.push(minionInstance);
      summonedMinions.push(minionInstance);
      
      context.logGameEvent(`Summoned ${selectedCard.name} (${selectedCard.attack}/${selectedCard.health})`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        summonedCount: summonedMinions.length,
        summonedMinions 
      } 
    };
  } catch (error) {
    debug.error(`Error executing summon_random:`, error);
    return { 
      success: false, 
      error: `Error executing summon_random: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

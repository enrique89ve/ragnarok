/**
 * Buff From Graveyard Count Battlecry Handler
 * 
 * This handler buffs a minion based on the count of minions in the graveyard,
 * particularly focusing on counting minions of a specific race.
 * Used by Necromancer cards like Bone Collector.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card } from '../../../types/CardTypes';
import { BattlecryEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { countGraveyardByRace, getGraveyard } from '../../../data/cardManagement/graveyardTracker';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';

/**
 * Execute a battlecry that buffs a minion based on graveyard counts
 */
function executeBuffFromGraveyardCountBuffFromGraveyardCount(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  // Get the value to buff per minion
  const buffPerMinion = effect.value || 1;
  
  // Check if we should count a specific race
  let minionCount = 0;
  
  if (effect.condition && typeof effect.condition === 'object') {
    if (effect.condition.check === 'graveyard_count' && effect.condition.race) {
      // Count minions of a specific race
      minionCount = countGraveyardByRace(effect.condition.race);
    } else {
      // Count all minions in graveyard
      minionCount = getGraveyard().length;
    }
    
    // Check if we meet the minimum requirement
    if (effect.condition.minimum && minionCount < effect.condition.minimum) {
      return { success: true, additionalData: { message: `No buff applied - not enough minions in graveyard` } };
    }
  } else {
    // Default to count all minions
    minionCount = getGraveyard().length;
  }
  
  // Calculate total buff amount
  const totalBuff = minionCount * buffPerMinion;
  
  if (totalBuff <= 0) {
    return { success: true, additionalData: { message: `No buff applied - empty graveyard` } };
  }
  
  // Apply the buff to the source card
  try {
    // For client-side rendering, just update the card in place
    if (sourceCard && isMinion(sourceCard)) {
      sourceCard.attack = getAttack(sourceCard) + totalBuff;
      sourceCard.health = getHealth(sourceCard) + totalBuff;
    }
    
    return { 
      success: true, 
      additionalData: { message: `Buffed by +${totalBuff}/+${totalBuff} based on ${minionCount} minions in graveyard` }
    };
  } catch (error) {
    debug.error('Error in buff_from_graveyard_count effect:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export default executeBuffFromGraveyardCountBuffFromGraveyardCount;
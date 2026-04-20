/**
 * Summon Skeletons Based On Graveyard Battlecry Handler
 * 
 * This handler summons skeleton minions based on the number of minions in the graveyard.
 * Used by Necromancer cards like Skeletal Lord.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card } from '../../../types/CardTypes';
import { BattlecryEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getGraveyard } from '../../../data/cardManagement/graveyardTracker';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a battlecry that summons skeletons based on graveyard size
 */
function executeSummonSkeletonsBasedOnGraveyardSummonSkeletonsBasedOnGraveyard(
  context: GameContext, 
  effect: BattlecryEffect, 
  sourceCard: Card
): EffectResult {
  // Get the number of minions in the graveyard
  const graveyardSize = getGraveyard().length;
  
  // Maximum number of skeletons to summon
  const maxSkeletons = effect.value || 3;
  
  // Calculate how many skeletons to summon (limited by board space and max)
  const skeletonsToSummon = Math.min(
    graveyardSize,
    maxSkeletons,
    // Also limit by available board space
    MAX_BATTLEFIELD_SIZE - (context.currentPlayer.board?.length || 0)
  );
  
  if (skeletonsToSummon <= 0) {
    return { 
      success: true
    };
  }
  
  try {
    // Get the skeleton card to summon
    const skeletonId = effect.summonCardId || 4900; // Default to the standard Skeleton token
    const skeletonCard = getCardById(skeletonId);
    
    if (!skeletonCard) {
      debug.error(`Skeleton card with ID ${skeletonId} not found`);
      return { 
        success: false, 
        error: `Skeleton card with ID ${skeletonId} not found` 
      };
    }
    
    // Ensure the skeleton card is a minion using type guard
    if (!isMinion(skeletonCard)) {
      debug.error(`Skeleton card with ID ${skeletonId} is not a minion`);
      return { 
        success: false, 
        error: `Skeleton card with ID ${skeletonId} is not a minion` 
      };
    }
    
    // Summon the skeletons by creating CardInstance objects and adding to the board
    for (let i = 0; i < skeletonsToSummon; i++) {
      // Create a summoned minion instance
      const summonedInstance: any = {
        instanceId: `skeleton-${Date.now()}-${i}`,
        card: skeletonCard,
        currentHealth: getHealth(skeletonCard),
        canAttack: false, // Summoning sickness
        isPlayed: false,
        isSummoningSick: true,
        attacksPerformed: 0
      };
      
      // Add the minion to the board
      context.currentPlayer.board.push(summonedInstance);
      
      context.logGameEvent(`Summoned Skeleton (${skeletonId}) at position ${context.currentPlayer.board.length - 1}`);
    }
    
    return { 
      success: true
    };
  } catch (error) {
    debug.error('Error in summon_skeletons_based_on_graveyard effect:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export default executeSummonSkeletonsBasedOnGraveyardSummonSkeletonsBasedOnGraveyard;
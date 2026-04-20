/**
 * Summon From Graveyard Spell Effect Handler
 * 
 * This handler summons a random minion from the graveyard.
 * Used by Necromancer cards like Raise Dead.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card } from '../../../types/CardTypes';
import { SpellEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getGraveyard, getRandomGraveyardMinion } from '../../../data/cardManagement/graveyardTracker';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a spell effect that summons a random minion from the graveyard
 */
function executeSummonFromGraveyardSummonFromGraveyard(
  context: GameContext, 
  effect: SpellEffect, 
  sourceCard: Card
): EffectResult {
  // Check if graveyard is empty
  if (getGraveyard().length === 0) {
    return { 
      success: false, 
      error: 'The graveyard is empty - no minions have died yet' 
    };
  }
  
  try {
    // Get a random minion from the graveyard
    const randomMinion = getRandomGraveyardMinion();
    
    if (!randomMinion) {
      return { 
        success: false, 
        error: 'No valid minion found in graveyard' 
      };
    }
    
    // Get the card by ID
    const cardToSummon = getCardById(randomMinion.id);
    
    if (!cardToSummon) {
      return { 
        success: false, 
        error: `Card with ID ${randomMinion.id} not found in registry` 
      };
    }
    
    // Check if there's space on the board
    if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) {
      return { 
        success: false, 
        error: 'No board space available to summon minion' 
      };
    }
    
    // Verify the card is a minion before summoning
    if (!isMinion(cardToSummon)) {
      return { 
        success: false, 
        error: `Card ${cardToSummon.name} is not a minion and cannot be summoned` 
      };
    }
    
    // Create a card instance for summoning
    const summonedInstance = {
      instanceId: `graveyard-${Date.now()}`,
      card: cardToSummon as any,
      currentHealth: getHealth(cardToSummon),
      canAttack: false,
      isPlayed: true,
      isSummoningSick: true,
      attacksPerformed: 0
    };
    
    // Add the minion to the board
    context.currentPlayer.board.push(summonedInstance as any);
    context.logGameEvent(`Summoned ${cardToSummon.name} from graveyard`);
    
    return { 
      success: true, 
      additionalData: { summonedCard: cardToSummon.name } 
    };
  } catch (error) {
    debug.error('Error in summon_from_graveyard effect:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export default executeSummonFromGraveyardSummonFromGraveyard;
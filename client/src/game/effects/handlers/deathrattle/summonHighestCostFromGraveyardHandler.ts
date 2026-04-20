/**
 * Summon Highest Cost From Graveyard Deathrattle Handler
 * 
 * This handler finds the highest mana cost minion in the graveyard and summons it.
 * Used by Necromancer cards like Grave Pact.
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance } from '../../../types/CardTypes';
import { DeathrattleEffect } from '../../../types';
import { EffectResult } from '../../../types/EffectTypes';
import { getGraveyard, GraveyardMinion } from '../../../data/cardManagement/graveyardTracker';
import { getCardById } from '../../../data/cardManagement/cardRegistry';
import { isMinion, getAttack, getHealth } from '../../../utils/cards/typeGuards';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a deathrattle that summons the highest cost minion from the graveyard
 */
export default function executeSummonHighestCostFromGraveyardSummonHighestCostFromGraveyard(
  context: GameContext, 
  effect: DeathrattleEffect, 
  sourceCard: CardInstance
): EffectResult {
  // Get all minions from the graveyard
  const graveyard = getGraveyard();
  
  // Check if graveyard is empty
  if (graveyard.length === 0) {
    context.logGameEvent('No minion summoned - graveyard is empty');
    return { 
      success: true, 
      additionalData: { summoned: false }
    };
  }
  
  try {
    // Find the highest cost minion in the graveyard
    let highestCostMinion: GraveyardMinion | null = null;
    
    for (const minion of graveyard) {
      // Skip any non-minion cards in the graveyard
      if (minion.type !== 'minion') continue;
      
      // Update highest cost minion
      if (!highestCostMinion || minion.manaCost > highestCostMinion.manaCost) {
        highestCostMinion = minion;
      }
      // If tied for highest cost, prefer the one with better stats (attack + health)
      else if (minion.manaCost === highestCostMinion.manaCost) {
        const currentStats = highestCostMinion.attack + highestCostMinion.health;
        const newStats = minion.attack + minion.health;
        
        if (newStats > currentStats) {
          highestCostMinion = minion;
        }
      }
    }
    
    // If we found a minion, summon it
    if (highestCostMinion) {
      // Get the card by ID
      const cardToSummon = getCardById(highestCostMinion.id);
      
      if (cardToSummon) {
        // Check if there's space on the board
        const board = context.currentPlayer.board;
        
        if (board.length >= MAX_BATTLEFIELD_SIZE) {
          context.logGameEvent(`Cannot summon ${highestCostMinion.name} - board is full`);
          return { 
            success: false, 
            error: 'No board space available to summon minion' 
          };
        }
        
        // Create a minion instance for the summoned card
        const newMinionInstance: CardInstance = {
          instanceId: uuidv4(),
          card: cardToSummon as Card,
          currentHealth: getHealth(cardToSummon),
          canAttack: false,
          isPlayed: true,
          isSummoningSick: true,
          attacksPerformed: 0,
          hasDivineShield: false,
          isPoisonous: false,
          hasLifesteal: false,
          isRush: false,
          isMagnetic: false,
          mechAttachments: []
        };
        
        // Add the minion to the board
        board.push(newMinionInstance);
        
        context.logGameEvent(`Summoned ${highestCostMinion.name} (${highestCostMinion.manaCost} mana) from graveyard`);
        
        return { 
          success: true, 
          additionalData: { summonedMinion: newMinionInstance }
        };
      } else {
        context.logGameEvent(`Card with ID ${highestCostMinion.id} not found in registry`);
        return { 
          success: false, 
          error: `Card with ID ${highestCostMinion.id} not found in registry` 
        };
      }
    } else {
      context.logGameEvent('No valid minion found in graveyard');
      return { 
        success: true, 
        additionalData: { summoned: false }
      };
    }
  } catch (error) {
    debug.error('Error in summon_highest_cost_from_graveyard effect:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
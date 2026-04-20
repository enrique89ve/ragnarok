/**
 * Summon With Stats Deathrattle Handler
 * 
 * Implements the "summon_with_stats" deathrattle effect.
 * Example: Scrapyard Colossus (summons a 4/5 elemental with Taunt)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, CardInstance, DeathrattleEffect } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { v4 as uuidv4 } from 'uuid';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';

/**
 * Execute a summon_with_stats deathrattle effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns Effect result with success/failure status
 */
export default function executeSummonWithStatsSummonWithStats(
  context: GameContext,
  effect: DeathrattleEffect,
  sourceCard: CardInstance
): EffectResult {
  try {
    // Log the effect execution
    context.logGameEvent(`Executing deathrattle:summon_with_stats for ${sourceCard.card.name}`);
    
    // Extract effect parameters
    const minionName = effect.minionName || 'Scrap Golem';
    const attack = effect.attack || 4;
    const health = effect.health || 5;
    const stats = effect.stats || { attack, health };
    
    // Determine where the minion should be summoned
    const position = effect.position || 'same';
    
    // Check if it's a colossal minion part that should not spawn anything
    if (effect.skipSummon) {
      return { success: true };
    }
    
    // Create the new minion
    const newMinionCard: Card = {
      id: effect.minionId || 90100,
      name: minionName,
      type: 'minion',
      manaCost: 0,
      attack: stats.attack,
      health: stats.health,
      rarity: 'common',
      heroClass: 'neutral',
      keywords: effect.keywords || ['taunt'],
      description: effect.description || 'Taunt',
      collectible: false
    };
    
    // Create a minion instance
    const newMinionInstance: CardInstance = {
      instanceId: uuidv4(),
      card: newMinionCard,
      currentHealth: newMinionCard.health,
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
    
    // Get the position where the minion died
    const controller = (sourceCard as any).controller || 'player';
    const board = controller === 'player' ? context.currentPlayer.board : context.opponentPlayer.board;
    const diedPosition = board.findIndex(minion => minion.instanceId === sourceCard.instanceId);
    
    // Calculate position to place the new minion
    let placePosition = 0;
    
    if (position === 'same' && diedPosition !== -1) {
      // Place it at the same position as the card that died
      placePosition = diedPosition;
    } else if (position === 'end') {
      // Place it at the end of the board
      placePosition = board.length;
    } else if (position === 'start') {
      // Place it at the start of the board
      placePosition = 0;
    } else {
      // Default to the end of the board
      placePosition = board.length;
    }
    
    // Don't summon if the board is full
    if (board.length >= MAX_BATTLEFIELD_SIZE) {
      context.logGameEvent(`Cannot summon ${minionName} - board is full`);
      return { 
        success: false, 
        error: 'Board is full'
      };
    }
    
    // Store controller information (adding custom property via any type assertion)
    (newMinionInstance as any).controller = (sourceCard as any).controller;
    
    // Add the minion to the board
    board.splice(placePosition, 0, newMinionInstance);
    
    context.logGameEvent(`Summoned ${minionName} (${stats.attack}/${stats.health}) from deathrattle of ${sourceCard.card.name}`);
    
    return {
      success: true,
      additionalData: {
        summonedMinion: newMinionInstance,
        position: placePosition
      }
    };
  } catch (error) {
    debug.error(`Error executing deathrattle:summon_with_stats:`, error);
    return { 
      success: false, 
      error: `Error executing deathrattle:summon_with_stats: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
/**
 * DestroyTribe Battlecry Handler
 * 
 * Implements the "destroy_tribe" battlecry effect.
 * Destroys a minion of a specific tribe and optionally buffs the source minion.
 * Example card: Hungry Crab (ID: 31010) - destroys a Murloc, gains +2/+2
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_tribe battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data (effect.tribe is the tribe to target)
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyTribe(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_tribe for ${sourceCard.name}`);
    
    const targetTribe = (effect.tribe || '').toLowerCase();
    
    if (!targetTribe) {
      context.logGameEvent(`No tribe specified for destroy_tribe effect`);
      return { success: false, error: 'No tribe specified' };
    }
    
    const allMinions = context.getAllMinions();
    const tribeMinions = allMinions.filter(m => {
      const race = (m.card.race || '').toLowerCase();
      return race === targetTribe || race === 'all';
    });
    
    if (tribeMinions.length === 0) {
      context.logGameEvent(`No ${targetTribe} minions found to destroy`);
      return { success: true, additionalData: { minionsDestroyed: 0 } };
    }
    
    const targetMinion = effect.requiresTarget 
      ? tribeMinions[0]
      : tribeMinions[Math.floor(Math.random() * tribeMinions.length)];
    
    const isFriendly = context.getFriendlyMinions().includes(targetMinion);
    const board = isFriendly 
      ? context.currentPlayer.board 
      : context.opponentPlayer.board;
    
    const index = board.indexOf(targetMinion);
    if (index !== -1) {
      board.splice(index, 1);
      
      const graveyard = isFriendly 
        ? context.currentPlayer.graveyard 
        : context.opponentPlayer.graveyard;
      graveyard.push(targetMinion);
      
      context.logGameEvent(`${sourceCard.name} destroyed ${targetMinion.card.name} (${targetTribe})`);
      
      if (effect.attack !== undefined || effect.health !== undefined) {
        const sourceInstance = context.getFriendlyMinions().find(m => m.card.id === sourceCard.id);
        if (sourceInstance) {
          const attackBuff = effect.attack || 0;
          const healthBuff = effect.health || 0;
          
          if (sourceInstance.currentAttack !== undefined) {
            sourceInstance.currentAttack += attackBuff;
          }
          if (sourceInstance.currentHealth !== undefined) {
            sourceInstance.currentHealth += healthBuff;
          }
          
          context.logGameEvent(`${sourceCard.name} gained +${attackBuff}/+${healthBuff}`);
        }
      }
      
      return { 
        success: true, 
        additionalData: { 
          minionsDestroyed: 1,
          destroyedMinion: targetMinion.card.name,
          tribe: targetTribe
        } 
      };
    }
    
    return { success: true, additionalData: { minionsDestroyed: 0 } };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_tribe:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_tribe: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

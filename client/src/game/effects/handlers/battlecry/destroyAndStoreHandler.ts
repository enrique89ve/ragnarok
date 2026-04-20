/**
 * DestroyAndStore Battlecry Handler
 * 
 * Implements the "destroy_and_store" battlecry effect.
 * Destroys a friendly minion and stores it for later resurrection (typically via deathrattle).
 * Example card: Carnivorous Cube (ID: 30019)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';

/**
 * Execute a destroy_and_store battlecry effect
 * 
 * @param context - The game context
 * @param effect - The effect data
 * @param sourceCard - The card that triggered the effect
 * @returns An object indicating success or failure and any additional data
 */
export default function executeDestroyAndStore(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing battlecry:destroy_and_store for ${sourceCard.name}`);
    
    const targetType = effect.targetType || 'friendly_minion';
    
    let targetMinions: CardInstance[] = [];
    
    if (targetType === 'friendly_minion') {
      targetMinions = context.getFriendlyMinions().filter(m => m.card.id !== sourceCard.id);
    } else if (targetType === 'enemy_minion') {
      targetMinions = context.getEnemyMinions();
    } else if (targetType === 'any_minion') {
      targetMinions = context.getAllMinions().filter(m => m.card.id !== sourceCard.id);
    }
    
    if (targetMinions.length === 0) {
      context.logGameEvent(`No valid minions to destroy and store`);
      return { success: true, additionalData: { minionDestroyed: false } };
    }
    
    const targetMinion = targetMinions[0];
    
    const isFriendly = context.getFriendlyMinions().includes(targetMinion);
    const board = isFriendly 
      ? context.currentPlayer.board 
      : context.opponentPlayer.board;
    
    const index = board.indexOf(targetMinion);
    if (index === -1) {
      context.logGameEvent(`Target minion not found on board`);
      return { success: false, error: 'Target not found' };
    }
    
    board.splice(index, 1);
    
    const graveyard = isFriendly 
      ? context.currentPlayer.graveyard 
      : context.opponentPlayer.graveyard;
    graveyard.push(targetMinion);
    
    context.logGameEvent(`${sourceCard.name} destroyed ${targetMinion.card.name}`);
    
    const sourceInstance = context.getFriendlyMinions().find(m => m.card.id === sourceCard.id);
    if (sourceInstance) {
      (sourceInstance as any).storedMinions = (sourceInstance as any).storedMinions || [];
      
      const storedMinion = {
        cardId: targetMinion.card.id,
        card: { ...targetMinion.card },
        originalHealth: targetMinion.card.health,
        originalAttack: targetMinion.card.attack
      };
      
      (sourceInstance as any).storedMinions.push(storedMinion);
      
      const summonCount = effect.summonCount || 2;
      for (let i = 1; i < summonCount; i++) {
        (sourceInstance as any).storedMinions.push({ ...storedMinion });
      }
      
      if (!sourceInstance.card.deathrattle) {
        sourceInstance.card.deathrattle = {
          type: 'summon_stored',
          targetFromBattlecry: true
        };
      }
      
      context.logGameEvent(`${sourceCard.name} stored ${targetMinion.card.name} (will summon ${summonCount} copies on death)`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        minionDestroyed: true,
        destroyedMinion: targetMinion.card.name,
        storedForResurrection: true,
        summonCount: effect.summonCount || 2
      } 
    };
  } catch (error) {
    debug.error(`Error executing battlecry:destroy_and_store:`, error);
    return { 
      success: false, 
      error: `Error executing battlecry:destroy_and_store: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * ResurrectAll Battlecry Handler
 * 
 * Resurrects all friendly minions that died this game.
 * Example card: Hyrrokkin, Launcher of the Dead (ID: 60101)
 */
import { debug } from '../../../config/debugConfig';
import { GameContext } from '../../../GameContext';
import { Card, BattlecryEffect, CardInstance } from '../../../types/CardTypes';
import { EffectResult } from '../../../types/EffectTypes';
import { MAX_BATTLEFIELD_SIZE } from '../../../constants/gameConstants';
import { hasKeyword } from '../../../utils/cards/keywordUtils';

export default function executeResurrectAll(
  context: GameContext,
  effect: BattlecryEffect,
  sourceCard: Card
): EffectResult {
  try {
    context.logGameEvent(`Executing resurrect_all battlecry for ${sourceCard.name}`);
    
    const race = effect.race;
    const hasDeathrattle = effect.hasDeathrattle ?? false;
    const maxCount = effect.maxCount || 7;
    const source = effect.source || 'graveyard';
    
    let deadMinions = [...context.currentPlayer.graveyard].filter(
      card => card.card.type === 'minion'
    );
    
    if (race && race !== 'all') {
      deadMinions = deadMinions.filter(card => (card.card.race || '').toLowerCase() === race.toLowerCase());
    }
    
    if (hasDeathrattle) {
      deadMinions = deadMinions.filter(card => card.card.deathrattle !== undefined);
    }
    
    if (deadMinions.length === 0) {
      context.logGameEvent('No valid minions to resurrect.');
      return { success: true, additionalData: { resurrectedCount: 0 } };
    }
    
    const resurrectedMinions: CardInstance[] = [];
    const availableSlots = MAX_BATTLEFIELD_SIZE - context.currentPlayer.board.length;
    const countToResurrect = Math.min(deadMinions.length, maxCount, availableSlots);
    
    const uniqueMinions = new Map<number | string, CardInstance>();
    for (const minion of deadMinions) {
      if (!uniqueMinions.has(minion.card.id)) {
        uniqueMinions.set(minion.card.id, minion);
      }
    }
    
    const minionsToResurrect = Array.from(uniqueMinions.values()).slice(0, countToResurrect);
    
    for (const deadMinion of minionsToResurrect) {
      if (context.currentPlayer.board.length >= MAX_BATTLEFIELD_SIZE) break;
      
      const resurrectedMinion: CardInstance = {
        instanceId: `resurrected-${deadMinion.card.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        card: { ...deadMinion.card },
        currentHealth: deadMinion.card.health,
        currentAttack: deadMinion.card.attack,
        canAttack: false,
        isPlayed: true,
        isSummoningSick: true,
        attacksPerformed: 0,
        hasDivineShield: hasKeyword(deadMinion, 'divine_shield'),
        isPoisonous: hasKeyword(deadMinion, 'poisonous'),
        hasLifesteal: hasKeyword(deadMinion, 'lifesteal')
      };
      
      context.currentPlayer.board.push(resurrectedMinion);
      resurrectedMinions.push(resurrectedMinion);
      
      context.logGameEvent(`Resurrected ${deadMinion.card.name}.`);
    }
    
    return { 
      success: true, 
      additionalData: { 
        resurrectedMinions,
        resurrectedCount: resurrectedMinions.length,
        filterUsed: { race, hasDeathrattle }
      }
    };
  } catch (error) {
    debug.error('Error executing resurrect_all:', error);
    return { success: false, error: `Failed to execute resurrect_all: ${error}` };
  }
}

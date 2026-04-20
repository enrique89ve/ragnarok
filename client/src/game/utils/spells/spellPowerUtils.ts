/**
 * Utility functions for spell power calculations and effects
 */

import { CardInstance, GameState, Player } from '../../types';
import { isMinion } from '../cards/typeGuards';
import { hasKeyword } from '../cards/keywordUtils';

/**
 * Calculate the total spell power for a player
 * Spell power increases the effectiveness of damage and healing spells
 * 
 * @param state The current game state
 * @param playerType Whether to calculate for 'player' or 'opponent'
 * @returns The total spell power value
 */
export function calculateSpellPower(state: GameState, playerType: 'player' | 'opponent'): number {
  const player = state.players[playerType];
  
  // Get all minions on the battlefield with spell power
  return player.battlefield.reduce((totalSpellPower, minion) => {
    // Check if card is a minion
    if (!isMinion(minion.card)) {
      return totalSpellPower;
    }
    
    // Check if minion has the spell_damage keyword
    const hasSpellDamageKeyword = hasKeyword(minion, 'spell_damage');
    
    // Add the minion's spell power value if it has one
    if (hasSpellDamageKeyword && minion.currentAttack && minion.currentAttack > 0) {
      return totalSpellPower + minion.currentAttack;
    }
    
    return totalSpellPower;
  }, 0);
}

/**
 * Apply spell power to a damage value
 * 
 * @param baseValue The base damage/healing value of the spell
 * @param spellPowerAmount The amount of spell power to apply
 * @returns The modified damage/healing value
 */
export function applySpellPower(baseValue: number, spellPowerAmount: number): number {
  return baseValue + spellPowerAmount;
}

/**
 * When a minion with spell power is played, initialize its spell power value
 * Based on the minion type and card text
 * 
 * @param cardInstance The card instance being played
 * @returns The updated card instance with spell power value
 */
export function initializeSpellPower(cardInstance: CardInstance): CardInstance {
  // Check if the card is a minion
  if (!isMinion(cardInstance.card)) {
    return cardInstance;
  }
  
  // Check if the card has spell damage keyword
  const hasSpellDamage = hasKeyword(cardInstance, 'spell_damage');
  if (hasSpellDamage) {
    // By default, we'll set currentAttack to represent spell power
    // For minions with spell_damage keyword, their attack acts as spell power
    return {
      ...cardInstance,
      currentAttack: cardInstance.currentAttack ?? cardInstance.card.attack ?? 1,
    };
  }
  
  return cardInstance;
}
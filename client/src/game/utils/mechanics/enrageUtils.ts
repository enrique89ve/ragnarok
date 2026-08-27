import { CardInstance, GameState } from '../../types';
import { isMinion, getAttack, getHealth } from '../cards/typeGuards';
import { hasKeyword } from '../cards/keywordUtils';

/**
 * Check if a minion should be enraged (has less than max health but is still alive)
 * @param minion The minion to check for enrage
 * @returns True if the minion should be enraged
 */
export function shouldBeEnraged(minion: CardInstance): boolean {
  if (!isMinion(minion.card)) return false;
  
  const minionHealth = getHealth(minion.card);
  if (!minion.currentHealth || !minionHealth) return false;
  
  return (
    minion.currentHealth > 0 && // Minion is alive
    minion.currentHealth < minionHealth && // Minion has taken damage
    hasKeyword(minion, 'enrage') && // Minion has the enrage keyword
    !minion.isSilenced // Minion isn't silenced
  );
}

/**
 * Apply enrage effects to a minion
 * @param minion The minion to apply enrage effects to
 * @returns The minion with enrage effects applied
 */
export function applyEnrageEffect(minion: CardInstance): CardInstance {
  // Ensure this is a minion card
  if (!isMinion(minion.card)) return minion;
  
  // Create a copy of the minion to modify
  const modifiedMinion = { ...minion };
  
  // Check if the minion should be enraged
  const shouldEnrage = shouldBeEnraged(minion);
  
  const minionAttack = getAttack(minion.card);
  const attackBonus = minion.card.name === 'Enraged Berserker'
    ? 3
    : minion.card.name === 'Tyr, God of War'
      ? 6
      : 2;
  const previousBonus = minion.enrageAttackBonus ?? 0;
  const currentAttack = minion.currentAttack ?? minionAttack;

  // Apply card-specific enrage effects based on card names
  if (shouldEnrage && minionAttack > 0) {
    // Track Enrage separately so Aura/temporary projections do not suppress it.
    if (previousBonus !== attackBonus) {
      modifiedMinion.currentAttack = currentAttack - previousBonus + attackBonus;
      modifiedMinion.enrageAttackBonus = attackBonus;
    }
  } else if (!shouldEnrage && previousBonus > 0) {
    // Remove the enrage bonus when healed to full or silenced
    modifiedMinion.currentAttack = currentAttack - previousBonus;
    modifiedMinion.enrageAttackBonus = undefined;
  } else if (!shouldEnrage && currentAttack > minionAttack && minionAttack > 0) {
    // Compatibility for older instances created before enrageAttackBonus was tracked.
    const auraAttack = minion.auraBuffAttack ?? 0;
    if (currentAttack - auraAttack > minionAttack) {
      modifiedMinion.currentAttack = currentAttack - attackBonus;
    }
  }
  
  return modifiedMinion;
}

/**
 * Check and update enrage status for all minions on the battlefield
 * @param state Current game state
 * @returns Updated game state with enrage effects applied
 */
export function updateEnrageEffects(state: GameState): GameState {
  const newState = { ...state };
  
  // Check player's minions
  newState.players.player.battlefield = newState.players.player.battlefield.map(minion => {
    return applyEnrageEffect(minion);
  });
  
  // Check opponent's minions
  newState.players.opponent.battlefield = newState.players.opponent.battlefield.map(minion => {
    return applyEnrageEffect(minion);
  });
  
  return newState;
}

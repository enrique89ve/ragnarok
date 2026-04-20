import { CardInstance, GameState } from '../../types';
import { isMinion, getAttack, getHealth } from '../cards/typeGuards';
import { addKeyword, removeKeyword, hasKeyword } from '../cards/keywordUtils';

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
  
  // Apply card-specific enrage effects based on card names
  if (shouldEnrage && minionAttack > 0) {
    // Only apply the bonus if not already applied
    if (!minion.currentAttack || minion.currentAttack === minionAttack) {
      let attackBonus = 2; // Default bonus
      let windfuryAdded = false;
      
      // Apply card-specific enrage effects
      switch (minion.card.name) {
        case "Enraged Berserker":
          attackBonus = 3;
          break;
        case "Tyr, God of War":
          attackBonus = 6;
          break;
      }
      
      // Apply attack bonus to currentAttack
      if (!modifiedMinion.currentAttack) {
        modifiedMinion.currentAttack = minionAttack;
      }
      modifiedMinion.currentAttack += attackBonus;
      
      // Apply windfury if needed
      if (windfuryAdded) {
        addKeyword(modifiedMinion, 'windfury');
      }
      
    }
  } else if (!shouldEnrage && minion.currentAttack && minion.currentAttack > minionAttack && minionAttack > 0) {
    // Remove the enrage bonus when healed to full or silenced
    let attackBonus = 2; // Default bonus
    let windfuryRemoved = false;
    
    // Apply card-specific enrage removal
    switch (minion.card.name) {
      case "Enraged Berserker":
        attackBonus = 3;
        break;
      case "Tyr, God of War":
        attackBonus = 6;
        break;
    }
    
    // Remove attack bonus
    modifiedMinion.currentAttack = (modifiedMinion.currentAttack ?? 0) - attackBonus;
    
    // Remove windfury if it was added by enrage
    if (windfuryRemoved) {
      removeKeyword(modifiedMinion, 'windfury');
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

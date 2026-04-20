/**
 * Utility functions for Lifesteal mechanic
 * Lifesteal is a mechanic that heals the hero for the amount of damage dealt by a card
 */

import { CardInstance, GameState } from '../../types';
import { logHeal } from '../gameLogUtils';

/**
 * Check if a card has the lifesteal keyword
 * @param card The card to check
 * @returns True if the card has the lifesteal keyword and is not silenced
 */
export function hasLifesteal(card: CardInstance): boolean {
  // Check if the card has the lifesteal keyword and is not silenced
  return card.hasLifesteal === true && !card.isSilenced;
}

/**
 * Initialize lifesteal effect when a card is played
 * @param card Card instance being played
 * @returns Updated card instance with lifesteal state set
 */
export function initializeLifestealEffect(card: CardInstance): CardInstance {
  return {
    ...card,
    hasLifesteal: true
  };
}

/**
 * Apply lifesteal healing from damage dealt
 * @param state Current game state
 * @param attackerCard The attacking card with lifesteal
 * @param damageDealt Amount of damage dealt by the attack
 * @param attackerOwner The owner of the attacking card
 * @returns Updated game state after lifesteal healing
 */
export function applyLifestealHealing(
  state: GameState,
  attackerCard: CardInstance,
  damageDealt: number,
  attackerOwner: 'player' | 'opponent'
): GameState {
  // If no damage was dealt or card doesn't have lifesteal, no healing occurs
  if (damageDealt <= 0 || !hasLifesteal(attackerCard)) {
    return state;
  }

  // Create a deep copy of the state to avoid direct mutations
  let newState = JSON.parse(JSON.stringify(state)) as GameState;

  // Apply the healing to the hero (use heroHealth as canonical field)
  const player = newState.players[attackerOwner];
  const currentHp = player.heroHealth ?? player.health;
  const maxHp = player.maxHealth;
  player.heroHealth = Math.min(maxHp, currentHp + damageDealt);

  // Log the heal event
  return logHeal(
    newState,
    attackerOwner,
    'hero',
    damageDealt
  );
}

/**
 * Process lifesteal healing from spell damage
 * @param state Current game state
 * @param spellCard The spell card with lifesteal
 * @param damageDealt Amount of damage dealt by the spell
 * @param casterOwner The owner of the spell
 * @returns Updated game state after lifesteal healing
 */
export function processSpellLifesteal(
  state: GameState,
  spellCard: CardInstance,
  damageDealt: number,
  casterOwner: 'player' | 'opponent'
): GameState {
  // If no damage was dealt or card doesn't have lifesteal, no healing occurs
  if (damageDealt <= 0 || !hasLifesteal(spellCard)) {
    return state;
  }

  // Create a deep copy of the state to avoid direct mutations
  let newState = JSON.parse(JSON.stringify(state)) as GameState;

  // Apply the healing to the hero (use heroHealth as canonical field)
  const player = newState.players[casterOwner];
  const currentHp = player.heroHealth ?? player.health;
  const maxHp = player.maxHealth;
  player.heroHealth = Math.min(maxHp, currentHp + damageDealt);

  // Log the heal event
  return logHeal(
    newState,
    casterOwner,
    'hero',
    damageDealt
  );
}

/**
 * Process lifesteal for weapon attacks
 * @param state Current game state
 * @param weaponCard The weapon card with lifesteal
 * @param damageDealt Amount of damage dealt by the weapon
 * @param attackerOwner The owner of the weapon
 * @returns Updated game state after lifesteal healing
 */
export function processWeaponLifesteal(
  state: GameState,
  weaponCard: CardInstance,
  damageDealt: number,
  attackerOwner: 'player' | 'opponent'
): GameState {
  // If no damage was dealt or weapon doesn't have lifesteal, no healing occurs
  if (damageDealt <= 0 || !hasLifesteal(weaponCard)) {
    return state;
  }

  // Create a deep copy of the state to avoid direct mutations
  let newState = JSON.parse(JSON.stringify(state)) as GameState;

  // Apply the healing to the hero (use heroHealth as canonical field)
  const player = newState.players[attackerOwner];
  const currentHp = player.heroHealth ?? player.health;
  const maxHp = player.maxHealth;
  player.heroHealth = Math.min(maxHp, currentHp + damageDealt);

  // Log the heal event
  return logHeal(
    newState,
    attackerOwner,
    'hero',
    damageDealt
  );
}

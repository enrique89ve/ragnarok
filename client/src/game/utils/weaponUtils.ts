/**
 * Utility functions for handling weapons
 * Weapons allow heroes to attack directly and lose durability with each use
 */

import { GameState, CardInstance, GameLogEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createCardInstance } from './cards/cardUtils';
import { logCardPlay } from './gameLogUtils';
import { processAfterHeroAttackEffects } from './mechanics/afterAttackUtils';
import {
  isWeapon,
  isMinion,
  getAttack,
  getDurability,
  getHealth,
  hasAttack,
  hasDurability
} from './cards/typeGuards';
import { debug } from '../config/debugConfig';
import { destroyCard } from './zoneUtils';
import { dealDamage } from './effects/damageUtils';
import { processArtifactOnHeroAttack, processArtifactOnHeroAttackTarget, processArtifactOnHeroKill } from './artifactTriggerProcessor';
import { getArtifactAttackBonus } from './artifactUtils';
import { hasKeyword } from './cards/keywordUtils';

/**
 * Equip a weapon for a player
 * @param state Current game state
 * @param playerType Player equipping the weapon ('player' or 'opponent')
 * @param weaponCard The weapon card to equip
 * @returns Updated game state with weapon equipped
 */
export function equipWeapon(
  state: GameState,
  playerType: 'player' | 'opponent',
  weaponCard: CardInstance
): GameState {
  
  // Make a deep copy of the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Type guard: ensure the card is a weapon
  if (!isWeapon(weaponCard.card)) {
    debug.error(`Invalid weapon card: ${weaponCard.card.name}`);
    return state;
  }
  
  // Check if player already has a weapon equipped
  if (newState.players[playerType].weapon) {
    // Destroy the current weapon (send to graveyard)
    const oldWeapon = newState.players[playerType].weapon;
    if (oldWeapon) {
      
      // Add to graveyard if it doesn't exist yet
      if (!newState.players[playerType].graveyard) {
        newState.players[playerType].graveyard = [];
      }
      
      newState.players[playerType].graveyard.push(oldWeapon);
    }
  }
  
  // Initialize weapon properties
  const weapon: CardInstance = {
    ...weaponCard,
    isPlayed: true,
    currentDurability: getDurability(weaponCard.card) || 1, // Set initial durability
    attacksPerformed: 0,
    canAttack: true // Can attack on the turn it's equipped
  };
  
  // Equip the weapon
  newState.players[playerType].weapon = weapon;
  
  // Add to game log
  const logEvent: GameLogEvent = {
    id: uuidv4(),
    type: 'equip_weapon',
    turn: newState.turnNumber,
    timestamp: Date.now(),
    player: playerType,
    text: `${playerType} equipped ${weapon.card.name} (${getAttack(weapon.card)}/${weapon.currentDurability})`,
    cardId: weapon.instanceId
  };
  
  newState.gameLog.push(logEvent);
  
  return newState;
}

/**
 * Attack with a weapon
 * Handles damaging the target and reducing weapon durability
 * @param state Current game state
 * @param attackingPlayerType The player attacking with their weapon
 * @param targetId ID of the target (minion or hero)
 * @param targetType Type of target ('minion' or 'hero')
 * @returns Updated game state after the attack
 */
export function attackWithWeapon(
  state: GameState,
  attackingPlayerType: 'player' | 'opponent',
  targetId?: string,
  targetType: 'minion' | 'hero' = 'hero'
): GameState {
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Get the weapon
  const weapon = newState.players[attackingPlayerType].weapon;
  
  if (!weapon) {
    debug.error(`${attackingPlayerType} doesn't have a weapon equipped`);
    return state;
  }
  
  if (newState.players[attackingPlayerType].attacksPerformedThisTurn &&
      newState.players[attackingPlayerType].attacksPerformedThisTurn > 0) {
    debug.error(`${attackingPlayerType} has already attacked this turn`);
    return state;
  }
  
  // Determine the defending player
  const defendingPlayerType = attackingPlayerType === 'player' ? 'opponent' : 'player';
  
  // Get the weapon attack value + artifact bonus
  const artifactBonus = getArtifactAttackBonus(newState, attackingPlayerType);
  const attackDamage = getAttack(weapon.card) + artifactBonus;
  
  // If no targetId is specified, attack the enemy hero directly
  if (!targetId || targetType === 'hero') {
    newState = dealDamage(newState, defendingPlayerType, 'hero', attackDamage, undefined, undefined, attackingPlayerType);
  } else if (targetType === 'minion') {
    // Find the target minion
    const targetIndex = newState.players[defendingPlayerType].battlefield.findIndex(
      card => card.instanceId === targetId
    );
    
    if (targetIndex === -1) {
      debug.error(`Target minion not found: ${targetId}`);
      return state;
    }
    
    const targetMinion = newState.players[defendingPlayerType].battlefield[targetIndex];
    
    // Type guard: ensure the target minion is actually a minion
    if (!isMinion(targetMinion.card)) {
      debug.error(`Invalid target: expected minion, got ${targetMinion.card.type}`);
      return state;
    }
    
    // Check for Divine Shield
    if (targetMinion.hasDivineShield) {
      newState.players[defendingPlayerType].battlefield[targetIndex].hasDivineShield = false;
    } else {
      // Apply damage to minion
      const currentHealth = targetMinion.currentHealth || getHealth(targetMinion.card) || 0;
      newState.players[defendingPlayerType].battlefield[targetIndex].currentHealth = currentHealth - attackDamage;
      
      // Check if the minion was killed
      if ((newState.players[defendingPlayerType].battlefield[targetIndex].currentHealth || 0) <= 0) {
        const deadMinionId = targetMinion.instanceId;
        newState = destroyCard(newState, deadMinionId, defendingPlayerType);
        // Process artifact on-hero-kill trigger (Blade of Carnage)
        newState = processArtifactOnHeroKill(newState, attackingPlayerType);
      }

      // Process artifact on-hero-attack-target triggers (Trident freeze)
      newState = processArtifactOnHeroAttackTarget(newState, attackingPlayerType, targetId!, defendingPlayerType);
    }

    // Hero also takes damage from attacking the minion
    const minionAttack = getAttack(targetMinion.card);
    if (minionAttack > 0) {
      newState = dealDamage(newState, attackingPlayerType, 'hero', minionAttack, undefined, undefined, defendingPlayerType);
    }
  }
  
  // Reduce weapon durability — re-read from newState in case destroyCard replaced the state object
  const currentWeapon = newState.players[attackingPlayerType].weapon;
  if (currentWeapon && currentWeapon.currentDurability !== undefined) {
    currentWeapon.currentDurability -= 1;

    // Check if weapon broke
    if (currentWeapon.currentDurability <= 0) {

      // Add to game log
      const breakEvent: GameLogEvent = {
        id: uuidv4(),
        type: 'weapon_break',
        turn: newState.turnNumber,
        timestamp: Date.now(),
        player: attackingPlayerType,
        text: `${currentWeapon.card.name} broke`,
        cardId: currentWeapon.instanceId
      };

      newState.gameLog.push(breakEvent);

      // Add to graveyard if it doesn't exist yet
      if (!newState.players[attackingPlayerType].graveyard) {
        newState.players[attackingPlayerType].graveyard = [];
      }

      // Move to graveyard
      newState.players[attackingPlayerType].graveyard.push(currentWeapon);

      // Remove weapon
      newState.players[attackingPlayerType].weapon = undefined;
    }
  }
  
  // Track attack for this turn
  newState.players[attackingPlayerType].attacksPerformedThisTurn = 
    (newState.players[attackingPlayerType].attacksPerformedThisTurn || 0) + 1;
  
  // Add to game log
  const logEvent: GameLogEvent = {
    id: uuidv4(),
    type: 'hero_attack',
    turn: newState.turnNumber,
    timestamp: Date.now(),
    player: attackingPlayerType,
    text: targetType === 'hero' 
      ? `${attackingPlayerType} attacked ${defendingPlayerType} for ${attackDamage}` 
      : `${attackingPlayerType} attacked ${targetId ? newState.players[defendingPlayerType].battlefield.find(card => card.instanceId === targetId)?.card.name || 'a minion' : 'a minion'}`,
    cardId: weapon.instanceId,
    targetId: targetId,
    value: attackDamage
  };
  
  newState.gameLog.push(logEvent);
  
  // Process artifact on-hero-attack triggers (Mjolnir AoE, Blade self-damage)
  newState = processArtifactOnHeroAttack(newState, attackingPlayerType);

  // Process "after hero attacks" effects (like Battlefiend gaining +1 Attack)
  newState = processAfterHeroAttackEffects(newState, attackingPlayerType);
  
  return newState;
}

/**
 * Function to handle end of turn processing for weapons
 * Resets the attack counter for the next turn
 * @param state Current game state
 * @returns Updated game state
 */
export function processWeaponsAtTurnEnd(state: GameState): GameState {
  // Make a deep copy of the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Reset attack counter for both players
  newState.players.player.attacksPerformedThisTurn = 0;
  newState.players.opponent.attacksPerformedThisTurn = 0;
  
  return newState;
}

/**
 * Check if a player can attack with their weapon
 * @param state Game state 
 * @param playerType Player to check
 * @returns True if the player can attack with their weapon
 */
export function canPlayerAttackWithWeapon(state: GameState, playerType: 'player' | 'opponent'): boolean {
  const player = state.players[playerType];
  
  // Check if it's the player's turn
  if (state.currentTurn !== playerType) {
    return false;
  }
  
  // Check if the player has a weapon
  if (!player.weapon) {
    return false;
  }
  
  // Check if player has already attacked this turn
  if (player.attacksPerformedThisTurn && player.attacksPerformedThisTurn > 0) {
    return false;
  }
  
  // Check if the weapon has attack value
  if (getAttack(player.weapon.card) <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Check if a target is valid for a weapon attack
 * If there are Taunt minions, you must attack those first
 * @param state Game state
 * @param targetId Target ID
 * @param targetType Type of target ('minion' or 'hero')
 * @param attackingPlayerType Player attacking
 * @returns True if the target is valid for attack
 */
export function isValidWeaponTarget(
  state: GameState,
  targetId: string | undefined, 
  targetType: 'minion' | 'hero', 
  attackingPlayerType: 'player' | 'opponent'
): boolean {
  // Determine the defending player
  const defendingPlayerType = attackingPlayerType === 'player' ? 'opponent' : 'player';
  
  // Check if there are any Taunt minions on the opponent's side
  const hasTaunt = state.players[defendingPlayerType].battlefield.some(
    cardInstance => {
      // Type guard: safely check for taunt keyword
      if (!isMinion(cardInstance.card)) {
        return false;
      }
      return hasKeyword(cardInstance, 'taunt');
    }
  );
  
  // If there are Taunt minions and we're not targeting one, attack is invalid
  if (hasTaunt && targetType === 'hero') {
    return false;
  }
  
  // If there are Taunt minions and we're targeting a non-Taunt minion, attack is invalid
  if (hasTaunt && targetType === 'minion' && targetId) {
    const targetMinion = state.players[defendingPlayerType].battlefield.find(
      card => card.instanceId === targetId
    );
    
    if (targetMinion && isMinion(targetMinion.card)) {
      const hasNoTaunt = !hasKeyword(targetMinion, 'taunt');
      if (hasNoTaunt) {
        return false;
      }
    }
  }
  
  // If targeting a minion, make sure it exists
  if (targetType === 'minion' && targetId) {
    const targetExists = state.players[defendingPlayerType].battlefield.some(
      card => card.instanceId === targetId
    );
    
    if (!targetExists) {
      return false;
    }
  }
  
  return true;
}

/**
 * Apply weapon buffs (used for cards that give +X attack to your weapon)
 * @param state Game state
 * @param playerType Player whose weapon to buff
 * @param attackBuff Amount to increase attack by
 * @param durabilityBuff Amount to increase durability by
 * @returns Updated game state
 */
export function buffWeapon(
  state: GameState,
  playerType: 'player' | 'opponent',
  attackBuff: number,
  durabilityBuff: number = 0
): GameState {
  // Make a deep copy of the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  const weapon = newState.players[playerType].weapon;
  
  if (!weapon) {
    debug.error(`${playerType} doesn't have a weapon to buff`);
    return state;
  }
  
  // Type guard: ensure weapon is actually a weapon card
  if (!isWeapon(weapon.card)) {
    debug.error(`Invalid weapon card for buff: ${weapon.card.type}`);
    return state;
  }
  
  // Apply buffs using helper functions
  const originalAttack = getAttack(weapon.card);
  const buffedAttack = originalAttack + attackBuff;
  
  const originalDurability = weapon.currentDurability || getDurability(weapon.card) || 0;
  const buffedDurability = originalDurability + durabilityBuff;
  
  // Update weapon stats with type-narrowed card
  const weaponCard = weapon.card;
  newState.players[playerType].weapon = {
    ...weapon,
    card: {
      ...weaponCard,
      attack: buffedAttack
    },
    currentDurability: buffedDurability
  };
  
  return newState;
}
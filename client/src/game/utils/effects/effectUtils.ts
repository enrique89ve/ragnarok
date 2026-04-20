/**
 * Utility functions for handling card effects and damage calculations
 */
import { v4 as uuidv4 } from 'uuid';
import { GameState, CardInstance } from '../../types';
import { applyDamage } from '../gameUtils';
import { isMinion, getAttack, getHealth } from '../cards/typeGuards';

/**
 * Deal damage to all enemy minions on the battlefield
 * @param state Current game state
 * @param playerId ID of the player casting the effect ('player' or 'opponent')
 * @param damageAmount Amount of damage to deal to each enemy minion
 * @returns Updated game state
 */
export function dealDamageToAllEnemyMinions(
  state: GameState,
  playerId: 'player' | 'opponent',
  damageAmount: number
): GameState {
  // Determine the enemy based on the playerId
  const enemyId = playerId === 'player' ? 'opponent' : 'player';
  
  // Create a copy of the state to modify
  let updatedState = { ...state };
  
  // Get the enemy's battlefield
  const enemyBattlefield = updatedState.players[enemyId].battlefield;
  
  // Apply damage to each enemy minion
  for (let i = 0; i < enemyBattlefield.length; i++) {
    const minionId = enemyBattlefield[i].instanceId;
    
    // Apply damage to the minion
    updatedState = applyDamage(updatedState, enemyId, minionId, damageAmount);
    
    // Add to game log
    updatedState.gameLog = [
      ...(updatedState.gameLog || []),
      {
        id: uuidv4(),
        type: 'damage',
        player: playerId,
        turn: updatedState.turnNumber,
        timestamp: Date.now(),
        text: `Dealt ${damageAmount} damage to ${enemyBattlefield[i].card.name}`,
        targetId: minionId,
        value: damageAmount
      }
    ];
  }
  
  return updatedState;
}

/**
 * Deal damage to all minions on the battlefield (friendly and enemy)
 * @param state Current game state
 * @param damageAmount Amount of damage to deal to each minion
 * @returns Updated game state
 */
export function dealDamageToAllMinions(
  state: GameState,
  damageAmount: number
): GameState {
  // Apply damage to player's minions
  let updatedState = dealDamageToAllEnemyMinions(state, 'opponent', damageAmount);
  
  // Apply damage to opponent's minions
  updatedState = dealDamageToAllEnemyMinions(updatedState, 'player', damageAmount);
  
  return updatedState;
}

/**
 * Heal a specific target (minion or hero)
 * @param state Current game state
 * @param playerId ID of the player who owns the target ('player' or 'opponent')
 * @param targetId ID of the target to heal, or 'hero' for the player's hero
 * @param healAmount Amount of healing to apply
 * @returns Updated game state
 */
export function healTarget(
  state: GameState,
  playerId: 'player' | 'opponent',
  targetId: string,
  healAmount: number
): GameState {
  const updatedState = { ...state };
  
  // Heal the player's hero
  if (targetId === 'hero') {
    const p = updatedState.players[playerId];
    const currentHealth = p.heroHealth ?? p.health;
    const maxHealth = p.maxHealth;

    p.heroHealth = Math.min(currentHealth + healAmount, maxHealth);
    
    // Add to game log
    updatedState.gameLog = [
      ...(updatedState.gameLog || []),
      {
        id: uuidv4(),
        type: 'heal',
        player: playerId,
        turn: updatedState.turnNumber,
        timestamp: Date.now(),
        text: `Healed ${playerId}'s hero for ${healAmount}`,
        targetId: 'hero',
        value: healAmount
      }
    ];
    
    return updatedState;
  }
  
  // Heal a minion
  const battlefield = updatedState.players[playerId].battlefield;
  const minionIndex = battlefield.findIndex(card => card.instanceId === targetId);
  
  if (minionIndex !== -1) {
    const minion = battlefield[minionIndex];
    
    if (minion.currentHealth !== undefined) {
      const maxHealth = getHealth(minion.card);
      const newHealth = Math.min(minion.currentHealth + healAmount, maxHealth);
      
      updatedState.players[playerId].battlefield[minionIndex] = {
        ...minion,
        currentHealth: newHealth
      };
      
      // Add to game log
      updatedState.gameLog = [
        ...(updatedState.gameLog || []),
        {
          id: uuidv4(),
          type: 'heal',
          player: playerId,
          turn: updatedState.turnNumber,
          timestamp: Date.now(),
          text: `Healed ${minion.card.name} for ${healAmount}`,
          targetId: targetId,
          value: healAmount
        }
      ];
    }
  }
  
  return updatedState;
}

/**
 * Apply a buff to a minion's stats
 * @param state Current game state
 * @param playerId ID of the player who owns the minion ('player' or 'opponent')
 * @param minionId ID of the minion to buff
 * @param attackBuff Amount to increase attack (can be negative for debuff)
 * @param healthBuff Amount to increase health (can be negative for debuff)
 * @returns Updated game state
 */
export function buffMinionStats(
  state: GameState,
  playerId: 'player' | 'opponent',
  minionId: string,
  attackBuff: number,
  healthBuff: number
): GameState {
  const updatedState = { ...state };
  const battlefield = updatedState.players[playerId].battlefield;
  const minionIndex = battlefield.findIndex(card => card.instanceId === minionId);
  
  if (minionIndex !== -1) {
    const minion = battlefield[minionIndex];
    
    if (isMinion(minion.card)) {
      const currentAttack = getAttack(minion.card);
      const currentMaxHealth = getHealth(minion.card);
      const currentHealth = minion.currentHealth || currentMaxHealth;
      
      // Update the minion's stats
      updatedState.players[playerId].battlefield[minionIndex] = {
        ...minion,
        card: {
          ...minion.card,
          attack: Math.max(0, currentAttack + attackBuff), // Attack cannot be negative
          health: Math.max(1, currentMaxHealth + healthBuff) // Health cannot be less than 1
        },
        currentHealth: Math.max(1, currentHealth + healthBuff) // Current health is also increased
      };
      
      // Add to game log
      updatedState.gameLog = [
        ...(updatedState.gameLog || []),
        {
          id: uuidv4(),
          type: 'buff',
          player: playerId,
          turn: updatedState.turnNumber,
          timestamp: Date.now(),
          text: `Buffed ${minion.card.name} with +${attackBuff}/+${healthBuff}`,
          targetId: minionId
        }
      ];
    }
  }
  
  return updatedState;
}
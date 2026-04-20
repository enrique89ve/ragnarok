/**
 * Utility functions for the Dormant mechanic in the game
 * Dormant minions can't attack, be attacked, or take damage for a specified number of turns.
 * After the dormant period is over, they "awaken" and gain their full abilities.
 */

import { CardInstance, GameState } from '../types';
import { applyDamage } from './gameUtils';
import { v4 as uuidv4 } from 'uuid';
import { isMinion, getAttack, getHealth } from './cards/typeGuards';
import { debug } from '../config/debugConfig';
import { hasKeyword } from './cards/keywordUtils';

/**
 * Initialize a card's dormant effect when played
 * Sets the initial state of a dormant minion
 * @param card Card instance to initialize
 * @returns Card instance with properly initialized dormant properties
 */
export function initializeDormantEffect(card: CardInstance): CardInstance {
  // Check if the card has the dormant keyword
  if (hasKeyword(card, 'dormant') && isMinion(card.card)) {
    return {
      ...card,
      isDormant: true,
      dormantTurnsLeft: card.card.dormantTurns || 2, // Default to 2 turns if not specified
      canAttack: false,
      canBeAttacked: false,
      canTakeDamage: false
    };
  }
  return card;
}

/**
 * Process dormant minions at the end of each turn
 * Reduces the dormant counter and awakens minions if their counter reaches 0
 * @param state Current game state
 * @returns Updated game state with processed dormant effects
 */
export function processDormantEffects(state: GameState): GameState {
  // Process dormant effects for both players
  let updatedState = JSON.parse(JSON.stringify(state)) as GameState;
  
  updatedState = processDormantForPlayer(updatedState, 'player');
  updatedState = processDormantForPlayer(updatedState, 'opponent');
  
  return updatedState;
}

/**
 * Process dormant effects for a specific player
 * @param state Current game state
 * @param playerType Player ID ('player' or 'opponent')
 * @returns Updated game state
 */
function processDormantForPlayer(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  const updatedState = { ...state };
  const battlefield = updatedState.players[playerType].battlefield;
  
  // Check each minion on the battlefield
  for (let i = 0; i < battlefield.length; i++) {
    const minion = battlefield[i];
    
    // Skip non-dormant minions
    if (!minion.isDormant) {
      continue;
    }
    
    // Skip minions with special awakening conditions
    if (isMinion(minion.card) && minion.card.customAwakeningCondition) {
      continue;
    }
    
    // Reduce the dormant counter by 1
    minion.dormantTurnsLeft = (minion.dormantTurnsLeft || 0) - 1;
    
    // Check if the dormant period is over
    if (minion.dormantTurnsLeft <= 0) {
      // Awaken the minion
      awakeDormantMinion(updatedState, minion.instanceId, playerType);
    }
  }
  
  return updatedState;
}

/**
 * Awaken a dormant minion, activating its effects
 * @param state Current game state
 * @param minionId The instance ID of the dormant minion
 * @param playerType Player ID ('player' or 'opponent')
 * @returns Updated game state with awakened minion
 */
export function awakeDormantMinion(
  state: GameState,
  minionId: string,
  playerType: 'player' | 'opponent'
): GameState {
  const updatedState = JSON.parse(JSON.stringify(state)) as GameState;
  const battlefield = updatedState.players[playerType].battlefield;
  
  // Find the minion
  const minionIndex = battlefield.findIndex(m => m.instanceId === minionId);
  if (minionIndex === -1) {
    debug.error(`Dormant minion with ID ${minionId} not found`);
    return state;
  }
  
  const minion = battlefield[minionIndex];
  
  // Update the minion's properties
  minion.isDormant = false;
  minion.canAttack = true;
  minion.canBeAttacked = true;
  minion.canTakeDamage = true;
  minion.isSummoningSick = true; // Still can't attack this turn
  
  // Log the awakening
  
  // Add to game log
  updatedState.gameLog = [
    ...(updatedState.gameLog || []),
    {
      id: uuidv4(),
      type: 'dormant_awaken',
      cardId: minionId,
      player: playerType,
      turn: updatedState.turnNumber,
      timestamp: Date.now(),
      text: `${minion.card.name} has awakened!`
    }
  ];
  
  // Process awakening effect if there is one
  return processAwakeningEffect(updatedState, minionId, playerType);
}

/**
 * Handle the special awakening effect of a dormant minion
 * @param state Current game state
 * @param minionId The instance ID of the awakened minion
 * @param playerType Player ID ('player' or 'opponent')
 * @returns Updated game state after applying the awakening effect
 */
function processAwakeningEffect(
  state: GameState,
  minionId: string,
  playerType: 'player' | 'opponent'
): GameState {
  const updatedState = { ...state };
  const battlefield = updatedState.players[playerType].battlefield;
  
  // Find the minion
  const minionIndex = battlefield.findIndex(m => m.instanceId === minionId);
  if (minionIndex === -1) {
    return updatedState;
  }
  
  const minion = battlefield[minionIndex];
  
  // Only minions can have awaken effects
  if (!isMinion(minion.card)) {
    return updatedState;
  }
  
  const awakenEffect = minion.card.awakenEffect;
  
  // If no effect, return unchanged
  if (!awakenEffect) {
    return updatedState;
  }
  
  
  // Process different types of awakening effects
  switch (awakenEffect.type) {
    case 'damage':
      // Deal damage to specified targets
      if (awakenEffect.targetType === 'all_enemy_minions') {
        const enemyPlayerId = playerType === 'player' ? 'opponent' : 'player';
        const enemyMinions = updatedState.players[enemyPlayerId].battlefield;
        
        // Apply damage to each enemy minion
        let newState = { ...updatedState };
        for (const minion of enemyMinions) {
          newState = applyDamage(newState, enemyPlayerId, minion.instanceId, awakenEffect.value || 0);
        }
        return newState;
      }
      
      if (awakenEffect.targetType === 'all_enemies') {
        const enemyPlayerId = playerType === 'player' ? 'opponent' : 'player';
        let newState = { ...updatedState };
        
        // Deal damage to enemy hero first
        newState = applyDamage(newState, enemyPlayerId, 'hero', awakenEffect.value || 0);
        
        // Then to all enemy minions
        const enemyMinions = newState.players[enemyPlayerId].battlefield;
        for (const minion of enemyMinions) {
          newState = applyDamage(newState, enemyPlayerId, minion.instanceId, awakenEffect.value || 0);
        }
        
        return newState;
      }
      return updatedState;
      
    case 'random_damage':
      // Deal damage randomly split among enemies
      if (awakenEffect.targetType === 'all_enemies') {
        const enemyPlayerId = playerType === 'player' ? 'opponent' : 'player';
        let newState = { ...updatedState };
        const totalDamage = awakenEffect.value || 0;
        let remainingDamage = totalDamage;
        
        // Make a list of all possible targets (enemy hero + minions)
        const targets = [
          { type: 'hero', id: 'hero' },
          ...newState.players[enemyPlayerId].battlefield.map(m => ({ type: 'minion', id: m.instanceId }))
        ];
        
        // Deal damage one point at a time, randomly
        while (remainingDamage > 0 && targets.length > 0) {
          // Pick a random target
          const randomIndex = Math.floor(Math.random() * targets.length);
          const target = targets[randomIndex];
          
          // Deal 1 damage to the target
          newState = applyDamage(newState, enemyPlayerId, target.id, 1);
          remainingDamage--;
          
          // If target is a minion, check if it's still alive
          if (target.type === 'minion') {
            const minion = newState.players[enemyPlayerId].battlefield.find(m => m.instanceId === target.id);
            if (!minion) {
              // Remove dead minions from targets
              targets.splice(randomIndex, 1);
            }
          }
        }
        
        return newState;
      }
      return updatedState;
      
    case 'mana_discount':
      // Apply mana discount to a random minion in hand
      if (awakenEffect.targetType === 'random_hand_minion') {
        const hand = updatedState.players[playerType].hand;
        const minionsInHand = hand.filter(card => card.card.type === 'minion');
        
        if (minionsInHand.length > 0) {
          // Pick a random minion
          const randomIndex = Math.floor(Math.random() * minionsInHand.length);
          const randomMinion = minionsInHand[randomIndex];
          
          // Apply discount
          const discount = awakenEffect.value || 0;
          randomMinion.card.manaCost = Math.max(0, (randomMinion.card.manaCost || 0) - discount);
          
        }
      }
      return updatedState;
      
    case 'buff_hand':
      // Apply buff to all minions in hand
      if (awakenEffect.targetType === 'all_hand_minions') {
        const hand = updatedState.players[playerType].hand;
        
        for (const card of hand) {
          if (isMinion(card.card)) {
            // Apply attack buff
            if (awakenEffect.buffAttack) {
              card.card.attack = (getAttack(card.card) || 0) + awakenEffect.buffAttack;
            }
            
            // Apply health buff
            if (awakenEffect.buffHealth) {
              card.card.health = (getHealth(card.card) || 0) + awakenEffect.buffHealth;
            }
          }
        }
        
      }
      return updatedState;
      
    case 'equip_weapon':
      // Equip a weapon when awakened
      if (awakenEffect.equipWeaponId) {
        // Logic to equip weapon would go here
        // This would typically involve looking up the weapon by ID and adding it to the player's equipment
      }
      return updatedState;
      
    default:
      debug.error(`Unknown awakening effect type: ${(awakenEffect as any).type}`);
      return updatedState;
  }
}

/**
 * Check if a special awakening condition has been met
 * Used for minions with conditional dormant effects like Magtheridon
 * @param state Current game state
 * @param condition The name of the condition to check
 * @param data Additional data needed for the condition
 * @returns True if the condition is met
 */
export function checkDormantAwakeningCondition(
  state: GameState,
  condition: string,
  data: any
): boolean {
  switch (condition) {
    case 'warders_destroyed':
      // Check if all three Hellfire Warders were destroyed
      // This is specific to Magtheridon
      const { warderCount } = data;
      return warderCount === 0; // All warders have been destroyed
      
    default:
      debug.error(`Unknown dormant awakening condition: ${condition}`);
      return false;
  }
}

/**
 * Check if a card can be targeted based on its dormant state
 * @param card The card to check
 * @returns True if the card can be targeted
 */
export function canTargetCard(card: CardInstance): boolean {
  // Dormant minions cannot be targeted
  return !card.isDormant;
}
// NOTE: canCardAttack has been consolidated into client/src/game/combat/attackUtils.ts
// The authoritative function checks dormant state along with all other attack eligibility rules
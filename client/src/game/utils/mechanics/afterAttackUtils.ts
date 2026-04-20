/**
 * Utility functions for handling "after attack" effects 
 * Includes minions like Battlefiend that gain +1 Attack after your hero attacks
 */
import { GameState, CardInstance } from '../../types';
import { findCardInstance } from '../cards/cardUtils';
import { v4 as uuidv4 } from 'uuid';
import { logBuff } from '../gameLogUtils';

/**
 * Process effects that trigger after a hero attacks
 * @param state Current game state
 * @param playerType The player who attacked with their hero/weapon
 * @returns Updated game state with after-attack effects applied
 */
export function processAfterHeroAttackEffects(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  // Deep clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Get the player's battlefield
  const playerMinions = newState.players[playerType].battlefield || [];
  
  // Check for Battlefiend "after hero attacks" effect
  playerMinions.forEach((minion, index) => {
    // Check if the minion is Battlefiend
    if (minion.card.name === 'Battlefiend') {
      // Apply the +1 Attack buff
      const oldAttack = (minion.card as any).attack || 0;
      const newAttack = oldAttack + 1;
      (newState.players[playerType].battlefield[index].card as any).attack = newAttack;
      
      // Create a log entry
      const logEntry = {
        id: uuidv4(),
        type: 'buff',
        turn: newState.turnNumber,
        timestamp: Date.now(),
        text: `${playerType === 'player' ? 'Your' : "Opponent's"} Battlefiend gained +1 Attack after hero attack`,
        cardId: minion.instanceId,
        value: 1,
        attributeBuffed: 'attack'
      };
      
      if (newState.gameLog) {
        newState.gameLog.push(logEntry as any);
      } else {
        newState.gameLog = [logEntry as any];
      }
    }
  });
  
  return newState;
}

/**
 * Process "after attack" effects for any card (minions, heroes, etc.)
 * @param state Current game state
 * @param attackerType Type of attacker ('minion' or 'hero')
 * @param attackerId ID of the attacking entity
 * @param attackingPlayerType Player who owns the attacker
 * @returns Updated game state
 */
export function processAfterAttackEffects(
  state: GameState,
  attackerType: 'minion' | 'hero',
  attackerId: string,
  attackingPlayerType: 'player' | 'opponent'
): GameState {
  // Deep clone the state to avoid mutations
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Process minion-specific "after attack" effects
  if (attackerType === 'minion') {
    // Find the attacker minion - note that it might have been destroyed in combat
    const attackerField = newState.players[attackingPlayerType].battlefield || [];
    const attackerInfo = findCardInstance(attackerField, attackerId);
    
    // If attacker is no longer on the battlefield (destroyed in combat), just return the state
    if (!attackerInfo) {
      return newState;
    }
    
    const attacker = attackerInfo.card;
    const attackerBaseHealth = (attacker.card as any).health;
    
    // Gurubashi Berserker - After this minion takes damage, gain +3 Attack
    if (attacker.card.name === "Gurubashi Berserker" && 
        attacker.currentHealth !== undefined && 
        attackerBaseHealth !== undefined && 
        attacker.currentHealth < attackerBaseHealth) {
      // Gain +3 Attack after taking damage
      const oldAttack = (attacker.card as any).attack || 0;
      const newAttack = oldAttack + 3;
      
      // Update attack value
      (attackerField[attackerInfo.index].card as any).attack = newAttack;
      
      // Create a log entry for the buff
      const targetInstanceId = attackerInfo.card.instanceId;
      logBuff(newState, attackingPlayerType, targetInstanceId, 3, 0);
    }
  }
  
  return newState;
}

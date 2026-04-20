/**
 * Utility functions for Colossal minions
 * Colossal minions are large entities that summon additional body parts when played
 * All parts are connected and have synergy. When a main colossal minion is played,
 * its additional parts are automatically summoned
 */

import { CardInstance, GameState, CardData } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { findCardInstance, findCardById } from '../cards/cardUtils';
import { isMinion, getHealth, getAttack } from '../cards/typeGuards';
import { trackQuestProgress } from '../quests/questProgress';
import { debug } from '../../config/debugConfig';
import { MAX_BATTLEFIELD_SIZE } from '../../constants/gameConstants';

/**
 * Check if a card is a colossal minion
 * @param card The card to check
 * @returns True if the card has the colossal keyword
 */
export function isColossalMinion(card: CardInstance): boolean {
  return card.isColossal === true && !card.isSilenced;
}

/**
 * Initialize colossal effect when a card is played
 * @param card Card instance being played
 * @returns Updated card instance with colossal state set
 */
export function initializeColossalEffect(card: CardInstance): CardInstance {
  return {
    ...card,
    isColossal: true,
    colossalParts: [] // Initialize the array to track colossal parts
  };
}

/**
 * Get the array of part IDs that should be summoned when a colossal minion is played
 * In a real implementation, this would be part of the card data
 * @param colossalId The ID of the main colossal minion
 * @returns Array of card IDs for the parts
 */
export function getColossalParts(colossalId: number): number[] {
  // Map of colossal minions to their parts
  const colossalPartsMap: Record<number, number[]> = {
    // Example: Neptulon the Tidehunter (core minion) and its hands (parts)
    3001: [3002, 3002], // Neptulon with two identical hands
    
    // Example: Giga-Fin (core minion) and its fins/tail (parts)
    3003: [3004, 3005], // Giga-Fin with a fin and tail
    
    // Example: Colossus of the Moon (core minion) and its shields (parts)
    3006: [3007, 3007, 3007], // Colossus with three identical shields
  };
  
  return colossalPartsMap[colossalId] || [];
}

/**
 * Summon colossal parts when the main minion is played
 * @param state Current game state
 * @param mainMinionId The instanceId of the main colossal minion that was played
 * @param playerType The player who played the minion
 * @returns Updated game state with parts summoned
 */
export function summonColossalParts(
  state: GameState,
  mainMinionId: string,
  playerType: 'player' | 'opponent'
): GameState {
  // Deep clone the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Find the main minion
  const playerField = newState.players[playerType].battlefield;
  const foundMinion = findCardInstance(playerField, mainMinionId);
  
  if (!foundMinion) {
    debug.error(`Main colossal minion with ID ${mainMinionId} not found`);
    return newState;
  }
  
  const { card: mainMinionInstance, index: mainMinionIndex } = foundMinion;
  
  // Get the part IDs for this colossal minion
  const cardData = mainMinionInstance.card;
  const cardId = typeof cardData.id === 'number' ? cardData.id : parseInt(cardData.id as string, 10);
  const partIds = getColossalParts(cardId);
  
  if (partIds.length === 0) {
    return newState;
  }
  
  // Check if this is a known colossal minion that should trigger special animations
  const SPECIAL_COLOSSAL_IDS = {
    NEPTULON: 3001,      // Neptulon the Tidehunter
    GIGA_FIN: 3003,      // Giga-Fin
    COLOSSUS_MOON: 3006  // Colossus of the Moon
  };
  
  // If this is a special colossal minion with a 3D model, trigger the animation
  if (Object.values(SPECIAL_COLOSSAL_IDS).includes(cardId)) {
    if (!newState.animations) {
      newState.animations = [];
    }
    
    newState.animations.push({
      type: 'play',
      sourceId: cardId,
      // For center of screen animation
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      duration: 4000 // Longer duration for impressive colossal animations
    } as any);
  }
  
  const battlefieldCount = playerField.length;
  const availableSpace = MAX_BATTLEFIELD_SIZE - battlefieldCount;
  
  if (availableSpace <= 0) {
    return newState;
  }
  
  const partsToSummon = Math.min(partIds.length, availableSpace);
  const summonedParts: CardInstance[] = [];
  
  for (let i = 0; i < partsToSummon; i++) {
    const partId = partIds[i];
    const partData = findCardById(partId);
    
    if (!partData) {
      debug.error(`Part card with ID ${partId} not found`);
      continue;
    }
    
    // Create an instance for the part
    const partInstance: CardInstance = {
      instanceId: uuidv4(),
      card: partData,
      isPlayed: true,
      currentHealth: getHealth(partData),
      canAttack: false,
      isSummoningSick: true,
      attacksPerformed: 0,
      isColossalPart: true, // Mark as a part of a colossal minion
      parentColossalId: mainMinionId // Reference to the main minion
    };
    
    newState.players[playerType].battlefield.push(partInstance);
    summonedParts.push(partInstance);
    
    // Track quest progress for summoned colossal part
    trackQuestProgress(playerType, 'summon_minion', partInstance.card);
    
    newState.gameLog.push({
      id: uuidv4(),
      type: 'summon',
      turn: newState.turnNumber,
      timestamp: Date.now(),
      player: playerType,
      text: `${mainMinionInstance.card.name} summons ${partData.name}!`,
      cardId: partInstance.instanceId
    } as any);
  }
  
  // Update the main minion with references to its parts
  newState.players[playerType].battlefield[mainMinionIndex].colossalParts = summonedParts;
  
  return newState;
}

/**
 * Handle the death of a colossal minion or its part
 * Could be extended to implement special death effects when parts are killed
 * @param state Current game state
 * @param colossalId The instanceId of a colossal minion or part that died
 * @param playerType The player who controlled the minion
 * @returns Updated game state
 */
export function handleColossalMinionDeath(
  state: GameState,
  colossalId: string,
  playerType: 'player' | 'opponent'
): GameState {
  // Deep clone the state to avoid mutation
  let newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  // Find the minion that died
  const playerField = newState.players[playerType].battlefield;
  const foundMinion = findCardInstance(playerField, colossalId);
  
  if (!foundMinion) {
    return newState;
  }
  
  const { card: deadMinionInstance } = foundMinion;
  
  if (deadMinionInstance.isColossal) {
    return newState;
  }
  
  if (deadMinionInstance.isColossalPart && deadMinionInstance.parentColossalId) {
    const parentMinion = findCardInstance(playerField, deadMinionInstance.parentColossalId);
    
    if (parentMinion) {
      const parentIndex = parentMinion.index;
      const updatedParts = newState.players[playerType].battlefield[parentIndex].colossalParts || [];
      
      const filteredParts = updatedParts.filter((part: CardInstance) => part.instanceId !== colossalId);
      newState.players[playerType].battlefield[parentIndex].colossalParts = filteredParts;
      
      newState.gameLog.push({
        id: uuidv4(),
        type: 'death',
        turn: newState.turnNumber,
        timestamp: Date.now(),
        player: playerType,
        text: `${deadMinionInstance.card.name}, a part of ${parentMinion.card.card.name}, is destroyed!`,
        cardId: colossalId
      } as any);
    }
  }
  
  return newState;
}

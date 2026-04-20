/**
 * norseIntegration.ts
 * 
 * Central integration layer for Norse mythology systems in Ragnarok Poker.
 * Wires King passives, Hero passives, and Shared Deck mechanics into the game loop.
 * 
 * This module bridges the gap between:
 * - King passive definitions (kingDefinitions.ts) and execution (kingPassiveUtils.ts)
 * - Hero passive definitions (heroDefinitions.ts) and execution (norseHeroPowerUtils.ts)
 * - Shared deck store (sharedDeckStore.ts) and combat flow
 */

import { GameState, CardInstance } from '../types';
import {
  executeKingPassive,
  executeStartOfTurnKingPassives,
  executeEndOfTurnKingPassives,
  executeOnMinionDeathKingPassives,
  executeOnMinionPlayKingPassives,
  executeOnHealKingPassives,
  applyKingAuraBuffs,
  applyKingAuraToMinion,
  getKingPetBuffs
} from './kingPassiveUtils';
import { 
  executeHeroPassive,
  executeNorseHeroPower,
  canUseHeroPower,
  applyWeaponUpgrade,
  getNorseHeroById
} from './norseHeroPowerUtils';
import { HeroPassiveTrigger } from '../types/NorseTypes';
import { emitKingPassiveEvent } from '../stores/kingPassiveEventStore';
import { getKingById } from './kingPassiveUtils';

// Store references for current combat context
interface NorseGameContext {
  playerKingId: string | null;
  opponentKingId: string | null;
  playerHeroId: string | null;
  opponentHeroId: string | null;
  isInitialized: boolean;
}

let norseContext: NorseGameContext = {
  playerKingId: null,
  opponentKingId: null,
  playerHeroId: null,
  opponentHeroId: null,
  isInitialized: false
};

/**
 * Initialize Norse context for a combat session
 */
export function initializeNorseContext(
  playerKingId: string | null,
  opponentKingId: string | null,
  playerHeroId: string | null,
  opponentHeroId: string | null
): void {
  norseContext = {
    playerKingId,
    opponentKingId,
    playerHeroId,
    opponentHeroId,
    isInitialized: true
  };

  announceKingAuras(playerKingId, 'player');
  announceKingAuras(opponentKingId, 'opponent');
}

function announceKingAuras(kingId: string | null, ownerType: 'player' | 'opponent'): void {
  if (!kingId) return;
  const king = getKingById(kingId);
  if (!king) return;
  const auraPassive = king.passives.find(p => p.trigger === 'always' && p.isAura);
  if (auraPassive) {
    setTimeout(() => {
      emitKingPassiveEvent(kingId, king.name, auraPassive.name, auraPassive.description, ownerType);
    }, ownerType === 'player' ? 1500 : 2500);
  }
}

/**
 * Reset Norse context when combat ends
 */
export function resetNorseContext(): void {
  norseContext = {
    playerKingId: null,
    opponentKingId: null,
    playerHeroId: null,
    opponentHeroId: null,
    isInitialized: false
  };
}

/**
 * Check if Norse systems are active
 */
export function isNorseActive(): boolean {
  return norseContext.isInitialized;
}

/**
 * Get current Norse context
 */
export function getNorseContext(): NorseGameContext {
  return { ...norseContext };
}

// ==================== KING PASSIVE INTEGRATION ====================

/**
 * Process King passives at start of turn
 * Call this from endTurn() when switching to next player
 */
export function processKingStartOfTurn(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const kingId = playerType === 'player' ? norseContext.playerKingId : norseContext.opponentKingId;
  if (!kingId) return state;
  
  return executeStartOfTurnKingPassives(state, playerType, kingId);
}

/**
 * Process King passives at end of turn
 * Call this from endTurn() before switching players
 */
export function processKingEndOfTurn(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const kingId = playerType === 'player' ? norseContext.playerKingId : norseContext.opponentKingId;
  if (!kingId) return state;
  
  return executeEndOfTurnKingPassives(state, playerType, kingId);
}

/**
 * Process King passives when a minion is played
 * Call this from playCard() after placing a minion
 */
export function processKingOnMinionPlay(
  state: GameState,
  playerType: 'player' | 'opponent',
  minionInstanceId: string
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const kingId = playerType === 'player' ? norseContext.playerKingId : norseContext.opponentKingId;
  if (!kingId) return state;
  
  return executeOnMinionPlayKingPassives(state, playerType, kingId, minionInstanceId);
}

/**
 * Process King passives when a minion dies
 * Call this from damage processing when a minion is destroyed
 */
export function processKingOnMinionDeath(
  state: GameState,
  ownerType: 'player' | 'opponent',
  diedMinionInstanceId: string
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const kingId = ownerType === 'player' ? norseContext.playerKingId : norseContext.opponentKingId;
  if (!kingId) return state;
  
  return executeOnMinionDeathKingPassives(state, ownerType, kingId, diedMinionInstanceId);
}

/**
 * Process King passives when healing occurs
 * Call this from heal processing
 */
export function processKingOnHeal(
  state: GameState,
  playerType: 'player' | 'opponent',
  healedMinionIds: string[] = []
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const kingId = playerType === 'player' ? norseContext.playerKingId : norseContext.opponentKingId;
  if (!kingId) return state;
  
  return executeOnHealKingPassives(state, playerType, kingId, healedMinionIds);
}

/**
 * Apply King aura buffs to minions
 * Call this when calculating effective minion stats
 */
export function applyKingAuras(
  minions: CardInstance[],
  ownerType: 'player' | 'opponent'
): CardInstance[] {
  if (!norseContext.isInitialized) return minions;
  
  const kingId = ownerType === 'player' ? norseContext.playerKingId : norseContext.opponentKingId;
  if (!kingId) return minions;
  
  return applyKingAuraBuffs(kingId, minions, true);
}

// ==================== HERO PASSIVE INTEGRATION ====================

/**
 * Process Hero passives for a specific trigger
 */
export function processHeroPassive(
  state: GameState,
  playerType: 'player' | 'opponent',
  trigger: HeroPassiveTrigger,
  context?: {
    playedMinionId?: string;
    attackingMinionId?: string;
    attackTargetId?: string;
    targetIsFrozen?: boolean;
    targetType?: 'friendly' | 'enemy';
    minionElement?: string;
  }
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const heroId = playerType === 'player' ? norseContext.playerHeroId : norseContext.opponentHeroId;
  if (!heroId) return state;
  
  return executeHeroPassive(state, heroId, playerType, trigger, context);
}

/**
 * Process Hero passives at start of turn
 */
export function processHeroStartOfTurn(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  return processHeroPassive(state, playerType, 'start_of_turn');
}

/**
 * Process Hero passives at end of turn
 */
export function processHeroEndOfTurn(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  return processHeroPassive(state, playerType, 'end_of_turn');
}

/**
 * Process Hero passives when a minion is played
 */
export function processHeroOnMinionPlay(
  state: GameState,
  playerType: 'player' | 'opponent',
  minionInstanceId: string,
  minionElement?: string
): GameState {
  return processHeroPassive(state, playerType, 'on_minion_play', {
    playedMinionId: minionInstanceId,
    minionElement
  });
}

/**
 * Process Hero passives when a minion attacks
 */
export function processHeroOnMinionAttack(
  state: GameState,
  attackerOwner: 'player' | 'opponent',
  attackingMinionId: string,
  targetId: string,
  targetIsFrozen: boolean = false
): GameState {
  return processHeroPassive(state, attackerOwner, 'on_minion_attack', {
    attackingMinionId,
    attackTargetId: targetId,
    targetIsFrozen
  });
}

/**
 * Process Hero passives when a spell is cast
 */
export function processHeroOnSpellCast(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  return processHeroPassive(state, playerType, 'on_spell_cast');
}

/**
 * Process Hero passives when a minion dies
 */
export function processHeroOnMinionDeath(
  state: GameState,
  ownerType: 'player' | 'opponent',
  diedMinionInstanceId: string
): GameState {
  return processHeroPassive(state, ownerType, 'on_minion_death', {
    playedMinionId: diedMinionInstanceId
  });
}

/**
 * Process Hero passives when damage is dealt
 */
export function processHeroOnDamageDealt(
  state: GameState,
  dealerOwner: 'player' | 'opponent'
): GameState {
  return processHeroPassive(state, dealerOwner, 'on_damage_dealt');
}

/**
 * Process Hero passives when healing occurs
 */
export function processHeroOnHeal(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  return processHeroPassive(state, playerType, 'on_heal');
}

/**
 * Process Hero passives when cards are drawn
 */
export function processHeroOnDraw(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  return processHeroPassive(state, playerType, 'on_draw');
}

// ==================== COMBINED TURN PROCESSING ====================

/**
 * Process all Norse start-of-turn effects (King + Hero)
 * Call this at the beginning of a player's turn
 */
export function processAllStartOfTurnEffects(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  if (!norseContext.isInitialized) return state;
  
  let newState = state;
  
  // Process King start-of-turn
  newState = processKingStartOfTurn(newState, playerType);
  
  // Process Hero start-of-turn
  newState = processHeroStartOfTurn(newState, playerType);
  
  return newState;
}

/**
 * Process all Norse end-of-turn effects (King + Hero)
 * Call this at the end of a player's turn
 */
export function processAllEndOfTurnEffects(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  if (!norseContext.isInitialized) return state;
  
  let newState = state;
  
  // Process King end-of-turn
  newState = processKingEndOfTurn(newState, playerType);
  
  // Process Hero end-of-turn
  newState = processHeroEndOfTurn(newState, playerType);
  
  return newState;
}

/**
 * Process all Norse on-minion-play effects (King + Hero)
 * Call this after a minion is placed on the battlefield
 */
export function processAllOnMinionPlayEffects(
  state: GameState,
  playerType: 'player' | 'opponent',
  minionInstanceId: string,
  minionElement?: string
): GameState {
  if (!norseContext.isInitialized) return state;

  let newState = state;

  // Apply king aura buffs permanently to the newly played minion
  if (norseContext.playerKingId) {
    newState = applyKingAuraToMinion(newState, norseContext.playerKingId, 'player', playerType, minionInstanceId);
  }
  if (norseContext.opponentKingId) {
    newState = applyKingAuraToMinion(newState, norseContext.opponentKingId, 'opponent', playerType, minionInstanceId);
  }

  // Process King on-minion-play triggered effects (e.g. Audumbla heal)
  newState = processKingOnMinionPlay(newState, playerType, minionInstanceId);

  // Process Hero on-minion-play
  newState = processHeroOnMinionPlay(newState, playerType, minionInstanceId, minionElement);

  return newState;
}

/**
 * Process all Norse on-minion-death effects (King + Hero)
 * Call this when a minion dies
 */
export function processAllOnMinionDeathEffects(
  state: GameState,
  ownerType: 'player' | 'opponent',
  minionInstanceId: string
): GameState {
  if (!norseContext.isInitialized) return state;
  
  let newState = state;
  
  // Process King on-minion-death
  newState = processKingOnMinionDeath(newState, ownerType, minionInstanceId);
  
  // Process Hero on-minion-death
  newState = processHeroOnMinionDeath(newState, ownerType, minionInstanceId);
  
  return newState;
}

// ==================== WEAPON UPGRADE INTEGRATION ====================

/**
 * Play a weapon upgrade card
 * Call this when a weapon upgrade card is played from hand
 */
export function playWeaponUpgrade(
  state: GameState,
  playerType: 'player' | 'opponent'
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const heroId = playerType === 'player' ? norseContext.playerHeroId : norseContext.opponentHeroId;
  if (!heroId) return state;
  
  return applyWeaponUpgrade(state, playerType, heroId);
}

/**
 * Check if player can play weapon upgrade
 */
export function canPlayWeaponUpgrade(
  state: GameState,
  playerType: 'player' | 'opponent'
): boolean {
  if (!norseContext.isInitialized) return false;
  
  const heroId = playerType === 'player' ? norseContext.playerHeroId : norseContext.opponentHeroId;
  if (!heroId) return false;
  
  const hero = getNorseHeroById(heroId);
  if (!hero) return false;
  
  const player = state.players[playerType];
  
  // Check mana (weapon upgrades cost 5 mana)
  if (player.mana.current < 5) return false;
  
  // Check if already upgraded (would need to track this in state)
  // For now, allow multiple upgrades
  
  return true;
}

// ==================== HERO POWER INTEGRATION ====================

/**
 * Execute Norse hero power
 * Wrapper that uses the context-aware hero ID
 */
export function executeHeroPower(
  state: GameState,
  playerType: 'player' | 'opponent',
  targetId?: string,
  isUpgraded: boolean = false
): GameState {
  if (!norseContext.isInitialized) return state;
  
  const heroId = playerType === 'player' ? norseContext.playerHeroId : norseContext.opponentHeroId;
  if (!heroId) return state;
  
  return executeNorseHeroPower(state, playerType, heroId, targetId, isUpgraded);
}

/**
 * Check if hero power can be used
 */
export function canUseNorseHeroPower(
  state: GameState,
  playerType: 'player' | 'opponent'
): boolean {
  if (!norseContext.isInitialized) return false;
  
  const heroId = playerType === 'player' ? norseContext.playerHeroId : norseContext.opponentHeroId;
  if (!heroId) return false;
  
  return canUseHeroPower(state, playerType, heroId);
}

// ==================== EXPORTS FOR EXTERNAL USE ====================

export {
  // Re-export utility functions for direct use
  getKingPetBuffs,
  getNorseHeroById,
  executeNorseHeroPower,
  canUseHeroPower,
  applyWeaponUpgrade,
  applyKingAuraBuffs
};

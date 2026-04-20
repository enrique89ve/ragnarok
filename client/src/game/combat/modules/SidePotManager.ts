/**
 * SidePotManager.ts
 * 
 * Manages side pots for all-in scenarios with unequal stacks.
 * Implements proper poker side pot calculation.
 */

import { PlayerCombatState } from '../../types/PokerCombatTypes';
import { COMBAT_DEBUG } from '../debugConfig';
import { debug } from '../../config/debugConfig';

export interface SidePot {
  id: string;
  amount: number;
  eligiblePlayers: string[];
  isMainPot: boolean;
}

export interface PotState {
  mainPot: number;
  sidePots: SidePot[];
  allInPlayers: Set<string>;
}

/**
 * Calculate side pots when a player goes all-in
 * Preserves existing pot and layers side pots on top
 */
export function calculateSidePots(
  player: PlayerCombatState,
  opponent: PlayerCombatState,
  currentPot: number
): PotState {
  const playerTotal = player.hpCommitted;
  const opponentTotal = opponent.hpCommitted;
  
  // HP is already deducted when committed, so all-in = no HP left (or less than min bet)
  const minBet = 5; // Standard Ragnarok min bet
  const playerAllIn = player.pet.stats.currentHealth < minBet;
  const opponentAllIn = opponent.pet.stats.currentHealth < minBet;
  
  const allInPlayers = new Set<string>();
  if (playerAllIn) allInPlayers.add(player.playerId);
  if (opponentAllIn) allInPlayers.add(opponent.playerId);
  
  // No all-in: entire pot is the main pot
  if (!playerAllIn && !opponentAllIn) {
    return {
      mainPot: currentPot,
      sidePots: [],
      allInPlayers
    };
  }
  
  // Calculate matched portion (what both players can contest)
  const minCommitted = Math.min(playerTotal, opponentTotal);
  const matchedPortion = minCommitted * 2;
  
  // The excess goes to a side pot (uncalled bet returned to the player with more)
  const excess = Math.abs(playerTotal - opponentTotal);
  const sidePots: SidePot[] = [];
  
  // Main pot is the prior pot plus the matched commitments this round
  // Prior pot = currentPot - (playerTotal + opponentTotal) [what was already there]
  // But since currentPot already includes this round's commitments, we use it directly
  // Main pot = what both players are eligible to win
  const mainPot = currentPot - excess;
  
  if (excess > 0) {
    const excessPlayer = playerTotal > opponentTotal ? player : opponent;
    
    sidePots.push({
      id: `side_${Date.now()}`,
      amount: excess,
      eligiblePlayers: [excessPlayer.playerId],
      isMainPot: false
    });
    
    debug.combat(`[SidePot] Uncalled bet of ${excess} for ${excessPlayer.playerName} (will be returned)`);
  }
  
  return {
    mainPot: Math.max(0, mainPot),
    sidePots,
    allInPlayers
  };
}

/**
 * Award pots to winner(s)
 */
export function awardPots(
  potState: PotState,
  winnerId: string,
  players: Map<string, PlayerCombatState>
): Map<string, number> {
  const awards = new Map<string, number>();
  
  for (const [playerId] of players) {
    awards.set(playerId, 0);
  }
  
  awards.set(winnerId, (awards.get(winnerId) || 0) + potState.mainPot);
  debug.combat(`[SidePot] ${winnerId} wins main pot of ${potState.mainPot}`);
  
  for (const sidePot of potState.sidePots) {
    if (sidePot.eligiblePlayers.includes(winnerId)) {
      awards.set(winnerId, (awards.get(winnerId) || 0) + sidePot.amount);
      debug.combat(`[SidePot] ${winnerId} wins side pot of ${sidePot.amount}`);
    } else if (sidePot.eligiblePlayers.length === 1) {
      const returnTo = sidePot.eligiblePlayers[0];
      awards.set(returnTo, (awards.get(returnTo) || 0) + sidePot.amount);
      debug.combat(`[SidePot] ${returnTo} has uncalled bet of ${sidePot.amount} returned`);
    }
  }
  
  return awards;
}

/**
 * Check if player can continue betting or is all-in
 * HP is already deducted when committed, so all-in = less than min bet left
 */
export function isPlayerAllIn(player: PlayerCombatState, minBet: number = 5): boolean {
  return player.pet.stats.currentHealth < minBet;
}

/**
 * Calculate maximum possible bet for a player
 * HP is already deducted when committed, so availableHP = currentHealth
 */
export function getMaxBet(player: PlayerCombatState): number {
  return Math.max(0, player.pet.stats.currentHealth);
}

/**
 * Calculate effective stack (smallest stack in play)
 * HP is already deducted when committed, so availableHP = currentHealth
 */
export function getEffectiveStack(
  player: PlayerCombatState,
  opponent: PlayerCombatState
): number {
  const playerStack = player.pet.stats.currentHealth;
  const opponentStack = opponent.pet.stats.currentHealth;
  return Math.min(playerStack, opponentStack);
}

/**
 * Format pot display string
 */
export function formatPotDisplay(potState: PotState): string {
  let display = `Main Pot: ${potState.mainPot}`;
  
  if (potState.sidePots.length > 0) {
    const sidePotTotal = potState.sidePots.reduce((sum, p) => sum + p.amount, 0);
    display += ` | Side Pots: ${sidePotTotal}`;
  }
  
  return display;
}

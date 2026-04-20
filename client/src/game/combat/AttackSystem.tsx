/**
 * AttackSystem.tsx
 * 
 * A comprehensive CCG-style attack system that handles:
 * - Attack eligibility (summoning sickness, charge, rush)
 * - Attack targeting (taunt, valid targets)
 * - Attack resolution (damage calculation, divine shield)
 * - Post-attack effects (card state updates, death handling)
 * 
 * IMPORTANT: All attack eligibility checks use the authoritative function
 * from attackUtils.ts to ensure consistent behavior across the codebase.
 */

import React, { useEffect } from 'react';
import { useAttackStore } from './attackStore';
import { CardInstance } from '../types';
import AttackIndicator from './AttackIndicator';
import './AttackStyles.css';
import { Position } from '../types/Position';
import { GameState } from '../types';
import { destroyCard } from '../utils/zoneUtils';
import { dealDamage } from '../utils/effects/damageUtils';
// AUTHORITATIVE canCardAttack function - single source of truth
import { getAttackEligibility } from './attackUtils';
import { debug } from '../config/debugConfig';
import { hasKeyword } from '../utils/cards/keywordUtils';

// Types
export type AttackTarget = {
  id: string;
  type: 'minion' | 'hero';
  playerId: 'player' | 'opponent';
};

export type AttackResult = {
  success: boolean;
  newState?: GameState;
  message?: string;
  animations?: AttackAnimation[];
};

type AttackAnimation = {
  type: 'attack' | 'damage' | 'death';
  sourceId: string;
  targetId: string;
};

/**
 * Check if a card can attack based on game rules.
 * 
 * NOTE: This is a wrapper around the authoritative canCardAttack from attackUtils.ts
 * to maintain backwards compatibility. All new code should import from attackUtils directly.
 */
export function canCardAttack(card: CardInstance, isPlayerTurn: boolean): boolean {
  // Use the authoritative function with verbose logging
  const result = getAttackEligibility(card, isPlayerTurn);
  
  debug.combat('[AttackSystem.canCardAttack]', {
    name: card.card.name,
    instanceId: card.instanceId,
    canAttack: result.canAttack,
    reason: result.reason || 'eligible',
    state: {
      isSummoningSick: card.isSummoningSick,
      canAttackFlag: card.canAttack,
      attacksPerformed: card.attacksPerformed || 0,
      isFrozen: card.isFrozen
    }
  });
  
  return result.canAttack;
}

/**
 * Check if a target is valid for an attack based on game rules
 */
export function isValidAttackTarget(
  state: GameState,
  attacker: CardInstance,
  targetId: string | undefined,
  targetType: 'minion' | 'hero' = 'minion'
): boolean {
  // If targeting a hero (no target ID provided, or explicitly targeting hero)
  if (!targetId || targetType === 'hero') {
    // Cards with Rush can only attack minions in the turn they're played
    const hasRush = hasKeyword(attacker, 'rush');
    const hasCharge = hasKeyword(attacker, 'charge');
    
    if (attacker.isSummoningSick && hasRush && !hasCharge) {
      return false;
    }

    // Check if opponent has taunt minions
    const opponentHasTaunt = state.players.opponent.battlefield.some(
      card => hasKeyword(card, 'taunt')
    );

    if (opponentHasTaunt) {
      return false;
    }

    return true;
  }

  // Targeting a minion
  const targetMinion = state.players.opponent.battlefield.find(
    card => card.instanceId === targetId
  );

  if (!targetMinion) {
    return false;
  }

  // Check for taunt
  const opponentHasTaunt = state.players.opponent.battlefield.some(
    card => hasKeyword(card, 'taunt')
  );

  if (opponentHasTaunt && !hasKeyword(targetMinion, 'taunt')) {
    return false;
  }

  return true;
}

/**
 * Execute an attack between attacker and target
 * Handles all combat calculations and state updates
 */
export function executeAttack(
  state: GameState,
  attackerId: string,
  targetId?: string,
  targetType: 'minion' | 'hero' = 'hero'
): AttackResult {
  const newState = cloneGameState(state);
  const attacker = newState.players.player.battlefield.find(
    card => card.instanceId === attackerId
  );

  if (!attacker) {
    return createFailureResult('Attacker not found on battlefield');
  }

  if (!canCardAttack(attacker as CardInstance, true)) {
    return createFailureResult('Card cannot attack');
  }

  return !targetId || targetType === 'hero'
    ? resolveHeroAttack(newState, attacker, attackerId)
    : resolveMinionAttack(newState, attacker, attackerId, targetId);
}

/**
 * Reset attack state for a new turn
 * Called at the beginning of each turn to reset attack counters
 */
export function resetAttackStateForTurn(state: GameState, playerId: 'player' | 'opponent'): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  newState.players[playerId].battlefield = newState.players[playerId].battlefield.map(card => ({
    ...card,
    attacksPerformed: 0,
    isSummoningSick: false,
    canAttack: true,
  }));
  
  return newState;
}

/**
 * Format info about a card's attack status for debugging
 */
export function getAttackStatusInfo(card: CardInstance, isPlayerTurn: boolean): string {
  const hasCharge = hasKeyword(card, 'charge');
  const hasRush = hasKeyword(card, 'rush');
  const hasWindfury = hasKeyword(card, 'windfury');
  
  return `
    Name: ${card.card.name}
    Can Attack: ${canCardAttack(card, isPlayerTurn)}
    Is Player Turn: ${isPlayerTurn}
    Summoning Sickness: ${card.isSummoningSick}
    Has Charge: ${hasCharge}
    Has Rush: ${hasRush}
    Has Windfury: ${hasWindfury}
    Attacks Performed: ${card.attacksPerformed || 0}/${hasWindfury ? 2 : 1}
  `;
}

// React Component
interface AttackSystemProps {
  isPlayerTurn: boolean;
  cardPositions: Record<string, Position>;
  getBoardCenter: () => Position;
  onAttackComplete?: () => void;
}

const AttackSystem: React.FC<AttackSystemProps> = ({
  cardPositions,
  getBoardCenter,
}) => {
  const { attackingCard, isAttackMode, cancelAttack } = useAttackStore();
  
  // Handle escape key to cancel attack
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAttackMode) {
        cancelAttack();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAttackMode, cancelAttack]);

  return (
    <>
      {/* Render attack indicators when in attack mode */}
      {isAttackMode && attackingCard && cardPositions[attackingCard.instanceId] && (
        <AttackIndicator 
          fromPosition={cardPositions[attackingCard.instanceId]}
          toPosition={getBoardCenter()}
          isActive={true}
        />
      )}
      
      {/* This component doesn't render anything else directly,
          it just provides methods to the parent component */}
    </>
  );
};

// Export the component as default and helper methods as named exports
export { useAttackStore };
export default AttackSystem;

function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function createFailureResult(message: string): AttackResult {
  return {
    success: false,
    message,
  };
}

function createSuccessResult(newState: GameState, animations: AttackAnimation[]): AttackResult {
  return {
    success: true,
    newState,
    animations,
  };
}

function getCombatDamage(card: CardInstance): number {
  return card.card.type === 'minion' ? (card.card.attack ?? 0) : 0;
}

function resolveHeroAttack(
  state: GameState,
  attacker: CardInstance,
  attackerId: string,
): AttackResult {
  if (!isValidAttackTarget(state, attacker, undefined, 'hero')) {
    return createFailureResult('Invalid hero attack');
  }

  const animations: AttackAnimation[] = [
    { type: 'attack', sourceId: attackerId, targetId: 'opponent-hero' },
    { type: 'damage', sourceId: attackerId, targetId: 'opponent-hero' },
  ];
  const damagedState = dealDamage(
    state,
    'opponent',
    'hero',
    getCombatDamage(attacker),
    undefined,
    undefined,
    'player',
  );

  return createSuccessResult(
    finalizeAttackerAfterAttack(damagedState, attackerId, false),
    animations,
  );
}

function resolveMinionAttack(
  state: GameState,
  attacker: CardInstance,
  attackerId: string,
  targetId: string,
): AttackResult {
  const targetMinion = state.players.opponent.battlefield.find(
    card => card.instanceId === targetId
  );
  if (!targetMinion) {
    return createFailureResult('Target minion not found');
  }

  if (!isValidAttackTarget(state, attacker, targetId, 'minion')) {
    return createFailureResult('Invalid minion attack');
  }

  const animations: AttackAnimation[] = [
    { type: 'attack', sourceId: attackerId, targetId },
  ];
  const combatOutcome = exchangeMinionDamage(attacker, targetMinion, attackerId, targetId, animations);
  const withDestroyedTarget = combatOutcome.targetDestroyed
    ? destroyCard(state, targetId, 'opponent')
    : state;

  return createSuccessResult(
    finalizeAttackerAfterAttack(withDestroyedTarget, attackerId, combatOutcome.attackerDestroyed),
    animations,
  );
}

function exchangeMinionDamage(
  attacker: CardInstance,
  targetMinion: CardInstance,
  attackerId: string,
  targetId: string,
  animations: AttackAnimation[],
): { attackerDestroyed: boolean; targetDestroyed: boolean } {
  applyCombatDamage(attacker, targetMinion, attackerId, targetId, animations);
  applyCombatDamage(targetMinion, attacker, targetId, attackerId, animations);

  const targetDestroyed = (targetMinion.currentHealth ?? 0) <= 0;
  const attackerDestroyed = (attacker.currentHealth ?? 0) <= 0;
  if (targetDestroyed) {
    animations.push({ type: 'death', sourceId: attackerId, targetId });
  }
  if (attackerDestroyed) {
    animations.push({ type: 'death', sourceId: targetId, targetId: attackerId });
  }

  return { attackerDestroyed, targetDestroyed };
}

function applyCombatDamage(
  source: CardInstance,
  target: CardInstance,
  sourceId: string,
  targetId: string,
  animations: AttackAnimation[],
): void {
  const mutableTarget = target;
  if (mutableTarget.hasDivineShield) {
    mutableTarget.hasDivineShield = false;
    return;
  }

  if (mutableTarget.currentHealth !== undefined) {
    mutableTarget.currentHealth -= getCombatDamage(source);
  }

  animations.push({ type: 'damage', sourceId, targetId });
}

function finalizeAttackerAfterAttack(
  state: GameState,
  attackerId: string,
  attackerDestroyed: boolean,
): GameState {
  if (attackerDestroyed) {
    return destroyCard(state, attackerId, 'player');
  }

  const updatedAttackerIndex = state.players.player.battlefield.findIndex(
    card => card.instanceId === attackerId
  );
  if (updatedAttackerIndex === -1) {
    return state;
  }

  const battlefield = state.players.player.battlefield.slice();
  const updatedAttacker = battlefield[updatedAttackerIndex];
  const attacksPerformed = (updatedAttacker.attacksPerformed || 0) + 1;
  const maxAttacks = hasKeyword(updatedAttacker, 'windfury') ? 2 : 1;

  battlefield[updatedAttackerIndex] = {
    ...updatedAttacker,
    attacksPerformed,
    canAttack: attacksPerformed < maxAttacks,
  };

  return {
    ...state,
    players: {
      ...state.players,
      player: {
        ...state.players.player,
        battlefield,
      },
    },
  };
}

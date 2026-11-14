/**
 * CombatEventSubscribers — non-VFX reactions to the combat bus.
 *
 * Visual effects go through `combat/vfx` adapters. This module must not
 * write HP or schedule particles.
 */

import { CombatEventBus, CombatEvent, AttackBlockedEvent } from './CombatEventBus';
import { debug } from '../config/debugConfig';
import { GAME_MESSAGE_IDS } from '@/game/effects/feedback/gameMessageCatalog';
import { enqueueGameplayMessage } from '@/game/effects/presentation/presentationOrchestrator';
import { adaptCombatBusToVisual } from '../combat/vfx/adaptCombatBusToVisual';

let initialized = false;
const unsubscribers: (() => void)[] = [];

/**
 * Initialize all combat event subscribers
 * Call this once when the game loads
 */
export function initializeCombatEventSubscribers(): void {
  if (initialized) {
    debug.combat('[CombatEventSubscribers] Already initialized, skipping');
    return;
  }

  debug.combat('[CombatEventSubscribers] Initializing combat event subscribers...');

  unsubscribers.push(adaptCombatBusToVisual());
  unsubscribers.push(subscribeCombatLog());
  unsubscribers.push(subscribeBlockedAttackNotifications());

  initialized = true;
  debug.combat(`[CombatEventSubscribers] Initialized ${unsubscribers.length} subscribers`);
}

/**
 * Cleanup all subscribers (for hot reload or unmounting)
 */
export function cleanupCombatEventSubscribers(): void {
  for (const unsubscribe of unsubscribers) {
    unsubscribe();
  }
  unsubscribers.length = 0;
  initialized = false;
  debug.combat('[CombatEventSubscribers] Cleaned up all subscribers');
}

/**
 * Combat Log Subscriber
 * Records all combat events for debugging and replay
 */
function subscribeCombatLog(): () => void {
  return CombatEventBus.subscribe<CombatEvent>('*', (event) => {
    const logPrefix = `[CombatLog][Turn ${event.turn}]`;
    
    switch (event.type) {
      case 'ATTACK_STARTED':
        debug.combat(`${logPrefix} Attack started: ${event.attackerId} -> ${event.targetId}`);
        break;
      case 'DAMAGE_INTENT':
        debug.combat(`${logPrefix} Damage intent: ${event.intendedDamage} from ${event.sourceId} to ${event.targetId}`);
        break;
      case 'IMPACT_PHASE':
        debug.combat(`${logPrefix} IMPACT! ${event.damageToTarget} damage to target, ${event.damageToAttacker} counter damage`);
        break;
      case 'DAMAGE_RESOLVED':
        debug.combat(`${logPrefix} Damage resolved: ${event.actualDamage} to ${event.targetId} (${event.targetHealthBefore} -> ${event.targetHealthAfter})${event.targetDied ? ' [DIED]' : ''}`);
        break;
      case 'ATTACK_BLOCKED':
        debug.combat(`${logPrefix} Attack BLOCKED: ${event.attackerId} - ${event.reason}: ${event.message}`);
        break;
      case 'ATTACK_COMPLETED':
        debug.combat(`${logPrefix} Attack completed: ${event.attackerId} -> ${event.targetId} (success: ${event.success})`);
        break;
      case 'DEATH_TRIGGERED':
        debug.combat(`${logPrefix} DEATH: ${event.diedId} (${event.diedType}) killed by ${event.killerId || 'unknown'}`);
        break;
    }
  }, -100);
}

/**
 * Blocked Attack Notification Subscriber
 * Shows user-friendly visual messages when attacks are blocked
 */
function subscribeBlockedAttackNotifications(): () => void {
  return CombatEventBus.subscribe<AttackBlockedEvent>('ATTACK_BLOCKED', (event) => {
    debug.warn(`[AttackBlocked] ${event.message}`);
    enqueueGameplayMessage({
      id: GAME_MESSAGE_IDS.COMBAT_ATTACK_BLOCKED,
      params: { reason: event.reason, detail: event.message },
    });
  }, 50);
}

export default {
  initialize: initializeCombatEventSubscribers,
  cleanup: cleanupCombatEventSubscribers
};

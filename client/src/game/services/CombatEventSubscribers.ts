/**
 * CombatEventSubscribers - Register all systems that react to combat events
 * 
 * This file sets up all the subscribers that listen to the CombatEventBus.
 * Each subscriber reacts independently to combat events, ensuring all systems
 * stay synchronized without tight coupling.
 * 
 * Subscribers:
 * - Poker Combat HP: Updates the poker combat display when damage is resolved
 * - Animation System: Plays visual effects at the right timing
 * - Sound System: Plays audio feedback
 * - Combat Log: Records combat history for debugging
 */

import { CombatEventBus, CombatEvent, AttackBlockedEvent, ImpactPhaseEvent } from './CombatEventBus';
import { getPokerCombatAdapterState } from '../hooks/usePokerCombatAdapter';
import { useUnifiedUIStore } from '../stores/unifiedUIStore';
import { scheduleDamageEffect } from '../animations/UnifiedAnimationOrchestrator';
import { debug } from '../config/debugConfig';
import type { IconName } from '../utils/ui/iconMap';
import {
  getArenaVfxCombatantTarget,
  getArenaVfxHeroTarget,
  getArenaVfxMinionFieldTarget,
  getElementCenter,
} from '../combat/arenaVfxTargets';

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

  unsubscribers.push(subscribePokerCombatHP());
  unsubscribers.push(subscribeCombatLog());
  unsubscribers.push(subscribeBlockedAttackNotifications());
  unsubscribers.push(subscribeDamageAnimations());

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
 * Poker Combat HP Subscriber
 * Updates poker combat display when damage is resolved at the 600ms impact point
 */
function subscribePokerCombatHP(): () => void {
  return CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', (event) => {
    const pokerStore = getPokerCombatAdapterState();
    
    if (event.damageToTarget > 0) {
      const isHeroTarget = event.targetId.includes('hero');
      
      if (isHeroTarget) {
        const targetOwner = event.targetId.includes('player') ? 'player' : 'opponent';
        
        if (targetOwner === 'player') {
          pokerStore.applyDirectDamage('player', event.damageToTarget);
        } else {
          pokerStore.applyDirectDamage('opponent', event.damageToTarget);
        }
        
        debug.combat(`[PokerCombatHP] Applied ${event.damageToTarget} damage to ${targetOwner} hero via CombatEventBus`);
      } else {
        debug.combat(`[PokerCombatHP] Minion damage: ${event.damageToTarget} to ${event.targetId} (minion HP handled by gameStore)`);
      }
    }

    if (event.damageToAttacker > 0) {
      const isHeroAttacker = event.attackerId.includes('hero');
      
      if (isHeroAttacker) {
        const attackerOwner = event.attackerId.includes('player') ? 'player' : 'opponent';
        
        if (attackerOwner === 'player') {
          pokerStore.applyDirectDamage('player', event.damageToAttacker);
        } else {
          pokerStore.applyDirectDamage('opponent', event.damageToAttacker);
        }
        
        debug.combat(`[PokerCombatHP] Applied ${event.damageToAttacker} counter damage to ${attackerOwner} hero via CombatEventBus`);
      }
    }
  }, 100);
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
    
    // Show visual notification to user
    const animationStore = useUnifiedUIStore.getState();
    
    // Map block reasons to user-friendly messages and icons
    const reasonMessages: Record<string, { title: string; iconName: IconName }> = {
      'taunt': { title: 'Blocked by Taunt!', iconName: 'shield' },
      'summoning_sickness': { title: 'Must wait a turn!', iconName: 'sparkles' },
      'stealth': { title: 'Target is Stealthed!', iconName: 'eye' },
      'immune': { title: 'Target is Immune!', iconName: 'sparkles' },
      'invalid_target': { title: 'Invalid Target!', iconName: 'x' },
      'no_attack': { title: 'Cannot Attack!', iconName: 'warning' },
      'already_attacked': { title: 'Already Attacked!', iconName: 'refresh' }
    };
    
    const messageInfo = reasonMessages[event.reason] || { title: 'Attack Blocked!', iconName: 'ban' as IconName };
    
    animationStore.addAnnouncement({
      type: 'blocked',
      title: messageInfo.title,
      subtitle: event.message,
      iconName: messageInfo.iconName,
      duration: 1500
    });
  }, 50);
}

/**
 * Damage Animation Subscriber
 * Shows floating damage numbers when damage is dealt to minions and heroes
 */
function subscribeDamageAnimations(): () => void {
  return CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', (event) => {
    const { attackerId, targetId, damageToTarget, damageToAttacker } = event;
    
    // Show damage popup for target
    if (damageToTarget > 0) {
      const targetPosition = getPositionForTarget(targetId);
      if (targetPosition) {
        scheduleDamageEffect(targetPosition, damageToTarget, 'combat-damage');
        debug.combat(`[DamageAnimation] Showing -${damageToTarget} at target ${targetId}`);
      }
    }
    
    // Show counter damage popup for attacker (if minion vs minion)
    if (damageToAttacker > 0) {
      const attackerPosition = getPositionForTarget(attackerId);
      if (attackerPosition) {
        // Slight delay for counter damage to feel more natural
        setTimeout(() => {
          scheduleDamageEffect(attackerPosition, damageToAttacker, 'combat-counter');
          debug.combat(`[DamageAnimation] Showing -${damageToAttacker} counter at attacker ${attackerId}`);
        }, 100);
      }
    }
  }, 75); // Priority between HP update (100) and log (-100)
}

/**
 * Get screen position for a target (minion or hero)
 */
function getPositionForTarget(targetId: string): { x: number; y: number } | null {
  // Check for hero targets
  if (targetId.includes('hero') || targetId === 'opponent-hero' || targetId === 'player-hero') {
    const isOpponent = targetId.includes('opponent') || targetId === 'opponent-hero';
    const heroElement = getArenaVfxHeroTarget(isOpponent ? 'opponent' : 'player');
    if (heroElement) {
      return getElementCenter(heroElement, 1 / 3);
    }

    // Fallback positions if DOM element not found
    return isOpponent 
      ? { x: window.innerWidth / 2, y: window.innerHeight * 0.2 }
      : { x: window.innerWidth / 2, y: window.innerHeight * 0.8 };
  }

  // Try to find minion by instance ID in DOM
  const minionElement = getArenaVfxCombatantTarget(targetId);

  if (minionElement) {
    return getElementCenter(minionElement, 1 / 4);
  }

  const opponentBattlefield = getArenaVfxMinionFieldTarget('opponent');
  const playerBattlefield = getArenaVfxMinionFieldTarget('player');
  const preferredBattlefield = opponentBattlefield ?? playerBattlefield;

  if (preferredBattlefield) {
    return getElementCenter(preferredBattlefield);
  }

  return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
}

export default {
  initialize: initializeCombatEventSubscribers,
  cleanup: cleanupCombatEventSubscribers
};

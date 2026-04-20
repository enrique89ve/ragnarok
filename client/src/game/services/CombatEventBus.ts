/**
 * CombatEventBus - Professional event-driven combat architecture
 * 
 * This is the centralized event system for all combat events in the game.
 * All damage, attacks, and combat actions flow through this bus, ensuring
 * all subscribers (HP systems, animations, sounds, analytics) stay in sync.
 * 
 * Architecture pattern: Observer/Pub-Sub with typed events
 */

import { debug } from '../config/debugConfig';

export type CombatEventType = 
  | 'DAMAGE_INTENT'      // Something wants to deal damage
  | 'DAMAGE_RESOLVED'    // Damage was successfully applied
  | 'ATTACK_BLOCKED'     // Attack was blocked (taunt, summoning sickness, etc.)
  | 'ATTACK_STARTED'     // Attack animation begins
  | 'IMPACT_PHASE'       // 600ms impact point reached
  | 'ATTACK_COMPLETED'   // Attack fully resolved
  | 'HEAL_INTENT'        // Something wants to heal
  | 'HEAL_RESOLVED'      // Heal was applied
  | 'DEATH_TRIGGERED'    // A minion/hero died
  | 'COMBAT_LOG';        // General combat logging

export type DamageSource = 'minion_attack' | 'spell' | 'hero_power' | 'battlecry' | 'deathrattle' | 'fatigue' | 'weapon' | 'effect';
export type BlockReason = 'taunt' | 'summoning_sickness' | 'stealth' | 'immune' | 'invalid_target' | 'no_attack' | 'already_attacked';

export interface CombatEventBase {
  id: string;
  timestamp: number;
  turn: number;
}

export interface DamageIntentEvent extends CombatEventBase {
  type: 'DAMAGE_INTENT';
  sourceId: string;
  sourceType: 'minion' | 'hero' | 'spell' | 'effect';
  targetId: string;
  targetType: 'minion' | 'hero';
  intendedDamage: number;
  damageSource: DamageSource;
  attackerOwner: 'player' | 'opponent';
  defenderOwner: 'player' | 'opponent';
}

export interface DamageResolvedEvent extends CombatEventBase {
  type: 'DAMAGE_RESOLVED';
  sourceId: string;
  sourceType: 'minion' | 'hero' | 'spell' | 'effect';
  targetId: string;
  targetType: 'minion' | 'hero';
  actualDamage: number;
  damageSource: DamageSource;
  attackerOwner: 'player' | 'opponent';
  defenderOwner: 'player' | 'opponent';
  targetHealthBefore: number;
  targetHealthAfter: number;
  targetDied: boolean;
  counterDamage?: number;
  counterTargetHealthBefore?: number;
  counterTargetHealthAfter?: number;
  counterTargetDied?: boolean;
}

export interface AttackBlockedEvent extends CombatEventBase {
  type: 'ATTACK_BLOCKED';
  attackerId: string;
  targetId?: string;
  reason: BlockReason;
  message: string;
}

export interface AttackStartedEvent extends CombatEventBase {
  type: 'ATTACK_STARTED';
  attackerId: string;
  targetId: string;
  attackerPosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
}

export interface ImpactPhaseEvent extends CombatEventBase {
  type: 'IMPACT_PHASE';
  attackerId: string;
  targetId: string;
  damageToTarget: number;
  damageToAttacker: number;
}

export interface AttackCompletedEvent extends CombatEventBase {
  type: 'ATTACK_COMPLETED';
  attackerId: string;
  targetId: string;
  success: boolean;
}

export interface HealIntentEvent extends CombatEventBase {
  type: 'HEAL_INTENT';
  sourceId: string;
  targetId: string;
  intendedHeal: number;
}

export interface HealResolvedEvent extends CombatEventBase {
  type: 'HEAL_RESOLVED';
  sourceId: string;
  targetId: string;
  actualHeal: number;
  targetHealthBefore: number;
  targetHealthAfter: number;
}

export interface DeathTriggeredEvent extends CombatEventBase {
  type: 'DEATH_TRIGGERED';
  diedId: string;
  diedType: 'minion' | 'hero';
  killerId?: string;
  owner: 'player' | 'opponent';
}

export interface CombatLogEvent extends CombatEventBase {
  type: 'COMBAT_LOG';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export type CombatEvent = 
  | DamageIntentEvent 
  | DamageResolvedEvent 
  | AttackBlockedEvent 
  | AttackStartedEvent 
  | ImpactPhaseEvent 
  | AttackCompletedEvent
  | HealIntentEvent
  | HealResolvedEvent
  | DeathTriggeredEvent
  | CombatLogEvent;

type EventHandler<T extends CombatEvent = CombatEvent> = (event: T) => void;
type UnsubscribeFn = () => void;

interface Subscription {
  id: string;
  eventType: CombatEventType | '*';
  handler: EventHandler;
  priority: number;
}

class CombatEventBusImpl {
  private subscriptions: Subscription[] = [];
  private eventHistory: CombatEvent[] = [];
  private maxHistorySize = 100;
  private eventIdCounter = 0;
  private currentTurn = 1;

  generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventIdCounter}`;
  }

  setCurrentTurn(turn: number): void {
    this.currentTurn = turn;
  }

  subscribe<T extends CombatEvent>(
    eventType: CombatEventType | '*',
    handler: EventHandler<T>,
    priority: number = 0
  ): UnsubscribeFn {
    const subscription: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      handler: handler as EventHandler,
      priority
    };
    
    this.subscriptions.push(subscription);
    this.subscriptions.sort((a, b) => b.priority - a.priority);
    
    return () => {
      this.subscriptions = this.subscriptions.filter(s => s.id !== subscription.id);
    };
  }

  emit(event: CombatEvent): void {
    if (!event.id) {
      event.id = this.generateEventId();
    }
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    if (!event.turn) {
      event.turn = this.currentTurn;
    }

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const handlers = this.subscriptions.filter(
      s => s.eventType === event.type || s.eventType === '*'
    );

    for (const sub of handlers) {
      try {
        sub.handler(event);
      } catch (error) {
        debug.error(`[CombatEventBus] Handler error for ${event.type}:`, error);
      }
    }
  }

  emitDamageIntent(data: Omit<DamageIntentEvent, 'type' | 'id' | 'timestamp' | 'turn'>): DamageIntentEvent {
    const event: DamageIntentEvent = {
      ...data,
      type: 'DAMAGE_INTENT',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitDamageResolved(data: Omit<DamageResolvedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): DamageResolvedEvent {
    const event: DamageResolvedEvent = {
      ...data,
      type: 'DAMAGE_RESOLVED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitAttackBlocked(data: Omit<AttackBlockedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): AttackBlockedEvent {
    const event: AttackBlockedEvent = {
      ...data,
      type: 'ATTACK_BLOCKED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitAttackStarted(data: Omit<AttackStartedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): AttackStartedEvent {
    const event: AttackStartedEvent = {
      ...data,
      type: 'ATTACK_STARTED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitImpactPhase(data: Omit<ImpactPhaseEvent, 'type' | 'id' | 'timestamp' | 'turn'>): ImpactPhaseEvent {
    const event: ImpactPhaseEvent = {
      ...data,
      type: 'IMPACT_PHASE',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitAttackCompleted(data: Omit<AttackCompletedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): AttackCompletedEvent {
    const event: AttackCompletedEvent = {
      ...data,
      type: 'ATTACK_COMPLETED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitDeathTriggered(data: Omit<DeathTriggeredEvent, 'type' | 'id' | 'timestamp' | 'turn'>): DeathTriggeredEvent {
    const event: DeathTriggeredEvent = {
      ...data,
      type: 'DEATH_TRIGGERED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  getHistory(): CombatEvent[] {
    return [...this.eventHistory];
  }

  getHistoryByType(type: CombatEventType): CombatEvent[] {
    return this.eventHistory.filter(e => e.type === type);
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  getSubscriberCount(): number {
    return this.subscriptions.length;
  }
}

export const CombatEventBus = new CombatEventBusImpl();
export default CombatEventBus;

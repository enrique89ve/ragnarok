/**
 * GameEventBus - Unified event system for the entire game
 *
 * Extends the CombatEventBus pattern to handle all game events.
 * This is the central nervous system for event-driven architecture.
 *
 * Features:
 * - Type-safe event emission and subscription
 * - Priority-based handler execution
 * - Event history for debugging/replay
 * - Wildcard subscriptions
 * - Automatic event ID and timestamp generation
 * 
 * Added by Enrique - Event-driven architecture integration
 */

import type {
  GameEvent,
  GameEventType,
  GameEventBase,
  PhaseChangedEvent,
  SubPhaseChangedEvent,
  TurnStartedEvent,
  TurnEndedEvent,
  CardDrawnEvent,
  CardPlayedEvent,
  CardDiscardedEvent,
  MinionSummonedEvent,
  MinionDestroyedEvent,
  WeaponEquippedEvent,
  WeaponDestroyedEvent,
  SecretPlayedEvent,
  SecretRevealedEvent,
  BattlecryTriggeredEvent,
  DeathrattleTriggeredEvent,
  SpellCastEvent,
  AuraAppliedEvent,
  AuraRemovedEvent,
  BuffAppliedEvent,
  SilenceAppliedEvent,
  ManaSpentEvent,
  ManaCrystalGainedEvent,
  OverloadTriggeredEvent,
  HeroPowerUsedEvent,
  DiscoveryStartedEvent,
  DiscoveryCompletedEvent,
  MulliganStartedEvent,
  MulliganCompletedEvent,
  GameStartedEvent,
  GameEndedEvent,
  PokerHandRevealedEvent,
  BetPlacedEvent,
  ShowdownResultEvent,
  NotificationEvent,
  AnimationRequestEvent,
  SoundRequestEvent,
  PetEvolvedEvent,
  GamePhase,
  SubPhase
} from './GameEvents';

type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;
type UnsubscribeFn = () => void;

interface Subscription {
  id: string;
  eventType: GameEventType | '*';
  handler: EventHandler;
  priority: number;
}

class GameEventBusImpl {
  private subscriptions: Subscription[] = [];
  private eventHistory: GameEvent[] = [];
  private maxHistorySize = 200;
  private eventIdCounter = 0;
  private currentTurn = 1;
  private isPaused = false;
  private queuedEvents: GameEvent[] = [];

  /**
   * Generate a unique event ID
   */
  generateEventId(): string {
    return `game_evt_${Date.now()}_${++this.eventIdCounter}`;
  }

  /**
   * Set the current turn number for event metadata
   */
  setCurrentTurn(turn: number): void {
    this.currentTurn = turn;
  }

  /**
   * Get current turn number
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * Pause event emission (queues events instead)
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume event emission and flush queued events
   */
  resume(): void {
    this.isPaused = false;
    const queued = [...this.queuedEvents];
    this.queuedEvents = [];
    queued.forEach(event => this.emit(event));
  }

  /**
   * Subscribe to a specific event type or all events (*)
   */
  subscribe<T extends GameEvent>(
    eventType: GameEventType | '*',
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

  /**
   * Subscribe to multiple event types at once
   */
  subscribeMany<T extends GameEvent>(
    eventTypes: GameEventType[],
    handler: EventHandler<T>,
    priority: number = 0
  ): UnsubscribeFn {
    const unsubscribes = eventTypes.map(type =>
      this.subscribe(type, handler, priority)
    );
    return () => unsubscribes.forEach(unsub => unsub());
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: GameEvent): void {
    if (!event.id) {
      (event as GameEventBase).id = this.generateEventId();
    }
    if (!event.timestamp) {
      (event as GameEventBase).timestamp = Date.now();
    }
    if (!event.turn) {
      (event as GameEventBase).turn = this.currentTurn;
    }

    if (this.isPaused) {
      this.queuedEvents.push(event);
      return;
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
        console.error(`[GameEventBus] Handler error for ${event.type}:`, error);
      }
    }
  }

  /**
   * Get event history for debugging
   */
  getHistory(): GameEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Reset the event bus state
   */
  reset(): void {
    this.subscriptions = [];
    this.eventHistory = [];
    this.queuedEvents = [];
    this.isPaused = false;
    this.currentTurn = 1;
    this.eventIdCounter = 0;
  }

  // ============================================
  // Phase Event Helpers
  // ============================================

  emitPhaseChanged(
    fromPhase: GamePhase,
    toPhase: GamePhase,
    subPhase?: SubPhase
  ): PhaseChangedEvent {
    const event: PhaseChangedEvent = {
      type: 'PHASE_CHANGED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn,
      fromPhase,
      toPhase,
      subPhase
    };
    this.emit(event);
    return event;
  }

  emitSubPhaseChanged(
    phase: GamePhase,
    fromSubPhase: SubPhase | null,
    toSubPhase: SubPhase
  ): SubPhaseChangedEvent {
    const event: SubPhaseChangedEvent = {
      type: 'SUB_PHASE_CHANGED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn,
      phase,
      fromSubPhase,
      toSubPhase
    };
    this.emit(event);
    return event;
  }

  emitTurnStarted(
    player: 'player' | 'opponent',
    turnNumber: number
  ): TurnStartedEvent {
    this.currentTurn = turnNumber;
    const event: TurnStartedEvent = {
      type: 'TURN_STARTED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: turnNumber,
      player,
      turnNumber
    };
    this.emit(event);
    return event;
  }

  emitTurnEnded(
    player: 'player' | 'opponent',
    turnNumber: number
  ): TurnEndedEvent {
    const event: TurnEndedEvent = {
      type: 'TURN_ENDED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: turnNumber,
      player,
      turnNumber
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Card Event Helpers
  // ============================================

  emitCardDrawn(data: Omit<CardDrawnEvent, 'type' | 'id' | 'timestamp' | 'turn'>): CardDrawnEvent {
    const event: CardDrawnEvent = {
      ...data,
      type: 'CARD_DRAWN',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitCardPlayed(data: Omit<CardPlayedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): CardPlayedEvent {
    const event: CardPlayedEvent = {
      ...data,
      type: 'CARD_PLAYED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitCardDiscarded(data: Omit<CardDiscardedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): CardDiscardedEvent {
    const event: CardDiscardedEvent = {
      ...data,
      type: 'CARD_DISCARDED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitMinionSummoned(data: Omit<MinionSummonedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): MinionSummonedEvent {
    const event: MinionSummonedEvent = {
      ...data,
      type: 'MINION_SUMMONED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitMinionDestroyed(data: Omit<MinionDestroyedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): MinionDestroyedEvent {
    const event: MinionDestroyedEvent = {
      ...data,
      type: 'MINION_DESTROYED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitWeaponEquipped(data: Omit<WeaponEquippedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): WeaponEquippedEvent {
    const event: WeaponEquippedEvent = {
      ...data,
      type: 'WEAPON_EQUIPPED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitWeaponDestroyed(data: Omit<WeaponDestroyedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): WeaponDestroyedEvent {
    const event: WeaponDestroyedEvent = {
      ...data,
      type: 'WEAPON_DESTROYED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitSecretPlayed(data: Omit<SecretPlayedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): SecretPlayedEvent {
    const event: SecretPlayedEvent = {
      ...data,
      type: 'SECRET_PLAYED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitSecretRevealed(data: Omit<SecretRevealedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): SecretRevealedEvent {
    const event: SecretRevealedEvent = {
      ...data,
      type: 'SECRET_REVEALED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Effect Event Helpers
  // ============================================

  emitBattlecryTriggered(data: Omit<BattlecryTriggeredEvent, 'type' | 'id' | 'timestamp' | 'turn'>): BattlecryTriggeredEvent {
    const event: BattlecryTriggeredEvent = {
      ...data,
      type: 'BATTLECRY_TRIGGERED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitDeathrattleTriggered(data: Omit<DeathrattleTriggeredEvent, 'type' | 'id' | 'timestamp' | 'turn'>): DeathrattleTriggeredEvent {
    const event: DeathrattleTriggeredEvent = {
      ...data,
      type: 'DEATHRATTLE_TRIGGERED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitSpellCast(data: Omit<SpellCastEvent, 'type' | 'id' | 'timestamp' | 'turn'>): SpellCastEvent {
    const event: SpellCastEvent = {
      ...data,
      type: 'SPELL_CAST',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitAuraApplied(data: Omit<AuraAppliedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): AuraAppliedEvent {
    const event: AuraAppliedEvent = {
      ...data,
      type: 'AURA_APPLIED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitAuraRemoved(data: Omit<AuraRemovedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): AuraRemovedEvent {
    const event: AuraRemovedEvent = {
      ...data,
      type: 'AURA_REMOVED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitBuffApplied(data: Omit<BuffAppliedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): BuffAppliedEvent {
    const event: BuffAppliedEvent = {
      ...data,
      type: 'BUFF_APPLIED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitSilenceApplied(data: Omit<SilenceAppliedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): SilenceAppliedEvent {
    const event: SilenceAppliedEvent = {
      ...data,
      type: 'SILENCE_APPLIED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Mana Event Helpers
  // ============================================

  emitManaSpent(data: Omit<ManaSpentEvent, 'type' | 'id' | 'timestamp' | 'turn'>): ManaSpentEvent {
    const event: ManaSpentEvent = {
      ...data,
      type: 'MANA_SPENT',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitManaCrystalGained(data: Omit<ManaCrystalGainedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): ManaCrystalGainedEvent {
    const event: ManaCrystalGainedEvent = {
      ...data,
      type: 'MANA_CRYSTAL_GAINED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitOverloadTriggered(data: Omit<OverloadTriggeredEvent, 'type' | 'id' | 'timestamp' | 'turn'>): OverloadTriggeredEvent {
    const event: OverloadTriggeredEvent = {
      ...data,
      type: 'OVERLOAD_TRIGGERED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Hero Power Helper
  // ============================================

  emitHeroPowerUsed(data: Omit<HeroPowerUsedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): HeroPowerUsedEvent {
    const event: HeroPowerUsedEvent = {
      ...data,
      type: 'HERO_POWER_USED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Discovery Helpers
  // ============================================

  emitDiscoveryStarted(data: Omit<DiscoveryStartedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): DiscoveryStartedEvent {
    const event: DiscoveryStartedEvent = {
      ...data,
      type: 'DISCOVERY_STARTED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitDiscoveryCompleted(data: Omit<DiscoveryCompletedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): DiscoveryCompletedEvent {
    const event: DiscoveryCompletedEvent = {
      ...data,
      type: 'DISCOVERY_COMPLETED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Mulligan Helpers
  // ============================================

  emitMulliganStarted(data: Omit<MulliganStartedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): MulliganStartedEvent {
    const event: MulliganStartedEvent = {
      ...data,
      type: 'MULLIGAN_STARTED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitMulliganCompleted(data: Omit<MulliganCompletedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): MulliganCompletedEvent {
    const event: MulliganCompletedEvent = {
      ...data,
      type: 'MULLIGAN_COMPLETED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Game State Helpers
  // ============================================

  emitGameStarted(data: Omit<GameStartedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): GameStartedEvent {
    const event: GameStartedEvent = {
      ...data,
      type: 'GAME_STARTED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitGameEnded(data: Omit<GameEndedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): GameEndedEvent {
    const event: GameEndedEvent = {
      ...data,
      type: 'GAME_ENDED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Poker Combat Helpers
  // ============================================

  emitPokerHandRevealed(data: Omit<PokerHandRevealedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): PokerHandRevealedEvent {
    const event: PokerHandRevealedEvent = {
      ...data,
      type: 'POKER_HAND_REVEALED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitBetPlaced(data: Omit<BetPlacedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): BetPlacedEvent {
    const event: BetPlacedEvent = {
      ...data,
      type: 'BET_PLACED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitShowdownResult(data: Omit<ShowdownResultEvent, 'type' | 'id' | 'timestamp' | 'turn'>): ShowdownResultEvent {
    const event: ShowdownResultEvent = {
      ...data,
      type: 'SHOWDOWN_RESULT',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // Pet Evolution Helper
  // ============================================

  emitPetEvolved(data: Omit<PetEvolvedEvent, 'type' | 'id' | 'timestamp' | 'turn'>): PetEvolvedEvent {
    const event: PetEvolvedEvent = {
      ...data,
      type: 'PET_EVOLVED',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  // ============================================
  // UI Event Helpers
  // ============================================

  emitNotification(data: Omit<NotificationEvent, 'type' | 'id' | 'timestamp' | 'turn'>): NotificationEvent {
    const event: NotificationEvent = {
      ...data,
      type: 'NOTIFICATION',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitAnimationRequest(data: Omit<AnimationRequestEvent, 'type' | 'id' | 'timestamp' | 'turn'>): AnimationRequestEvent {
    const event: AnimationRequestEvent = {
      ...data,
      type: 'ANIMATION_REQUEST',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }

  emitSoundRequest(data: Omit<SoundRequestEvent, 'type' | 'id' | 'timestamp' | 'turn'>): SoundRequestEvent {
    const event: SoundRequestEvent = {
      ...data,
      type: 'SOUND_REQUEST',
      id: this.generateEventId(),
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    this.emit(event);
    return event;
  }
}

// Singleton instance - central event bus for the entire game
export const GameEventBus = new GameEventBusImpl();

export default GameEventBus;

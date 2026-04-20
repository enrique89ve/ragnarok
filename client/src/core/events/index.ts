/**
 * Core Events - Event-driven architecture exports
 * 
 * Added by Enrique - Centralized event system for decoupled game logic
 */

export { GameEventBus } from './GameEventBus';
export type { default as GameEventBusType } from './GameEventBus';

// Re-export all event types
export type {
  // Base types
  GameEventBase,
  GameEvent,
  GameEventType,
  GamePhase,
  SubPhase,
  PlaySubPhase,
  CombatSubPhase,
  
  // Phase events
  PhaseChangedEvent,
  SubPhaseChangedEvent,
  TurnStartedEvent,
  TurnEndedEvent,
  
  // Card events
  CardDrawnEvent,
  CardPlayedEvent,
  CardDiscardedEvent,
  MinionSummonedEvent,
  MinionDestroyedEvent,
  WeaponEquippedEvent,
  WeaponDestroyedEvent,
  SecretPlayedEvent,
  SecretRevealedEvent,
  
  // Effect events
  BattlecryTriggeredEvent,
  DeathrattleTriggeredEvent,
  SpellCastEvent,
  AuraAppliedEvent,
  AuraRemovedEvent,
  BuffAppliedEvent,
  SilenceAppliedEvent,
  
  // Mana events
  ManaSpentEvent,
  ManaCrystalGainedEvent,
  OverloadTriggeredEvent,
  
  // Hero power
  HeroPowerUsedEvent,
  
  // Discovery
  DiscoveryStartedEvent,
  DiscoveryCompletedEvent,
  
  // Mulligan
  MulliganStartedEvent,
  MulliganCompletedEvent,
  
  // Game state
  GameStartedEvent,
  GameEndedEvent,
  
  // Poker events
  PokerHandRevealedEvent,
  BetPlacedEvent,
  ShowdownResultEvent,
  
  // UI events
  NotificationEvent,
  AnimationRequestEvent,
  SoundRequestEvent,
  
  // Union types
  PhaseEvent,
  CardEvent,
  EffectEvent,
  ManaEvent,
  PokerEvent,
  UIEvent
} from './GameEvents';

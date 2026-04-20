/**
 * GameEvents.ts
 * 
 * Unified event types for the entire game system.
 * Extends combat events with game-wide events for phases, cards, effects, and UI.
 * 
 * Added by Enrique - Event-driven architecture integration
 */

// Re-export combat events for compatibility
export type {
  CombatEventType,
  DamageSource,
  BlockReason,
  CombatEventBase,
  DamageIntentEvent,
  DamageResolvedEvent,
  AttackBlockedEvent,
  AttackStartedEvent,
  ImpactPhaseEvent,
  AttackCompletedEvent,
  HealIntentEvent,
  HealResolvedEvent,
  DeathTriggeredEvent,
  CombatLogEvent,
  CombatEvent
} from '@/game/services/CombatEventBus';

// ============================================
// Game Phase Events
// ============================================

export type GamePhase =
  | 'INIT'
  | 'MULLIGAN'
  | 'PLAY'
  | 'COMBAT'
  | 'END_GAME';

export type PlaySubPhase =
  | 'DRAW'
  | 'MAIN'
  | 'ATTACK'
  | 'END_TURN';

export type CombatSubPhase =
  | 'SPELL_PET'
  | 'FAITH'
  | 'FORESIGHT'
  | 'DESTINY'
  | 'RESOLUTION';

export type SubPhase = PlaySubPhase | CombatSubPhase;

// ============================================
// Base Event Interface
// ============================================

export interface GameEventBase {
  id: string;
  timestamp: number;
  turn: number;
}

// ============================================
// Phase Events
// ============================================

export interface PhaseChangedEvent extends GameEventBase {
  type: 'PHASE_CHANGED';
  fromPhase: GamePhase;
  toPhase: GamePhase;
  subPhase?: SubPhase;
}

export interface SubPhaseChangedEvent extends GameEventBase {
  type: 'SUB_PHASE_CHANGED';
  phase: GamePhase;
  fromSubPhase: SubPhase | null;
  toSubPhase: SubPhase;
}

export interface TurnStartedEvent extends GameEventBase {
  type: 'TURN_STARTED';
  player: 'player' | 'opponent';
  turnNumber: number;
}

export interface TurnEndedEvent extends GameEventBase {
  type: 'TURN_ENDED';
  player: 'player' | 'opponent';
  turnNumber: number;
}

// ============================================
// Card Events
// ============================================

export interface CardDrawnEvent extends GameEventBase {
  type: 'CARD_DRAWN';
  player: 'player' | 'opponent';
  cardId: string;
  cardName: string;
  fromFatigue: boolean;
  fatigueDamage?: number;
  burned?: boolean;
}

export interface CardPlayedEvent extends GameEventBase {
  type: 'CARD_PLAYED';
  player: 'player' | 'opponent';
  cardId: string;
  instanceId: string;
  cardName: string;
  cardType: 'minion' | 'spell' | 'weapon' | 'hero' | 'secret' | 'location';
  manaCost: number;
  rarity?: string;
  targetId?: string;
  position?: number;
}

export interface CardDiscardedEvent extends GameEventBase {
  type: 'CARD_DISCARDED';
  player: 'player' | 'opponent';
  cardId: string;
  cardName: string;
  reason: 'hand_full' | 'effect' | 'burned';
}

export interface MinionSummonedEvent extends GameEventBase {
  type: 'MINION_SUMMONED';
  player: 'player' | 'opponent';
  instanceId: string;
  cardId: string;
  cardName: string;
  attack: number;
  health: number;
  position: number;
  source: 'played' | 'battlecry' | 'deathrattle' | 'spell' | 'effect';
}

export interface MinionDestroyedEvent extends GameEventBase {
  type: 'MINION_DESTROYED';
  player: 'player' | 'opponent';
  instanceId: string;
  cardId: string;
  cardName: string;
  hasDeathrattle: boolean;
}

export interface WeaponEquippedEvent extends GameEventBase {
  type: 'WEAPON_EQUIPPED';
  player: 'player' | 'opponent';
  cardId: string;
  cardName: string;
  attack: number;
  durability: number;
}

export interface WeaponDestroyedEvent extends GameEventBase {
  type: 'WEAPON_DESTROYED';
  player: 'player' | 'opponent';
  cardId: string;
  cardName: string;
}

export interface SecretPlayedEvent extends GameEventBase {
  type: 'SECRET_PLAYED';
  player: 'player' | 'opponent';
  cardId: string;
}

export interface SecretRevealedEvent extends GameEventBase {
  type: 'SECRET_REVEALED';
  player: 'player' | 'opponent';
  cardId: string;
  cardName: string;
  triggeredBy: string;
}

// ============================================
// Effect Events
// ============================================

export interface BattlecryTriggeredEvent extends GameEventBase {
  type: 'BATTLECRY_TRIGGERED';
  player: 'player' | 'opponent';
  sourceId: string;
  sourceName: string;
  effectType: string;
  targetId?: string;
  value?: number;
}

export interface DeathrattleTriggeredEvent extends GameEventBase {
  type: 'DEATHRATTLE_TRIGGERED';
  player: 'player' | 'opponent';
  sourceId: string;
  sourceName: string;
  effectType: string;
}

export interface SpellCastEvent extends GameEventBase {
  type: 'SPELL_CAST';
  player: 'player' | 'opponent';
  cardId: string;
  cardName: string;
  targetId?: string;
  effectType: string;
}

export interface AuraAppliedEvent extends GameEventBase {
  type: 'AURA_APPLIED';
  sourceId: string;
  sourceName: string;
  affectedIds: string[];
  auraType: string;
  value?: number;
}

export interface AuraRemovedEvent extends GameEventBase {
  type: 'AURA_REMOVED';
  sourceId: string;
  affectedIds: string[];
}

export interface BuffAppliedEvent extends GameEventBase {
  type: 'BUFF_APPLIED';
  targetId: string;
  targetName: string;
  sourceId?: string;
  attackChange?: number;
  healthChange?: number;
  keywords?: string[];
}

export interface SilenceAppliedEvent extends GameEventBase {
  type: 'SILENCE_APPLIED';
  targetId: string;
  targetName: string;
}

// ============================================
// Mana Events
// ============================================

export interface ManaSpentEvent extends GameEventBase {
  type: 'MANA_SPENT';
  player: 'player' | 'opponent';
  amount: number;
  remaining: number;
}

export interface ManaCrystalGainedEvent extends GameEventBase {
  type: 'MANA_CRYSTAL_GAINED';
  player: 'player' | 'opponent';
  amount: number;
  newMax: number;
  empty?: boolean;
}

export interface OverloadTriggeredEvent extends GameEventBase {
  type: 'OVERLOAD_TRIGGERED';
  player: 'player' | 'opponent';
  amount: number;
}

// ============================================
// Hero Power Events
// ============================================

export interface HeroPowerUsedEvent extends GameEventBase {
  type: 'HERO_POWER_USED';
  player: 'player' | 'opponent';
  heroPowerName: string;
  targetId?: string;
  cost: number;
}

// ============================================
// Discovery Events
// ============================================

export interface DiscoveryStartedEvent extends GameEventBase {
  type: 'DISCOVERY_STARTED';
  player: 'player' | 'opponent';
  sourceId: string;
  options: Array<{ id: string; name: string }>;
}

export interface DiscoveryCompletedEvent extends GameEventBase {
  type: 'DISCOVERY_COMPLETED';
  player: 'player' | 'opponent';
  sourceId: string;
  chosenCardId: string;
  chosenCardName: string;
}

// ============================================
// Mulligan Events
// ============================================

export interface MulliganStartedEvent extends GameEventBase {
  type: 'MULLIGAN_STARTED';
  player: 'player' | 'opponent';
  cardIds: string[];
}

export interface MulliganCompletedEvent extends GameEventBase {
  type: 'MULLIGAN_COMPLETED';
  player: 'player' | 'opponent';
  keptCards: string[];
  replacedCards: string[];
}

// ============================================
// Game State Events
// ============================================

export interface GameStartedEvent extends GameEventBase {
  type: 'GAME_STARTED';
  playerHeroClass: string;
  opponentHeroClass: string;
  startingPlayer: 'player' | 'opponent';
}

export interface GameEndedEvent extends GameEventBase {
  type: 'GAME_ENDED';
  winner: 'player' | 'opponent' | null;
  reason: 'hero_death' | 'concede' | 'fatigue' | 'draw';
  finalTurn: number;
}

// ============================================
// Poker Combat Events
// ============================================

export interface PokerHandRevealedEvent extends GameEventBase {
  type: 'POKER_HAND_REVEALED';
  player: 'player' | 'opponent';
  handRank: string;
  cards: string[];
  value: number;
}

export interface BetPlacedEvent extends GameEventBase {
  type: 'BET_PLACED';
  player: 'player' | 'opponent';
  betType: 'check' | 'bet' | 'raise' | 'call' | 'fold' | 'all_in';
  amount: number;
  potTotal: number;
}

export interface ShowdownResultEvent extends GameEventBase {
  type: 'SHOWDOWN_RESULT';
  winner: 'player' | 'opponent' | 'tie';
  playerHand: string;
  opponentHand: string;
  damageDealt: number;
  damageReceived: number;
}

// ============================================
// UI Notification Events (for subscribers)
// ============================================

export interface NotificationEvent extends GameEventBase {
  type: 'NOTIFICATION';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export interface AnimationRequestEvent extends GameEventBase {
  type: 'ANIMATION_REQUEST';
  animationType: string;
  sourceId?: string;
  targetId?: string;
  duration?: number;
  params?: Record<string, unknown>;
}

export interface SoundRequestEvent extends GameEventBase {
  type: 'SOUND_REQUEST';
  soundId: string;
  volume?: number;
  loop?: boolean;
}

// ============================================
// Pet Evolution Events
// ============================================

export interface PetEvolvedEvent extends GameEventBase {
  type: 'PET_EVOLVED';
  player: 'player' | 'opponent';
  instanceId: string;
  cardName: string;
  familyName: string;
  fromStage: 1 | 2;
  toStage: 2 | 3;
  element?: string;
}

// ============================================
// Union Types
// ============================================

export type PhaseEvent =
  | PhaseChangedEvent
  | SubPhaseChangedEvent
  | TurnStartedEvent
  | TurnEndedEvent;

export type CardEvent =
  | CardDrawnEvent
  | CardPlayedEvent
  | CardDiscardedEvent
  | MinionSummonedEvent
  | MinionDestroyedEvent
  | WeaponEquippedEvent
  | WeaponDestroyedEvent
  | SecretPlayedEvent
  | SecretRevealedEvent;

export type EffectEvent =
  | BattlecryTriggeredEvent
  | DeathrattleTriggeredEvent
  | SpellCastEvent
  | AuraAppliedEvent
  | AuraRemovedEvent
  | BuffAppliedEvent
  | SilenceAppliedEvent;

export type ManaEvent =
  | ManaSpentEvent
  | ManaCrystalGainedEvent
  | OverloadTriggeredEvent;

export type PokerEvent =
  | PokerHandRevealedEvent
  | BetPlacedEvent
  | ShowdownResultEvent;

export type UIEvent =
  | NotificationEvent
  | AnimationRequestEvent
  | SoundRequestEvent;

export type GameEvent =
  | PhaseEvent
  | CardEvent
  | EffectEvent
  | ManaEvent
  | HeroPowerUsedEvent
  | DiscoveryStartedEvent
  | DiscoveryCompletedEvent
  | MulliganStartedEvent
  | MulliganCompletedEvent
  | GameStartedEvent
  | GameEndedEvent
  | PokerEvent
  | UIEvent
  | PetEvolvedEvent;

// ============================================
// Event Type Strings
// ============================================

export type GameEventType =
  // Phase events
  | 'PHASE_CHANGED'
  | 'SUB_PHASE_CHANGED'
  | 'TURN_STARTED'
  | 'TURN_ENDED'
  // Card events
  | 'CARD_DRAWN'
  | 'CARD_PLAYED'
  | 'CARD_DISCARDED'
  | 'MINION_SUMMONED'
  | 'MINION_DESTROYED'
  | 'WEAPON_EQUIPPED'
  | 'WEAPON_DESTROYED'
  | 'SECRET_PLAYED'
  | 'SECRET_REVEALED'
  // Effect events
  | 'BATTLECRY_TRIGGERED'
  | 'DEATHRATTLE_TRIGGERED'
  | 'SPELL_CAST'
  | 'AURA_APPLIED'
  | 'AURA_REMOVED'
  | 'BUFF_APPLIED'
  | 'SILENCE_APPLIED'
  // Mana events
  | 'MANA_SPENT'
  | 'MANA_CRYSTAL_GAINED'
  | 'OVERLOAD_TRIGGERED'
  // Hero power
  | 'HERO_POWER_USED'
  // Discovery
  | 'DISCOVERY_STARTED'
  | 'DISCOVERY_COMPLETED'
  // Mulligan
  | 'MULLIGAN_STARTED'
  | 'MULLIGAN_COMPLETED'
  // Game state
  | 'GAME_STARTED'
  | 'GAME_ENDED'
  // Poker
  | 'POKER_HAND_REVEALED'
  | 'BET_PLACED'
  | 'SHOWDOWN_RESULT'
  // UI
  | 'NOTIFICATION'
  | 'ANIMATION_REQUEST'
  | 'SOUND_REQUEST'
  // Pet Evolution
  | 'PET_EVOLVED';

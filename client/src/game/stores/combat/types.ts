/**
 * Shared types for combat store slices
 */

import { StateCreator } from 'zustand';
import { TurnState, TurnOwner } from '../../flow/TurnManager';
import { BattlefieldState, CombatResult, MinionState, HeroState } from '../../flow/MinionBattleResolver';
import { 
  ChessPiece, 
  ChessBoardPosition, 
  ChessBoardState, 
  ChessPieceType,
  ChessPlayerSide,
  ChessGameStatus,
  ChessCollision,
  CombatResult as ChessCombatResult,
  ArmySelection
} from '../../types/ChessTypes';
import {
	PokerCombatState,
	PokerCard,
	CombatResolution,
	PokerResolvedHand,
	PetData,
  CombatAction,
  PokerCombatDeterministicOptions
} from '../../types/PokerCombatTypes';
import type { SeededRng, SeededIdGen } from '@shared/p2p-wire/rng';
import type { HeroDeckLoadout } from '../../deck/heroDeckRules';
import type { ChessRejection } from '@shared/protocol-core/chess';
import type { PokerActionOrigin } from '@shared/p2p-wire/combat';

export type CombatPhase = 
  | 'SETUP'
  | 'CHESS_MOVEMENT'
  | 'POKER_BETTING'
  | 'POKER_SHOWDOWN'
  | 'MINION_BATTLE'
  | 'RESOLUTION'
  | 'ENDED';

export type PokerPhase = 'FAITH' | 'FORESIGHT' | 'DESTINY' | 'SHOWDOWN';

export interface PokerState {
  phase: PokerPhase;
  pot: number;
  playerHoleCards: string[];
  opponentHoleCards: string[];
  communityCards: string[];
  playerBet: number;
  opponentBet: number;
  currentBetToMatch: number;
  isPlayerTurn: boolean;
  lastAction: string | null;
}

export interface ChessPieceState {
  id: string;
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  heroId: string;
  position: { row: number; col: number };
  isAlive: boolean;
  hasMoved: boolean;
  ownerId: 'player' | 'opponent';
}

export interface SharedDeckState {
  remainingCards: string[];
  burnedCards: string[];
  dealtToPlayer: string[];
  dealtToOpponent: string[];
}

export interface InstantKillEvent {
  position: ChessBoardPosition;
  attackerType: ChessPieceType;
  timestamp: number;
}

export interface PendingAttackAnimation {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  isInstantKill: boolean;
  timestamp: number;
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  type: 'attack' | 'spell' | 'ability' | 'damage' | 'heal' | 'death' | 'poker' | 'phase';
  message: string;
  details?: CombatResult | ChessCombatResult | Record<string, unknown>;
}

export const initialBoardState: ChessBoardState = {
  pieces: [],
  currentTurn: 'player',
  selectedPiece: null,
  validMoves: [],
  attackMoves: [],
  gameStatus: 'setup',
  moveCount: 0,
  inCheck: null
};

export interface SharedCombatState {
  combatPhase: CombatPhase;
  combatLog: CombatLogEntry[];
  pendingAnimations: string[];
  turnState: TurnState | null;
}

export interface SharedCombatActions {
  setCombatPhase: (phase: CombatPhase) => void;
  addLogEntry: (entry: CombatLogEntry) => void;
  queueAnimation: (animationId: string) => void;
  completeAnimation: (animationId: string) => void;
  startTurn: (turn: TurnOwner) => void;
  endTurn: () => void;
}

export type SharedCombatSlice = SharedCombatState & SharedCombatActions;

export interface PokerCombatSliceState {
  pokerState: PokerState | null;
  pokerCombatState: PokerCombatState | null;
  pokerDeck: PokerCard[];
  pokerIsActive: boolean;
  mulliganComplete: boolean;
  isTransitioningHand: boolean;
	pokerHandsWonPlayer: number;
	pokerHandsWonOpponent: number;
	lastResolvedPokerHand: PokerResolvedHand | null;
  // True when the human player is the chess defender — poker UI mirrors
  // attacker/defender so the human stays in the "player" slot. Lives across
  // chess→poker→chess so the resolution step knows which chess piece to
  // credit each poker outcome to.
  pokerSlotsSwapped: boolean;
}

export interface PokerCombatSliceActions {
  initializePoker: () => void;
  setPokerPhase: (phase: PokerPhase) => void;
  dealCommunityCards: (cards: string[]) => void;
  placeBet: (player: 'player' | 'opponent', amount: number) => void;
  fold: (player: 'player' | 'opponent') => void;
  endPokerRound: (winnerId: string, damage: number) => void;
  initializePokerCombat: (
    playerId: string,
    playerName: string,
    playerPet: PetData,
    opponentId: string,
    opponentName: string,
    opponentPet: PetData,
    skipMulligan?: boolean,
    playerKingId?: string,
    opponentKingId?: string,
    firstStrikeTarget?: 'player' | 'opponent',
    deterministic?: PokerCombatDeterministicOptions
  ) => void;
  completeFirstStrike: () => void;
  completeMulligan: () => void;
  performPokerAction: (
    playerId: string,
    action: CombatAction,
    hpCommitment?: number,
    origin?: PokerActionOrigin,
    nowMs?: number,
  ) => void;
  advancePokerPhase: () => void;
  resolvePokerCombat: () => CombatResolution | null;
  endPokerCombat: () => void;
  drawPokerCards: (count: number) => PokerCard[];
  updatePokerTimer: (newTime: number) => void;
  syncPokerTurnClock: (input: {
    turnId: string;
    combatId: string;
    phase: string;
    activePlayerId: string;
    actionsThisRound: number;
    durationMs: number;
    sentAtMs?: number;
    remainingMs?: number;
    receivedAtMs: number;
  }) => void;
  applyNotarizedPokerTurnClock: (input: {
    turnId: string;
    combatId: string;
    phase: string;
    activePlayerId: string;
    actionsThisRound: number;
    remainingMsAtCommit: number;
    receivedAtMs: number;
  }) => void;
  setPlayerReady: (playerId: string) => void;
  healPlayerHero: (amount: number) => void;
  healOpponentHero: (amount: number) => void;
	setPlayerHeroBuffs: (buffs: { attack?: number; health?: number; armor?: number }) => void;
	setOpponentHeroBuffs: (buffs: { attack?: number; health?: number; armor?: number }) => void;
  addPlayerArmor: (amount: number) => void;
  addOpponentArmor: (amount: number) => void;
  markBothPlayersReady: () => void;
  startNextHand: (resolution?: CombatResolution) => void;
  startNextHandDelayed: (resolution: CombatResolution) => void;
  cancelPendingPokerHandTransition: () => void;
  maybeCloseBettingRound: () => void;
  applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => void;
  setPokerSlotsSwapped: (swapped: boolean) => void;
}

export type PokerCombatSlice = PokerCombatSliceState & PokerCombatSliceActions;

export type P2PBoardBinding = {
  readonly matchId: string;
  readonly matchSeed: string;
};

export interface ChessCombatSliceState {
  chessPieces: ChessPieceState[];
  boardState: ChessBoardState;
  pendingCombat: ChessCollision | null;
  playerArmy: ArmySelection | null;
  opponentArmy: ArmySelection | null;
  sharedDeckCardIds: number[];
  // P2P chess boards are identity-bound to the live match. Piece count is
  // not proof that the board belongs to the current matchId/matchSeed.
  p2pBoardBinding: P2PBoardBinding | null;
  // Counts player turns (increments when currentTurn becomes 'player').
  // Distinct from boardState.moveCount which counts every ply (each side's
  // moves). Used for mission completion telemetry and per-turn boss rules.
  playerTurnCount: number;
  // Seeded sources for the chess phase. Populated by `initChessWithSeed` on
  // both peers after `matchSeed` is resolved (see useWireSync). Null in
  // single-player paths — consumers fall back to `cryptoRng` / `cryptoIdGen`
  // (CSPRNG-grade, non-deterministic, fine for SP).
  _chessRng: SeededRng | null;
  _chessIdGen: SeededIdGen | null;
  // Monotonic tick used as a deterministic id suffix for log entries and as
  // the `timestamp` field on UI freshness markers owned by ChessAnimationSlice
  // (lastInstantKill, pendingAttackAnimation). The actual wall-clock time
  // was never read by any consumer — only object identity / increasing-order
  // semantics matter — so a counter preserves behavior without breaking
  // determinism. P2P peers converge once chess actions flow through the
  // symmetric pipeline (C-Chess.4+); pre-pipeline divergence is harmless
  // because these fields do not enter `computeStateHash`.
  _logCounter: number;
}

export type ChessMutationResult =
	| { readonly status: 'applied' }
	| { readonly status: 'rejected'; readonly reason: ChessRejection };

export interface ChessCombatSliceActions {
  initializeCombat: (playerPieces: ChessPieceState[], opponentPieces: ChessPieceState[]) => void;
  movePiece: (pieceIdOrPosition: string | ChessBoardPosition, newPosition?: { row: number; col: number }) => ChessCollision | null | void;
  capturePiece: (attackerId: string, targetId: string) => void;
  initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection, idGen: () => string, playerDeckLoadout?: HeroDeckLoadout) => void;
  bindP2PBoard: (binding: P2PBoardBinding) => void;
  selectPiece: (piece: ChessPiece | null) => void;
  executeMove: (from: ChessBoardPosition, to: ChessBoardPosition) => ChessMutationResult;
  executeInstantKill: (attacker: ChessPiece, defender: ChessPiece, targetPosition: ChessBoardPosition) => ChessMutationResult;
  getValidMoves: (piece: ChessPiece) => { moves: ChessBoardPosition[]; attacks: ChessBoardPosition[] };
  getPieceAt: (position: ChessBoardPosition) => ChessPiece | null;
  // Gameplay command for a legal chess capture. Records the presentation
  // marker and applies the attack intent through chessCombatSlice; movement
  // legality and instant-kill rules stay unchanged.
  beginChessAttack: (attacker: ChessPiece, defender: ChessPiece, isInstantKill: boolean) => ChessMutationResult;
  removePiece: (pieceId: string) => void;
  updatePieceHealth: (pieceId: string, newHealth: number) => void;
  updatePieceStamina: (pieceId: string, newStamina: number) => void;
  incrementAllStamina: () => void;
  nextTurn: () => void;
  checkWinCondition: () => ChessGameStatus;
  setGameStatus: (status: ChessGameStatus) => void;
  setSharedDeck: (cardIds: number[]) => void;
  // Seed the chess phase's local RNG/idGen from `matchSeed`. Idempotent on
  // identical seed; called on BOTH peers (host and joiner) right after the
  // commit-reveal handshake resolves the seed. Single-player never calls
  // this — consumers fall back to crypto-grade ambient sources.
  initChessWithSeed: (matchSeed: string) => void;
  // Increments and returns the next monotonic tick. Used as id suffix /
  // freshness timestamp by chess + king-ability log entries. Replaces
  // ad-hoc `Date.now()` calls so log ids and UI markers are deterministic
  // by construction.
  _nextLogTick: () => number;
  clearPendingCombat: () => void;
  // Dev Battle Sandbox and any non-geometric duel entry. Same pendingCombat
  // owner as a legal hero-vs-hero capture so poker HP writeback has a collision.
  stagePendingPokerCombat: (attacker: ChessPiece, defender: ChessPiece) => ChessMutationResult;
  // Presentation cleanup only. Attack mechanics are resolved when
  // beginChessAttack records the attack intent; this clears the transient
  // marker so the coordinator can advance from chess to poker after the strike
  // animation has actually been visible.
  completeAttackAnimation: () => void;
  isKingInCheck: (side: ChessPlayerSide, pieces?: ChessPiece[]) => boolean;
  getThreateningPieces: (kingPosition: ChessBoardPosition, attackerSide: ChessPlayerSide, pieces?: ChessPiece[]) => ChessPiece[];
  updateCheckStatus: () => void;
  isCheckmate: (side: ChessPlayerSide) => boolean;
  checkPawnPromotion: (piece: ChessPiece) => boolean;
  promotePawn: (pieceId: string, newType: ChessPieceType) => void;
  resolveCombat: (result: ChessCombatResult) => void;
  incrementPlayerTurn: () => void;
  resetPlayerTurnCount: () => void;
}

export type ChessCombatSlice = ChessCombatSliceState & ChessCombatSliceActions;

export interface ElementalBuffNotification {
  minionId: string;
  minionName: string;
  attackBonus: number;
  healthBonus: number;
  element: string;
  owner: 'player' | 'opponent';
  timestamp: number;
}

export interface MinionBattleSliceState {
  battlefield: BattlefieldState | null;
  sharedDeck: SharedDeckState | null;
  pendingElementalBuffNotification: ElementalBuffNotification | null;
}

export interface MinionBattleSliceActions {
  spawnMinion: (minion: MinionState) => void;
  removeMinion: (instanceId: string) => void;
  resolveMinionAttack: (attackerId: string, targetId: string) => CombatResult | null;
  initializeSharedDeck: (cardIds: string[]) => void;
  burnCard: (cardId: string) => void;
  dealCardToPlayer: (player: 'player' | 'opponent', cardId: string) => void;
  clearElementalBuffNotification: () => void;
}

export type MinionBattleSlice = MinionBattleSliceState & MinionBattleSliceActions;

// ==================== KING ABILITY SLICE ====================

import { 
  ActiveMine, 
  KingChessAbilityConfig,
  KingDivineCommandState 
} from '../../types/ChessTypes';
import { MineDirection } from '../../utils/chess/kingAbilityUtils';

export interface KingAbilitySliceState {
  playerKingAbility: KingDivineCommandState | null;
  opponentKingAbility: KingDivineCommandState | null;
  allActiveMines: ActiveMine[];
  minePlacementMode: boolean;
  selectedMineDirection: MineDirection | null;
  pendingManaBoost: { player: number; opponent: number };
  lastClearedTurn: number | null;
}

export interface KingAbilitySliceActions {
  initializeKingAbilities: (playerKingId: string, opponentKingId: string) => void;
  placeMine: (
    owner: 'player' | 'opponent',
    centerPosition: ChessBoardPosition,
    direction?: MineDirection,
    overrides?: Readonly<{
      readonly mineId: string;
      readonly affectedTiles: readonly ChessBoardPosition[];
    }>
  ) => boolean;
  checkAndTriggerMine: (
    landingPosition: ChessBoardPosition,
    movingPieceOwner: 'player' | 'opponent',
    movingPieceId: string,
    movingPieceType: string
  ) => { triggered: boolean; staPenalty: number; manaBoost: number } | null;
  clearExpiredMines: (currentTurn: number) => void;
  setMinePlacementMode: (enabled: boolean) => void;
  setSelectedMineDirection: (direction: MineDirection | null) => void;
  resetKingAbilities: () => void;
  canPlaceMine: (owner: 'player' | 'opponent') => boolean;
  getMinesForOwner: (owner: 'player' | 'opponent') => ActiveMine[];
  getVisibleMines: (viewerSide: 'player' | 'opponent') => ActiveMine[];
  consumePendingManaBoost: (side: 'player' | 'opponent') => number;
}

export type KingAbilitySlice = KingAbilitySliceState & KingAbilitySliceActions;

// ==================== CHESS ANIMATION SLICE ====================

/**
 * Holds non-canonical UI freshness markers for chess-phase cinematic effects:
 * the in-flight attack animation, the last instant-kill flash, and the last
 * triggered mine overlay. These fields are NOT part of the canonical game
 * state and do NOT enter `computeStateHash` — they live separately from the
 * chess engine slice so that engine logic (executeMove / executeInstantKill
 * / nextTurn) stays portable to `shared/protocol-core/`.
 *
 * Chess-phase writers (chessCombatSlice, kingAbilitySlice) update these
 * markers via cross-slice setters using `get()` rather than embedding the
 * fields in their own state.
 */
export interface ChessAnimationSliceState {
  pendingAttackAnimation: PendingAttackAnimation | null;
  lastInstantKill: InstantKillEvent | null;
  lastMineTriggered: { mine: ActiveMine; targetPieceId: string } | null;
}

export interface ChessAnimationSliceActions {
  // Public presentation marker constructor: builds the PendingAttackAnimation
  // struct from the chess pieces involved and stamps the deterministic
  // timestamp via the chess slice's `_nextLogTick`. It does not apply
  // gameplay mechanics.
  startAttackAnimation: (attacker: ChessPiece, defender: ChessPiece, isInstantKill: boolean) => void;
  clearAttackAnimation: () => void;
  // Internal-style setter consumed only by chessCombatSlice.executeInstantKill
  // — exposed through the slice surface because Zustand cross-slice writes
  // route through `get()` against the unified store union.
  recordInstantKill: (position: ChessBoardPosition, attackerType: ChessPieceType) => void;
  // Internal-style setter consumed only by kingAbilitySlice.checkAndTriggerMine.
  recordMineTriggered: (mine: ActiveMine, targetPieceId: string) => void;
  clearMineTriggered: () => void;
  // Bulk-clear all chess-phase animation markers. Called from
  // chessCombatSlice.initializeBoard to scrub stale freshness markers when
  // a fresh game starts. The global UnifiedCombatStore.reset() resets these
  // alongside every other field; this is the slice-internal counterpart.
  clearChessAnimations: () => void;
}

export type ChessAnimationSlice = ChessAnimationSliceState & ChessAnimationSliceActions;

// ==================== POKER SPELL SLICE ====================

import { 
  PokerSpellState, 
  ActivePokerSpell,
  SpellCastResult 
} from '../../utils/poker/pokerSpellUtils';
import { PokerSpellCard } from '../../types/CardTypes';

export interface PokerSpellSliceState {
  pokerSpellState: PokerSpellState | null;
  pendingPokerSpells: PokerSpellCard[];
  isSpellPetPhase: boolean;
  destinyOverrideOptions: string[];
}

export interface PokerSpellSliceActions {
  initializePokerSpells: () => void;
  canCastPokerSpell: (spell: PokerSpellCard, casterMana: number) => { canCast: boolean; reason?: string };
  castPokerSpell: (spell: PokerSpellCard, caster: 'player' | 'opponent') => SpellCastResult;
  queuePokerSpell: (spell: PokerSpellCard) => void;
  clearPokerSpellQueue: () => void;
  consumeBluffToken: (owner: 'player' | 'opponent') => { success: boolean; message: string };
  applyStaminaShield: (owner: 'player' | 'opponent', penalty: number) => number;
  getExtraFoldPenalty: (foldingPlayer: 'player' | 'opponent') => number;
  setSpellPetPhase: (active: boolean) => void;
  setDestinyOverrideOptions: (options: string[]) => void;
  selectDestinyOverride: (cardKey: string) => void;
  resetPokerSpells: () => void;
}

export type PokerSpellSlice = PokerSpellSliceState & PokerSpellSliceActions;

export type UnifiedCombatStore =
  SharedCombatSlice &
  PokerCombatSlice &
  ChessCombatSlice &
  ChessAnimationSlice &
  MinionBattleSlice &
  KingAbilitySlice &
  PokerSpellSlice & {
    reset: () => void;
  };

export type CombatSliceCreator<T> = StateCreator<UnifiedCombatStore, [], [], T>;

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
  PetData,
  CombatAction
} from '../../types/PokerCombatTypes';

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
    firstStrikeTarget?: 'player' | 'opponent'
  ) => void;
  completeFirstStrike: () => void;
  completeMulligan: () => void;
  performPokerAction: (playerId: string, action: CombatAction, hpCommitment?: number) => void;
  advancePokerPhase: () => void;
  resolvePokerCombat: () => CombatResolution | null;
  endPokerCombat: () => void;
  drawPokerCards: (count: number) => PokerCard[];
  updatePokerTimer: (newTime: number) => void;
  setPlayerReady: (playerId: string) => void;
  healPlayerHero: (amount: number) => void;
  healOpponentHero: (amount: number) => void;
  setPlayerHeroBuffs: (buffs: { attack?: number; health?: number; armor?: number }) => void;
  addPlayerArmor: (amount: number) => void;
  addOpponentArmor: (amount: number) => void;
  markBothPlayersReady: () => void;
  startNextHand: (resolution?: CombatResolution) => void;
  startNextHandDelayed: (resolution: CombatResolution) => void;
  maybeCloseBettingRound: () => void;
  applyDirectDamage: (targetPlayerId: 'player' | 'opponent', damage: number, sourceDescription?: string) => void;
}

export type PokerCombatSlice = PokerCombatSliceState & PokerCombatSliceActions;

export interface ChessCombatSliceState {
  chessPieces: ChessPieceState[];
  boardState: ChessBoardState;
  pendingCombat: ChessCollision | null;
  lastInstantKill: InstantKillEvent | null;
  pendingAttackAnimation: PendingAttackAnimation | null;
  playerArmy: ArmySelection | null;
  opponentArmy: ArmySelection | null;
  sharedDeckCardIds: number[];
}

export interface ChessCombatSliceActions {
  initializeCombat: (playerPieces: ChessPieceState[], opponentPieces: ChessPieceState[]) => void;
  movePiece: (pieceIdOrPosition: string | ChessBoardPosition, newPosition?: { row: number; col: number }) => ChessCollision | null | void;
  capturePiece: (attackerId: string, targetId: string) => void;
  initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection) => void;
  selectPiece: (piece: ChessPiece | null) => void;
  executeMove: (from: ChessBoardPosition, to: ChessBoardPosition) => void;
  executeInstantKill: (attacker: ChessPiece, defender: ChessPiece, targetPosition: ChessBoardPosition) => void;
  getValidMoves: (piece: ChessPiece) => { moves: ChessBoardPosition[]; attacks: ChessBoardPosition[] };
  getPieceAt: (position: ChessBoardPosition) => ChessPiece | null;
  removePiece: (pieceId: string) => void;
  updatePieceHealth: (pieceId: string, newHealth: number) => void;
  updatePieceStamina: (pieceId: string, newStamina: number) => void;
  incrementAllStamina: () => void;
  executeAITurn: () => void;
  nextTurn: () => void;
  checkWinCondition: () => ChessGameStatus;
  setGameStatus: (status: ChessGameStatus) => void;
  setSharedDeck: (cardIds: number[]) => void;
  clearPendingCombat: () => void;
  startAttackAnimation: (attacker: ChessPiece, defender: ChessPiece, isInstantKill: boolean) => void;
  completeAttackAnimation: () => void;
  clearAttackAnimation: () => void;
  isKingInCheck: (side: ChessPlayerSide, pieces?: ChessPiece[]) => boolean;
  getThreateningPieces: (kingPosition: ChessBoardPosition, attackerSide: ChessPlayerSide, pieces?: ChessPiece[]) => ChessPiece[];
  updateCheckStatus: () => void;
  isCheckmate: (side: ChessPlayerSide) => boolean;
  checkPawnPromotion: (piece: ChessPiece) => boolean;
  promotePawn: (pieceId: string, newType: ChessPieceType) => void;
  resolveCombat: (result: ChessCombatResult) => void;
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
  lastMineTriggered: { mine: ActiveMine; targetPieceId: string } | null;
  pendingManaBoost: { player: number; opponent: number };
  lastClearedTurn: number | null;
}

export interface KingAbilitySliceActions {
  initializeKingAbilities: (playerKingId: string, opponentKingId: string) => void;
  placeMine: (
    owner: 'player' | 'opponent',
    centerPosition: ChessBoardPosition,
    direction?: MineDirection
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
  clearMineTriggered: () => void;
  consumePendingManaBoost: (side: 'player' | 'opponent') => number;
}

export type KingAbilitySlice = KingAbilitySliceState & KingAbilitySliceActions;

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
  MinionBattleSlice & 
  KingAbilitySlice & 
  PokerSpellSlice & {
    reset: () => void;
  };

export type CombatSliceCreator<T> = StateCreator<UnifiedCombatStore, [], [], T>;

/**
 * ChessTypes.ts
 * 
 * Type definitions for Ragnarok Chess integration.
 * Chess pieces map to hero classes for combat.
 */

import { HeroClass, CardData } from '../types';
import type { ElementType as ElementTypeImport } from '../utils/elements';

/**
 * Element types and utilities - imported from utils/elements for consistency
 * Re-exported here for backward compatibility
 */
export {
  type ElementType,
  type ElementAdvantageResult,
  ELEMENT_STRENGTHS,
  ELEMENT_COLORS,
  ELEMENT_ICONS,
  ELEMENT_LABELS,
  getElementAdvantage,
  hasElementAdvantage,
  getElementColor,
  getElementIcon
} from '../utils/elements';

type ElementType = ElementTypeImport;

/**
 * Chess piece types (10 pieces per player: 5 pawns + 5 main pieces)
 */
export type ChessPieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export const PIECE_DISPLAY_NAMES: Record<ChessPieceType, string> = {
	king: 'Protogenoi',
	queen: 'Sovereign',
	rook: 'Shaper',
	bishop: 'Luminary',
	knight: 'Ethereal',
	pawn: 'Einherjar'
};

/**
 * Player side (similar to chess black/white)
 */
export type ChessPlayerSide = 'player' | 'opponent';

/**
 * Board dimensions - Ragnarok uses 7x5 board (3 empty rows between armies)
 */
export const BOARD_ROWS = 7;
export const BOARD_COLS = 5;

/**
 * Individual chess piece on the board
 */
export interface ChessPiece {
  id: string;
  type: ChessPieceType;
  owner: ChessPlayerSide;
  position: ChessBoardPosition;
  health: number;
  maxHealth: number;
  stamina: number;
  heroClass: HeroClass;
  heroName: string;
  heroPortrait?: string;
  deckCardIds: number[];  // User-built 30-card deck (loaded from heroDeckStore)
  fixedCards?: number[];  // DEPRECATED: Legacy fixed cards, use deckCardIds instead
  hasSpells: boolean;
  hasMoved: boolean;
  element: ElementType;
}

/**
 * Element assignments per piece type per side
 * Player and Opponent have different elements to create asymmetric matchups
 */
export const PIECE_ELEMENTS: Record<ChessPlayerSide, Record<ChessPieceType, ElementType>> = {
  player: {
    king: 'holy',
    queen: 'fire',
    rook: 'earth',
    bishop: 'wind',
    knight: 'water',
    pawn: 'neutral'
  },
  opponent: {
    king: 'shadow',
    queen: 'water',
    rook: 'wind',
    bishop: 'earth',
    knight: 'fire',
    pawn: 'neutral'
  }
};

/**
 * Position on the chess board
 */
export interface ChessBoardPosition {
  row: number;
  col: number;
}

/**
 * Chess board state
 */
export interface ChessBoardState {
  pieces: ChessPiece[];
  currentTurn: ChessPlayerSide;
  selectedPiece: ChessPiece | null;
  validMoves: ChessBoardPosition[];
  attackMoves: ChessBoardPosition[];
  gameStatus: ChessGameStatus;
  moveCount: number;
  inCheck: ChessPlayerSide | null; // Which side's King is in check (null = no check)
}

/**
 * Game status
 */
export type ChessGameStatus = 'setup' | 'playing' | 'combat' | 'player_wins' | 'opponent_wins';

/**
 * Movement pattern for a piece type
 */
export interface MovementPattern {
  type: 'line' | 'point' | 'l_shape' | 'surround';
  directions?: { row: number; col: number }[];
  maxDistance?: number;
}

/**
 * Movement patterns for each piece type (from Ragnarok repo)
 */
export const PIECE_MOVEMENT_PATTERNS: Record<ChessPieceType, MovementPattern> = {
  queen: {
    type: 'line',
    directions: [
      { row: 1, col: 0 }, { row: -1, col: 0 },
      { row: 0, col: 1 }, { row: 0, col: -1 },
      { row: 1, col: 1 }, { row: -1, col: -1 },
      { row: 1, col: -1 }, { row: -1, col: 1 }
    ]
  },
  king: {
    type: 'surround',
    directions: [
      { row: 1, col: 0 }, { row: -1, col: 0 },
      { row: 0, col: 1 }, { row: 0, col: -1 },
      { row: 1, col: 1 }, { row: -1, col: -1 },
      { row: 1, col: -1 }, { row: -1, col: 1 }
    ],
    maxDistance: 1
  },
  rook: {
    type: 'line',
    directions: [
      { row: 1, col: 0 }, { row: -1, col: 0 },
      { row: 0, col: 1 }, { row: 0, col: -1 }
    ]
  },
  bishop: {
    type: 'line',
    directions: [
      { row: 1, col: 1 }, { row: -1, col: -1 },
      { row: 1, col: -1 }, { row: -1, col: 1 }
    ]
  },
  knight: {
    type: 'l_shape',
    directions: [
      { row: -2, col: -1 }, { row: 2, col: -1 },
      { row: -1, col: -2 }, { row: -1, col: 2 },
      { row: -2, col: 1 }, { row: 2, col: 1 },
      { row: 1, col: -2 }, { row: 1, col: 2 }
    ]
  },
  pawn: {
    type: 'point',
    directions: [{ row: 1, col: 0 }],
    maxDistance: 1
  }
};

/**
 * Piece stats configuration (HP, base stats per type)
 */
export interface ChessPieceStats {
  baseHealth: number;
  spellSlots: number;
  hasSpells: boolean;
}

/**
 * Base stats for each piece type (from Ragnarok GDD)
 */
export const PIECE_BASE_STATS: Record<ChessPieceType, ChessPieceStats> = {
  king: { baseHealth: 100, spellSlots: 0, hasSpells: false },
  queen: { baseHealth: 100, spellSlots: 33, hasSpells: true },
  rook: { baseHealth: 100, spellSlots: 30, hasSpells: true },
  bishop: { baseHealth: 100, spellSlots: 30, hasSpells: true },
  knight: { baseHealth: 100, spellSlots: 30, hasSpells: true },
  pawn: { baseHealth: 100, spellSlots: 0, hasSpells: false }
};

/**
 * Initial board setup (row 0 = player back row, row 6 = opponent back row)
 * 3 empty rows between armies (rows 2, 3, 4) for strategic depth
 */
export interface InitialPiecePosition {
  type: ChessPieceType;
  col: number;
  row: number;
}

/**
 * Player's starting positions (back row + pawn row)
 */
export const PLAYER_INITIAL_POSITIONS: InitialPiecePosition[] = [
  { type: 'knight', col: 0, row: 0 },
  { type: 'queen', col: 1, row: 0 },
  { type: 'king', col: 2, row: 0 },
  { type: 'bishop', col: 3, row: 0 },
  { type: 'rook', col: 4, row: 0 },
  { type: 'pawn', col: 0, row: 1 },
  { type: 'pawn', col: 1, row: 1 },
  { type: 'pawn', col: 2, row: 1 },
  { type: 'pawn', col: 3, row: 1 },
  { type: 'pawn', col: 4, row: 1 }
];

/**
 * Opponent's starting positions (mirrored, row 6 back, row 5 pawns)
 */
export const OPPONENT_INITIAL_POSITIONS: InitialPiecePosition[] = [
  { type: 'rook', col: 0, row: 6 },
  { type: 'queen', col: 3, row: 6 },
  { type: 'bishop', col: 1, row: 6 },
  { type: 'king', col: 2, row: 6 },
  { type: 'knight', col: 4, row: 6 },
  { type: 'pawn', col: 0, row: 5 },
  { type: 'pawn', col: 1, row: 5 },
  { type: 'pawn', col: 2, row: 5 },
  { type: 'pawn', col: 3, row: 5 },
  { type: 'pawn', col: 4, row: 5 }
];

/**
 * Army selection - player picks variants for each piece type
 */
export interface ArmySelection {
  king: ChessPieceHero;
  queen: ChessPieceHero;
  rook: ChessPieceHero;
  bishop: ChessPieceHero;
  knight: ChessPieceHero;
}

/**
 * Hero variant for a chess piece
 * NOTE: Deck cards are now user-built via heroDeckStore, not fixed per hero
 */
export interface ChessPieceHero {
  id: string;
  name: string;
  heroClass: HeroClass;
  description: string;
  portrait?: string;
  fixedCardIds?: number[];  // DEPRECATED: Use heroDeckStore for user-built decks
  passiveEffect?: string; // For King pieces with army-wide passive abilities
  element?: string; // Norse element type (fire, water, ice, grass, light, dark, electric)
  norseHeroId?: string; // Links to NorseHero definition for heroPower/weaponUpgrade/passive
  chessAbility?: string; // King Divine Command: reference to ability config in kingAbilityUtils
}

/**
 * Collision event when pieces meet
 */
export interface ChessCollision {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  instantKill?: boolean; // True for pawn/king attacks (Valkyrie weapon - no PvP combat)
}

/**
 * Combat result after poker battle
 */
export interface CombatResult {
  winner: ChessPiece;
  loser: ChessPiece;
  winnerNewHealth: number;
}

// ==================== KING DIVINE COMMAND SYSTEM ====================

/**
 * King chess ability types - each of the 9 primordial kings has a unique board ability
 * Kings can place hidden "landmines" that drain opponent STA when triggered
 */
export type KingChessAbilityType =
  | 'ymir_giant_reach'      // Any single tile on board
  | 'buri_ice_emergence'    // Straight line (4 tiles) horizontal/vertical
  | 'surtr_flame_burst'     // 3x3 circle centered on chosen tile
  | 'borr_ancestral_path'   // Full rank or file (7 tiles)
  | 'yggdrasil_root_spread' // Cross pattern (5 tiles)
  | 'audumbla_nourish_trap' // 2x2 square
  | 'gaia_earthen_snare'    // L-shape like knight movement
  | 'brimir_tidal_wave'     // Wave pattern (diagonal sweep)
  | 'ginnungagap_void_rift' // Random 3 scattered tiles
  | 'tartarus_abyss_rupture'; // X-shape diagonal pattern

/**
 * King rarity tiers — unified with CardRarity
 */
export type KingRarity = 'basic' | 'common' | 'rare' | 'epic' | 'mythic';

/**
 * Mine shape configuration - defines the pattern of tiles affected
 */
export interface MineShape {
  type: KingChessAbilityType;
  relativeTiles: ChessBoardPosition[]; // Offsets from center/origin
  requiresDirection?: boolean; // For line shapes that need orientation
  isRandom?: boolean; // For Ginnungagap's scattered tiles
}

/**
 * Active mine placed on the board
 */
export interface ActiveMine {
  id: string;
  owner: ChessPlayerSide;
  kingId: string;
  centerPosition: ChessBoardPosition;
  affectedTiles: ChessBoardPosition[]; // Actual board positions after calculation
  staPenalty: number; // STA drained when triggered (2 for standard, 3 for super rare)
  manaBoost: number; // Mana bonus granted to owner in next PvP (+1 rare/epic, +2 super_rare)
  placedOnTurn: number; // Turn number when placed
  expiresOnTurn: number; // Turn number when it disappears (based on turnDuration)
  triggered: boolean;
}

/**
 * King chess ability configuration - defines behavior per king
 */
export interface KingChessAbilityConfig {
  kingId: string;
  abilityType: KingChessAbilityType;
  rarity: KingRarity;
  maxUsesPerGame: number; // Default 5, some kings may differ
  staPenalty: number; // 2 for standard/epic, 3 for super rare
  turnDuration: number; // 1 for rare, 2 for epic/super_rare - how many opponent turns mine lasts
  manaBoost: number; // +1 for rare/epic, +2 for super_rare - bonus mana in next PvP
  shape: MineShape;
  description: string;
}

/**
 * King Divine Command state for a single player
 */
export interface KingDivineCommandState {
  kingId: string;
  abilityConfig: KingChessAbilityConfig | null;
  minesRemaining: number;
  activeMines: ActiveMine[];
  canPlaceThisTurn: boolean;
  hasPlacedThisTurn: boolean;
}

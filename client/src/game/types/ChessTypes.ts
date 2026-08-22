/**
 * ChessTypes.ts
 * 
 * Type definitions for Ragnarok Chess integration.
 * Chess pieces map to hero classes for combat.
 */

import { HeroClass } from '../types';
import type { ElementType as ElementTypeImport } from '../utils/elements';
import type {
	ChessPieceType,
	ChessPlayerSide,
	ChessBoardPosition,
	ChessProtocolPiece
} from '@shared/protocol-core/chess/types';
import type { ChessBoardSnapshot } from '@shared/protocol-core/chess/state';

/**
 * Element types and utilities - imported from utils/elements for consistency
 * Re-exported here for backward compatibility
 */
export {
  type ElementType,
  type ElementAdvantageResult,
  ELEMENT_STRENGTHS,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  getElementAdvantage,
  hasElementAdvantage,
  getElementColor
} from '../utils/elements';
type ElementType = ElementTypeImport;

/**
 * Protocol-level chess geometry — re-exported from shared/protocol-core so
 * client code can keep importing them from the canonical client entry point
 * (`@/game/types/ChessTypes`) without reaching into shared/ directly.
 */
export {
	BOARD_ROWS,
	BOARD_COLS,
	PIECE_MOVEMENT_PATTERNS
} from '@shared/protocol-core/chess/types';
export type {
	ChessPieceType,
	ChessPlayerSide,
	ChessBoardPosition,
	ChessGameStatus,
	MovementPattern,
	ChessProtocolPiece
} from '@shared/protocol-core/chess/types';

export const PIECE_DISPLAY_NAMES: Record<ChessPieceType, string> = {
	king: 'Protogenoi',
	queen: 'Sovereign',
	rook: 'Shaper',
	bishop: 'Luminary',
	knight: 'Ethereal',
	pawn: 'Einherjar'
};

/**
 * Individual chess piece on the board — extends the protocol-core piece
 * with the gameplay model fields the rule predicates do not need.
 */
export interface ChessPiece extends ChessProtocolPiece {
  health: number;
  maxHealth: number;
  stamina: number;
  heroClass: HeroClass;
  heroName: string;
  heroId?: string;
  deckCardIds: number[];  // User-built 30-card deck (loaded from heroDeckStore)
  fixedCards?: number[];
  hasSpells: boolean;
  element: ElementType;
}


/**
 * Chess board state — the protocol snapshot (`pieces`, `currentTurn`,
 * `gameStatus`, `moveCount`, `inCheck`) plus a UI overlay for the active
 * selection and the highlighted move/attack squares. The overlay is
 * derived render state and is not part of the hash that peers reconcile.
 */
export interface ChessBoardState extends ChessBoardSnapshot<ChessPiece> {
  selectedPiece: ChessPiece | null;
  validMoves: ChessBoardPosition[];
  attackMoves: ChessBoardPosition[];
}

export type { ChessBoardSnapshot } from '@shared/protocol-core/chess/state';

/**
 * Initial board setup + per-type stats — re-exported from shared/protocol-core
 * so both peers compute identical piece ids and starting health.
 * See `shared/protocol-core/chess/boardSetup.ts` for the canon.
 */
export {
	PIECE_BASE_STATS,
	PLAYER_INITIAL_POSITIONS,
	OPPONENT_INITIAL_POSITIONS
} from '@shared/protocol-core/chess/boardSetup';
export type {
	InitialPiecePosition,
	ChessPieceStats
} from '@shared/protocol-core/chess/boardSetup';

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
  mythology?: 'norse' | 'greek' | 'egyptian' | 'japanese'; // Mythology faction hint
}

/**
 * Collision event when pieces meet
 */
export interface ChessCollision {
  attacker: ChessPiece;
  defender: ChessPiece;
  attackerPosition: ChessBoardPosition;
  defenderPosition: ChessBoardPosition;
  instantKill?: boolean; // Stays on chess: pawn attacker, pawn defender, or king defender
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
export type KingRarity = 'common' | 'rare' | 'epic' | 'mythic';

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

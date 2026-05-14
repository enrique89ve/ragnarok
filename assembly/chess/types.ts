/**
 * types.ts — AS twin of shared/protocol-core/chess/types.ts.
 *
 * Pure board/movement primitives for the chess phase. No hero/health/
 * element/stamina data — those are gameplay-model fields that stay TS
 * in chessCombatSlice (see .scratch/game-protocol-v2-phase1/DECISIONS.md D1).
 *
 * AS conventions:
 *  - All numeric fields are `i32` (TS `number` becomes `i32` here).
 *  - Discriminated unions become flat classes with int discriminators.
 *  - Static const arrays for movement vectors (no Map literals).
 *  - Type/owner/status are encoded as small i32 enums; their canonical
 *    string forms live in canonical.ts for emit/parse symmetry with the
 *    TS spec.
 */

// ====================================================================
// Piece type enum (canonical strings: "king" | "queen" | "rook" |
// "bishop" | "knight" | "pawn"). Order chosen for compact dispatch.
// ====================================================================

export const PIECE_KING: i32 = 0;
export const PIECE_QUEEN: i32 = 1;
export const PIECE_ROOK: i32 = 2;
export const PIECE_BISHOP: i32 = 3;
export const PIECE_KNIGHT: i32 = 4;
export const PIECE_PAWN: i32 = 5;

// ====================================================================
// Player side enum (canonical strings: "player" | "opponent").
// ====================================================================

export const SIDE_PLAYER: i32 = 0;
export const SIDE_OPPONENT: i32 = 1;
export const SIDE_NONE: i32 = -1; // used by inCheck when neither side is in check

// ====================================================================
// Game status enum (canonical strings: "setup" | "playing" | "combat"
// | "player_wins" | "opponent_wins"). Slice statuses preserved so the
// reducer's refreshDerived only promotes to terminal when win-cond fires.
// ====================================================================

export const STATUS_SETUP: i32 = 0;
export const STATUS_PLAYING: i32 = 1;
export const STATUS_COMBAT: i32 = 2;
export const STATUS_PLAYER_WINS: i32 = 3;
export const STATUS_OPPONENT_WINS: i32 = 4;

// ====================================================================
// Board geometry (5×7, NOT classical 8×8 — see TS twin).
// ====================================================================

export const BOARD_ROWS: i32 = 7;
export const BOARD_COLS: i32 = 5;

// ====================================================================
// Position — single cell coordinate.
// ====================================================================

export class Position {
	row: i32;
	col: i32;

	constructor(row: i32 = 0, col: i32 = 0) {
		this.row = row;
		this.col = col;
	}
}

// ====================================================================
// Piece — protocol-level shape only (no health/stamina/element/hero).
// Mirrors ChessProtocolPiece from the TS twin.
// ====================================================================

export class Piece {
	id: string;
	pieceType: i32;     // PIECE_* constant
	owner: i32;         // SIDE_PLAYER | SIDE_OPPONENT
	row: i32;
	col: i32;
	hasMoved: bool;

	constructor() {
		this.id = '';
		this.pieceType = PIECE_PAWN;
		this.owner = SIDE_PLAYER;
		this.row = 0;
		this.col = 0;
		this.hasMoved = false;
	}
}

// ====================================================================
// Movement pattern types (matches MovementPattern.type in TS twin).
// ====================================================================

export const PATTERN_LINE: i32 = 0;     // queen, rook, bishop (slide until blocked)
export const PATTERN_POINT: i32 = 1;    // pawn forward (single step)
export const PATTERN_L_SHAPE: i32 = 2;  // knight (jump, no blocking)
export const PATTERN_SURROUND: i32 = 3; // king (single step in any direction)

// Direction vectors (flat i32 pairs row,col interleaved for AS-friendliness).
// Each pattern's vector list is a flat i32[] of length 2*N where pair i is
// (vectors[2*i], vectors[2*i+1]).

// Queen / King: all 8 surround directions.
const SURROUND_DIRS: i32[] = [
	1, 0,  -1, 0,
	0, 1,  0, -1,
	1, 1,  -1, -1,
	1, -1, -1, 1,
];

// Rook: 4 orthogonal directions.
const ROOK_DIRS: i32[] = [
	1, 0,  -1, 0,
	0, 1,  0, -1,
];

// Bishop: 4 diagonal directions.
const BISHOP_DIRS: i32[] = [
	1, 1,  -1, -1,
	1, -1, -1, 1,
];

// Knight: 8 L-shape jumps.
const KNIGHT_DIRS: i32[] = [
	-2, -1,  2, -1,
	-1, -2,  -1, 2,
	-2, 1,   2, 1,
	1, -2,   1, 2,
];

// Pawn forward (player only — opponent direction is mirrored at use-site).
const PAWN_FORWARD: i32[] = [1, 0];

// ====================================================================
// Pattern accessors — return the (pattern-type, directions, maxDistance)
// triple for a piece type. AS doesn't carry the TS object literal, so
// the consumer reads via these getters.
// ====================================================================

export function getPatternType(pieceType: i32): i32 {
	if (pieceType == PIECE_QUEEN) return PATTERN_LINE;
	if (pieceType == PIECE_ROOK) return PATTERN_LINE;
	if (pieceType == PIECE_BISHOP) return PATTERN_LINE;
	if (pieceType == PIECE_KNIGHT) return PATTERN_L_SHAPE;
	if (pieceType == PIECE_PAWN) return PATTERN_POINT;
	// PIECE_KING:
	return PATTERN_SURROUND;
}

export function getPatternDirections(pieceType: i32): i32[] {
	if (pieceType == PIECE_QUEEN) return SURROUND_DIRS;
	if (pieceType == PIECE_ROOK) return ROOK_DIRS;
	if (pieceType == PIECE_BISHOP) return BISHOP_DIRS;
	if (pieceType == PIECE_KING) return SURROUND_DIRS;
	if (pieceType == PIECE_KNIGHT) return KNIGHT_DIRS;
	// PIECE_PAWN:
	return PAWN_FORWARD;
}

export function getPatternMaxDistance(pieceType: i32): i32 {
	if (pieceType == PIECE_KING) return 1;
	if (pieceType == PIECE_PAWN) return 1;
	return 0; // 0 means "unbounded" for line patterns; consumer checks pattern type
}

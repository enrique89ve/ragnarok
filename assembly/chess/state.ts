/**
 * state.ts — AS twin of shared/protocol-core/chess/state.ts.
 *
 * Captures the deterministic, hashable state of the chess phase:
 * pieces, whose turn it is, terminal status, ply count, and the
 * side currently in check (or SIDE_NONE).
 *
 * Matches the field set the TS twin canonicalizes — no UI overlay
 * fields (selection, highlights) live here. See state.ts in the TS
 * twin for the full domain rationale.
 */

import { Piece, SIDE_NONE, SIDE_PLAYER, STATUS_PLAYING } from './types';

export class Snapshot {
	pieces: Piece[];
	currentTurn: i32;   // SIDE_PLAYER | SIDE_OPPONENT
	gameStatus: i32;    // STATUS_* constant
	moveCount: i32;
	inCheck: i32;       // SIDE_PLAYER | SIDE_OPPONENT | SIDE_NONE

	constructor() {
		this.pieces = [];
		this.currentTurn = SIDE_PLAYER;
		this.gameStatus = STATUS_PLAYING;
		this.moveCount = 0;
		this.inCheck = SIDE_NONE;
	}
}

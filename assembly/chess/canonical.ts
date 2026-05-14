/**
 * canonical.ts — canonical JSON emit + canonical-form parser.
 *
 * Per DECISIONS.md D3: the TS module `shared/protocol-core/chess/canonicalize.ts`
 * is the *spec* of canonical form. AS does NOT re-implement canonicalize;
 * instead this file emits JSON in canonical shape directly (matching the
 * TS spec byte-for-byte) and parses canonical-form JSON back into AS
 * structs.
 *
 * Inputs to this parser are guaranteed canonical by the TS bridge
 * (`canonicalChessSnapshot` + `canonicalAction` in client/src/game/engine/
 * chessReducer.ts). A general JSON parser is not needed — only the
 * canonical-form parser below.
 *
 * Byte-equality rules (mirror shared/protocol-core/chess/canonicalize.ts):
 *  - Numbers serialize via String(n).
 *  - Booleans serialize as literal "true" / "false".
 *  - inCheck === null emits literal `null`, not `"null"`.
 *  - Pieces sorted by id lex-ascending.
 *  - Piece keys: hasMoved, id, owner, position, type (alphabetical).
 *  - Position keys: col, row (alphabetical).
 *  - Snapshot top-level keys: currentTurn, gameStatus, inCheck, moveCount,
 *    pieces (alphabetical).
 *  - Result keys: ok, reason  OR  ok, state (alphabetical).
 *  - String escape set: 0x22, 0x5c, 0x08, 0x0c, 0x0a, 0x0d, 0x09, then
 *    \uXXXX for any other code < 0x20.
 */

import { Snapshot } from './state';
import {
	Piece,
	PIECE_KING,
	PIECE_QUEEN,
	PIECE_ROOK,
	PIECE_BISHOP,
	PIECE_KNIGHT,
	PIECE_PAWN,
	SIDE_PLAYER,
	SIDE_OPPONENT,
	SIDE_NONE,
	STATUS_SETUP,
	STATUS_PLAYING,
	STATUS_COMBAT,
	STATUS_PLAYER_WINS,
	STATUS_OPPONENT_WINS,
} from './types';

// ====================================================================
// String escape — byte-equal to shared/protocol-core/chess/canonicalize.ts
// escapeJsonString (lines 57-72). Includes \b and \f, which the existing
// assembly/util/stableStringify.ts deliberately omits — do NOT reuse
// that function here.
// ====================================================================

export function escapeJsonString(s: string): string {
	let out = '"';
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		if (c == 0x22) out += '\\"';
		else if (c == 0x5c) out += '\\\\';
		else if (c == 0x08) out += '\\b';
		else if (c == 0x0c) out += '\\f';
		else if (c == 0x0a) out += '\\n';
		else if (c == 0x0d) out += '\\r';
		else if (c == 0x09) out += '\\t';
		else if (c < 0x20) {
			out += '\\u' + c.toString(16).padStart(4, '0');
		} else {
			out += String.fromCharCode(c);
		}
	}
	out += '"';
	return out;
}

// ====================================================================
// Canonical string forms for enums. These MUST match the TS spec values.
// ====================================================================

export function pieceTypeToString(t: i32): string {
	if (t == PIECE_KING) return 'king';
	if (t == PIECE_QUEEN) return 'queen';
	if (t == PIECE_ROOK) return 'rook';
	if (t == PIECE_BISHOP) return 'bishop';
	if (t == PIECE_KNIGHT) return 'knight';
	return 'pawn';
}

export function pieceTypeFromString(s: string): i32 {
	if (s == 'king') return PIECE_KING;
	if (s == 'queen') return PIECE_QUEEN;
	if (s == 'rook') return PIECE_ROOK;
	if (s == 'bishop') return PIECE_BISHOP;
	if (s == 'knight') return PIECE_KNIGHT;
	return PIECE_PAWN;
}

export function sideToString(s: i32): string {
	return s == SIDE_PLAYER ? 'player' : 'opponent';
}

export function sideFromString(s: string): i32 {
	return s == 'player' ? SIDE_PLAYER : SIDE_OPPONENT;
}

export function statusToString(s: i32): string {
	if (s == STATUS_SETUP) return 'setup';
	if (s == STATUS_PLAYING) return 'playing';
	if (s == STATUS_COMBAT) return 'combat';
	if (s == STATUS_PLAYER_WINS) return 'player_wins';
	return 'opponent_wins';
}

export function statusFromString(s: string): i32 {
	if (s == 'setup') return STATUS_SETUP;
	if (s == 'playing') return STATUS_PLAYING;
	if (s == 'combat') return STATUS_COMBAT;
	if (s == 'player_wins') return STATUS_PLAYER_WINS;
	return STATUS_OPPONENT_WINS;
}

// ====================================================================
// Sort pieces by id lex-ascending (in-place bubble sort, stable enough
// for canonical output — same algorithm cards engine uses in
// assembly/util/stableStringify.ts).
// ====================================================================

export function sortPiecesById(pieces: Piece[]): Piece[] {
	const out = pieces.slice(0);
	for (let i = 0; i < out.length; i++) {
		for (let j = i + 1; j < out.length; j++) {
			if (out[j].id < out[i].id) {
				const tmp = out[i];
				out[i] = out[j];
				out[j] = tmp;
			}
		}
	}
	return out;
}

// ====================================================================
// Emit a single piece in canonical form. Field order: hasMoved, id,
// owner, position, type. position inner keys: col, row.
// ====================================================================

export function emitPiece(p: Piece): string {
	let s = '{"hasMoved":';
	s += p.hasMoved ? 'true' : 'false';
	s += ',"id":' + escapeJsonString(p.id);
	s += ',"owner":' + escapeJsonString(sideToString(p.owner));
	s += ',"position":{"col":' + p.col.toString() + ',"row":' + p.row.toString() + '}';
	s += ',"type":' + escapeJsonString(pieceTypeToString(p.pieceType));
	s += '}';
	return s;
}

// ====================================================================
// Emit a snapshot in canonical form. Keys: currentTurn, gameStatus,
// inCheck, moveCount, pieces (alphabetical).
// ====================================================================

export function emitSnapshot(snap: Snapshot): string {
	const sorted = sortPiecesById(snap.pieces);
	let s = '{"currentTurn":' + escapeJsonString(sideToString(snap.currentTurn));
	s += ',"gameStatus":' + escapeJsonString(statusToString(snap.gameStatus));
	s += ',"inCheck":';
	if (snap.inCheck == SIDE_NONE) {
		s += 'null';
	} else {
		s += escapeJsonString(sideToString(snap.inCheck));
	}
	s += ',"moveCount":' + snap.moveCount.toString();
	s += ',"pieces":[';
	for (let i = 0; i < sorted.length; i++) {
		if (i > 0) s += ',';
		s += emitPiece(sorted[i]);
	}
	s += ']}';
	return s;
}

// ====================================================================
// Emit ReduceResult shapes. Keys alphabetical (ok, reason) or (ok, state).
// ====================================================================

export function emitOk(snap: Snapshot): string {
	return '{"ok":true,"state":' + emitSnapshot(snap) + '}';
}

export function emitRejection(reason: string): string {
	return '{"ok":false,"reason":' + escapeJsonString(reason) + '}';
}

// ====================================================================
// Cursor parser — walks canonical-form JSON. Inputs are guaranteed
// canonical by the TS bridge, so the parser doesn't handle whitespace,
// alternate key order, or general escape sequences in piece ids
// (seeded ids are alphanumeric — documented assumption per DECISIONS.md D3).
// ====================================================================

export class Cursor {
	src: string;
	pos: i32;

	constructor(src: string) {
		this.src = src;
		this.pos = 0;
	}

	expect(literal: string): void {
		for (let i = 0; i < literal.length; i++) {
			if (this.src.charCodeAt(this.pos + i) != literal.charCodeAt(i)) {
				// Determinism-safe failure: leave pos unchanged. Reducer
				// surfaces this as an illegal-target / no-such-piece path
				// via the action-parse layer. We do not throw in AS hot
				// paths because traps cost more than a parse failure here.
				return;
			}
		}
		this.pos += literal.length;
	}

	peek(): i32 {
		return this.src.charCodeAt(this.pos);
	}

	readString(): string {
		// Assumes opening '"' has already been consumed. Reads until next
		// unescaped '"'. Seeded ids are alphanumeric, so escape sequences
		// inside strings are not expected in canonical inputs.
		const start = this.pos;
		while (this.pos < this.src.length && this.src.charCodeAt(this.pos) != 0x22) {
			this.pos++;
		}
		const out = this.src.substring(start, this.pos);
		this.pos++; // consume closing '"'
		return out;
	}

	readInt(): i32 {
		const start = this.pos;
		// Handle optional leading minus (moveCount is non-negative, but
		// future fields might use signed ints).
		if (this.src.charCodeAt(this.pos) == 0x2d) this.pos++;
		while (this.pos < this.src.length) {
			const c = this.src.charCodeAt(this.pos);
			if (c < 0x30 || c > 0x39) break;
			this.pos++;
		}
		return i32.parse(this.src.substring(start, this.pos));
	}

	readBool(): bool {
		if (this.src.charCodeAt(this.pos) == 0x74) {
			this.pos += 4; // 'true'
			return true;
		}
		this.pos += 5; // 'false'
		return false;
	}
}

// ====================================================================
// parseSnapshot — accepts canonical snapshot JSON, returns Snapshot.
// Field order assumed: currentTurn, gameStatus, inCheck, moveCount, pieces.
// ====================================================================

export function parseSnapshot(json: string): Snapshot {
	const c = new Cursor(json);
	const snap = new Snapshot();

	c.expect('{"currentTurn":"');
	snap.currentTurn = sideFromString(c.readString());

	c.expect(',"gameStatus":"');
	snap.gameStatus = statusFromString(c.readString());

	c.expect(',"inCheck":');
	if (c.peek() == 0x6e) {
		// 'null'
		c.expect('null');
		snap.inCheck = SIDE_NONE;
	} else {
		c.expect('"');
		snap.inCheck = sideFromString(c.readString());
	}

	c.expect(',"moveCount":');
	snap.moveCount = c.readInt();

	c.expect(',"pieces":[');
	while (c.peek() != 0x5d) {
		// not ']'
		const p = parsePiece(c);
		snap.pieces.push(p);
		if (c.peek() == 0x2c) c.pos++; // skip ','
	}
	c.expect(']}');

	return snap;
}

function parsePiece(c: Cursor): Piece {
	const p = new Piece();
	c.expect('{"hasMoved":');
	p.hasMoved = c.readBool();
	c.expect(',"id":"');
	p.id = c.readString();
	c.expect(',"owner":"');
	p.owner = sideFromString(c.readString());
	c.expect(',"position":{"col":');
	p.col = c.readInt();
	c.expect(',"row":');
	p.row = c.readInt();
	c.expect('},"type":"');
	p.pieceType = pieceTypeFromString(c.readString());
	c.expect('}');
	return p;
}

// ====================================================================
// Action parsing. Discriminated by first key after '{':
//   - "kind" first → move | promote | endTurn (alphabetical: k < others)
//   - "attackerId" first → capture (a < k)
// ====================================================================

export const ACTION_MOVE: i32 = 0;
export const ACTION_CAPTURE: i32 = 1;
export const ACTION_PROMOTE: i32 = 2;
export const ACTION_END_TURN: i32 = 3;

export class ParsedAction {
	kind: i32;
	pieceId: string;       // move, promote
	attackerId: string;    // capture
	victimId: string;      // capture
	toCol: i32;            // move, capture
	toRow: i32;            // move, capture
	promoteTo: i32;        // promote (PIECE_* constant)

	constructor() {
		this.kind = ACTION_END_TURN;
		this.pieceId = '';
		this.attackerId = '';
		this.victimId = '';
		this.toCol = 0;
		this.toRow = 0;
		this.promoteTo = PIECE_PAWN;
	}
}

export function parseAction(json: string): ParsedAction {
	const action = new ParsedAction();
	const c = new Cursor(json);

	// Sniff first key: `{"a...` is capture; `{"k...` is one of move/promote/endTurn.
	if (c.src.charCodeAt(1) == 0x22 && c.src.charCodeAt(2) == 0x61) {
		// 'a' → capture
		c.expect('{"attackerId":"');
		action.attackerId = c.readString();
		c.expect(',"kind":"capture","to":{"col":');
		action.toCol = c.readInt();
		c.expect(',"row":');
		action.toRow = c.readInt();
		c.expect('},"victimId":"');
		action.victimId = c.readString();
		c.expect('}');
		action.kind = ACTION_CAPTURE;
		return action;
	}

	// Otherwise: {"kind":"X",...}
	c.expect('{"kind":"');
	const kind = c.readString();

	if (kind == 'endTurn') {
		action.kind = ACTION_END_TURN;
		return action;
	}

	if (kind == 'move') {
		c.expect(',"pieceId":"');
		action.pieceId = c.readString();
		c.expect(',"to":{"col":');
		action.toCol = c.readInt();
		c.expect(',"row":');
		action.toRow = c.readInt();
		c.expect('}}');
		action.kind = ACTION_MOVE;
		return action;
	}

	// promote
	c.expect(',"pieceId":"');
	action.pieceId = c.readString();
	c.expect(',"to":"');
	action.promoteTo = pieceTypeFromString(c.readString());
	c.expect('}');
	action.kind = ACTION_PROMOTE;
	return action;
}

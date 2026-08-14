/**
 * reducer.ts — pure state-transition function for the chess phase.
 *
 * `applyChessAction(state, action)` returns either the next snapshot or a
 * structured rejection. The reducer is total over `ChessAction`, never
 * throws, never mutates the input, and depends only on the predicates in
 * `chessRules.ts` (themselves pure). Two peers feeding identical inputs
 * land on byte-equivalent outputs — the contract that lets a P2P
 * validator or a future server-side checker reuse this without forking.
 *
 * Scope is geometry only. Health/stamina/element/log/animation belong to
 * the gameplay model and live in the client slice; they are applied as
 * before/after hooks around `applyChessAction`. The reducer touches only
 * the five protocol fields of `ChessProtocolPiece`.
 *
 * The reducer is generic over `P extends ChessProtocolPiece` so callers
 * with richer piece types (the client's `ChessPiece`) get those types
 * back unchanged — no translation layer at the seam.
 */

import type { ChessBoardPosition, ChessPieceType, ChessPlayerSide, ChessProtocolPiece } from './types';
import type { ChessBoardSnapshot } from './state';
import { checkWinCondition, isKingInCheck, getValidMoves } from './chessRules';

export type ChessAction =
	| { readonly kind: 'move'; readonly pieceId: string; readonly to: ChessBoardPosition }
	| {
			readonly kind: 'capture';
			readonly attackerId: string;
			readonly victimId: string;
			readonly to: ChessBoardPosition;
	  }
	| { readonly kind: 'promote'; readonly pieceId: string; readonly to: ChessPieceType }
	| { readonly kind: 'endTurn' };

export type ChessRejection =
	| 'no-such-piece'
	| 'wrong-turn'
	| 'illegal-target'
	| 'not-promotable'
	| 'game-over';

export type ChessReduceResult<P extends ChessProtocolPiece> =
	| { readonly ok: true; readonly state: ChessBoardSnapshot<P> }
	| { readonly ok: false; readonly reason: ChessRejection };

/**
 * Replace a single piece by id in the snapshot's piece array, preserving
 * order. Pure — returns a new array.
 */
const replacePiece = <P extends ChessProtocolPiece>(
	pieces: ReadonlyArray<P>,
	pieceId: string,
	mapper: (p: P) => P
): P[] => pieces.map(p => (p.id === pieceId ? mapper(p) : p));

/**
 * After any move/capture/promote, the king-in-check signal and the
 * terminal status both depend on the new piece array. We recompute them
 * once and stamp them into the snapshot so callers never see a state
 * with stale derived fields.
 */
const refreshDerived = <P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	nextPieces: P[]
): ChessBoardSnapshot<P> => {
	const playerInCheck = isKingInCheck('player', nextPieces);
	const opponentInCheck = isKingInCheck('opponent', nextPieces);
	let inCheck: ChessPlayerSide | null = null;
	if (playerInCheck) inCheck = 'player';
	else if (opponentInCheck) inCheck = 'opponent';

	const winStatus = checkWinCondition(nextPieces);
	// Preserve non-terminal slice statuses ('setup', 'combat'); only
	// promote to a terminal status when the predicate says so.
	const gameStatus =
		winStatus === 'playing' ? state.gameStatus : winStatus;

	return {
		...state,
		pieces: nextPieces,
		inCheck,
		gameStatus
	};
};

const reduceMove = <P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	pieceId: string,
	to: ChessBoardPosition
): ChessReduceResult<P> => {
	const piece = state.pieces.find(p => p.id === pieceId);
	if (!piece) return { ok: false, reason: 'no-such-piece' };
	if (piece.owner !== state.currentTurn) return { ok: false, reason: 'wrong-turn' };

	const { moves } = getValidMoves(piece, state.pieces);
	const legal = moves.some(m => m.row === to.row && m.col === to.col);
	if (!legal) return { ok: false, reason: 'illegal-target' };

	const nextPieces = replacePiece(state.pieces, pieceId, p => ({
		...p,
		position: to,
		hasMoved: true
	}));

	const next: ChessBoardSnapshot<P> = {
		...state,
		moveCount: state.moveCount + 1
	};
	return { ok: true, state: refreshDerived(next, nextPieces) };
};

const reduceCapture = <P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	attackerId: string,
	victimId: string,
	to: ChessBoardPosition
): ChessReduceResult<P> => {
	const attacker = state.pieces.find(p => p.id === attackerId);
	const victim = state.pieces.find(p => p.id === victimId);
	if (!attacker || !victim) return { ok: false, reason: 'no-such-piece' };
	if (attacker.owner !== state.currentTurn) return { ok: false, reason: 'wrong-turn' };
	if (victim.owner === attacker.owner) return { ok: false, reason: 'illegal-target' };
	if (victim.position.row !== to.row || victim.position.col !== to.col) {
		return { ok: false, reason: 'illegal-target' };
	}
	const { attacks } = getValidMoves(attacker, state.pieces);
	const legalCapture = attacks.some(position =>
		position.row === to.row && position.col === to.col
	);
	if (!legalCapture) return { ok: false, reason: 'illegal-target' };

	const nextPieces: P[] = state.pieces
		.filter(p => p.id !== victimId)
		.map(p => (p.id === attackerId ? { ...p, position: to, hasMoved: true } : p));

	const next: ChessBoardSnapshot<P> = {
		...state,
		moveCount: state.moveCount + 1
	};
	return { ok: true, state: refreshDerived(next, nextPieces) };
};

const reducePromote = <P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	pieceId: string,
	to: ChessPieceType
): ChessReduceResult<P> => {
	const piece = state.pieces.find(p => p.id === pieceId);
	if (!piece) return { ok: false, reason: 'no-such-piece' };
	if (piece.type !== 'pawn') return { ok: false, reason: 'not-promotable' };
	if (to === 'pawn' || to === 'king') return { ok: false, reason: 'not-promotable' };
	const onFarRank =
		(piece.owner === 'player' && piece.position.row === 6) ||
		(piece.owner === 'opponent' && piece.position.row === 0);
	if (!onFarRank) return { ok: false, reason: 'not-promotable' };

	const nextPieces = replacePiece(state.pieces, pieceId, p => ({ ...p, type: to }));
	return { ok: true, state: refreshDerived(state, nextPieces) };
};

const reduceEndTurn = <P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>
): ChessReduceResult<P> => {
	if (state.gameStatus !== 'playing' && state.gameStatus !== 'setup') {
		return { ok: false, reason: 'game-over' };
	}
	return {
		ok: true,
		state: {
			...state,
			currentTurn: state.currentTurn === 'player' ? 'opponent' : 'player'
		}
	};
};

export const applyChessAction = <P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	action: ChessAction
): ChessReduceResult<P> => {
	switch (action.kind) {
		case 'move':
			return reduceMove(state, action.pieceId, action.to);
		case 'capture':
			return reduceCapture(state, action.attackerId, action.victimId, action.to);
		case 'promote':
			return reducePromote(state, action.pieceId, action.to);
		case 'endTurn':
			return reduceEndTurn(state);
	}
};

/**
 * chessAITurnDriver — pure factory for the chess AI turn loop.
 *
 * The hook (`useChessAITurn`) owns React lifecycle and the timeout array;
 * this factory owns *what happens* on each tick: pick a move, request a
 * delayed attempt, retry on pending animation, early-return when the slice
 * state has moved on. Splitting the two lets us test the early-return
 * discipline (the lever behind the "doble movimiento" symptom) without a
 * React harness — the bug is "schedule fires after slice has flipped"; the
 * defenses are the early returns at the top of `runAITurn`/`attemptMove`.
 *
 * The factory is decoupled from the real store so tests can pass a
 * structural slice and a fake scheduler.
 */

import { pickChessMove, type ChessAIStyle, type ChessAIDifficulty } from '../../ai/chessAI';
import {
	getNoLegalMovesStatus,
	type ChessBoardPosition,
	type ChessProtocolPiece
} from '@shared/protocol-core/chess';
import type {
	ChessPiece,
	ChessGameStatus,
	ChessCollision,
} from '../../types/ChessTypes';
import type { PendingAttackAnimation } from '../../stores/combat/types';

export const CHESS_AI_FIRST_ATTEMPT_DELAY_MS = 2000;
export const CHESS_AI_ANIMATION_RETRY_DELAY_MS = 200;
export const CHESS_AI_POST_SELECT_DELAY_MS = 700;
export const CHESS_AI_POST_SELECT_DELAY_MS_JITTER = 0;
const CHESS_AI_STYLE_DELAY_MULTIPLIER_BY_DIFFICULTY: Record<
	ChessAIDifficulty,
	Record<ChessAIStyle, number>
> = {
	normal: { balanced: 1, aggressive: 0.85, defensive: 1.05, human: 1.35 },
	heroic: { balanced: 1, aggressive: 0.8, defensive: 1.0, human: 1.22 },
	mythic: { balanced: 1.0, aggressive: 0.72, defensive: 0.95, human: 1.12 },
};

export const CHESS_AI_FIRST_ATTEMPT_DELAY_MS_BY_DIFFICULTY: Record<
	ChessAIDifficulty,
	{ base: number; jitter: number }
> = {
	normal: { base: 2200, jitter: 900 },
	heroic: { base: 1700, jitter: 700 },
	mythic: { base: 1300, jitter: 500 },
};

export const CHESS_AI_POST_SELECT_DELAY_MS_BY_DIFFICULTY: Record<
	ChessAIDifficulty,
	{ base: number; jitter: number }
> = {
	normal: { base: CHESS_AI_POST_SELECT_DELAY_MS, jitter: CHESS_AI_POST_SELECT_DELAY_MS_JITTER },
	heroic: { base: 650, jitter: 250 },
	mythic: { base: 450, jitter: 200 },
};

export type ChessAIBehaviorProfile = 'single' | 'campaign';

export const getAIFirstAttemptDelayMs = (
	difficulty: ChessAIDifficulty,
	rng: () => number,
	style: ChessAIStyle = 'balanced',
): number => {
	const profile = CHESS_AI_FIRST_ATTEMPT_DELAY_MS_BY_DIFFICULTY[difficulty];
	const multiplier = CHESS_AI_STYLE_DELAY_MULTIPLIER_BY_DIFFICULTY[difficulty][style];
	return Math.max(
		CHESS_AI_FIRST_ATTEMPT_DELAY_MS,
		Math.round((profile.base + rng() * profile.jitter) * multiplier)
	);
};

const getPostDelayMsProfile = (
	difficulty: ChessAIDifficulty,
	rng: () => number,
	style: ChessAIStyle = 'balanced',
): number => {
	const profile = CHESS_AI_POST_SELECT_DELAY_MS_BY_DIFFICULTY[difficulty];
	const multiplier = CHESS_AI_STYLE_DELAY_MULTIPLIER_BY_DIFFICULTY[difficulty][style];
	return Math.max(
		CHESS_AI_POST_SELECT_DELAY_MS,
		Math.round((profile.base + rng() * profile.jitter) * multiplier)
	);
};

interface MovePlan {
	readonly piece: ChessPiece;
	readonly target: ChessBoardPosition;
	readonly isAttack: boolean;
	readonly score: number;
}

/**
 * Minimum surface of the unified combat store that the AI driver reads.
 * Declared structurally so tests can supply an in-memory fake without
 * pulling zustand into the test harness.
 */
export interface ChessAIDriverSlice {
	readonly boardState: {
		readonly currentTurn: 'player' | 'opponent';
		readonly gameStatus: ChessGameStatus;
		readonly pieces: ReadonlyArray<ChessPiece>;
	};
	readonly pendingAttackAnimation: PendingAttackAnimation | null;
	readonly _chessRng: (() => number) | null;
	getValidMoves(piece: ChessPiece): { moves: ChessBoardPosition[]; attacks: ChessBoardPosition[] };
	getPieceAt(position: ChessBoardPosition): ChessPiece | null;
	selectPiece(piece: ChessPiece | null): void;
	movePiece(target: ChessBoardPosition): ChessCollision | null | void;
	setGameStatus(status: ChessGameStatus): void;
}

export interface ChessAIDriverDeps {
	/** Read the latest slice on every entry — never cache; we explicitly
	 * want the post-flip view at the moment a delayed callback fires. */
	readonly getSlice: () => ChessAIDriverSlice;
	/** RNG fallback when the slice has not yet seeded `_chessRng`. */
	readonly rngFallback: () => number;
	/** Schedule a delayed callback. The hook plumbs `setTimeout` here and
	 * registers the id for batch cleanup; the test plumbs a fake clock. */
	readonly schedule: (fn: () => void, ms: number) => void;
	readonly difficulty?: ChessAIDifficulty;
	readonly style?: ChessAIStyle;
	readonly behaviorProfile?: ChessAIBehaviorProfile;
	/** Optional debug log; defaults to no-op. */
	readonly log?: (msg: string) => void;
}

export interface ChessAITurnDriver {
	/** Plan and dispatch the opponent's turn. Idempotent on repeated calls
	 * after the slice has flipped — early returns mean a stale invocation
	 * is a no-op, not a duplicate move. */
	readonly runAITurn: () => void;
}

export function createChessAITurnDriver(deps: ChessAIDriverDeps): ChessAITurnDriver {
	const log = deps.log ?? (() => {});
	const difficulty: ChessAIDifficulty = deps.difficulty ?? 'normal';
	const style: ChessAIStyle = deps.style ?? 'balanced';
	const behaviorProfile: ChessAIBehaviorProfile = deps.behaviorProfile ?? 'campaign';
	const styleForDecision = behaviorProfile === 'single' ? style : 'balanced';

	const attemptMove = (plan: MovePlan): void => {
		const slice = deps.getSlice();
		if (slice.boardState.gameStatus !== 'playing') return;
		if (slice.boardState.currentTurn !== 'opponent') return;

		if (slice.pendingAttackAnimation) {
			log('[AI] Waiting for animation to complete, retrying...');
			deps.schedule(() => attemptMove(plan), CHESS_AI_ANIMATION_RETRY_DELAY_MS);
			return;
		}

		const piece = slice.boardState.pieces.find((p) => p.id === plan.piece.id);
		if (!piece) {
			log('[AI] Piece no longer exists, skipping move');
			return;
		}

		const { moves, attacks } = slice.getValidMoves(piece);
		const targetStillValid = [...moves, ...attacks].some(
			(m) => m.row === plan.target.row && m.col === plan.target.col
		);
		if (!targetStillValid) {
			log('[AI] Target no longer valid, recalculating...');
			slice.selectPiece(null);
			runAITurn();
			return;
		}

		slice.selectPiece(piece);
		const collision = slice.movePiece(plan.target);
		if (!collision) {
			log(`[AI] Moved ${plan.piece.type} to (${plan.target.row}, ${plan.target.col})`);
		} else if (collision.instantKill) {
			log(`[AI] Instant kill with ${collision.attacker.type} against ${collision.defender.type}`);
		} else {
			log(`[AI] PvP combat: ${collision.attacker.type} vs ${collision.defender.type}`);
		}
	};

	const runAITurn = (): void => {
		const slice = deps.getSlice();
		if (slice.boardState.currentTurn !== 'opponent') return;
		if (slice.boardState.gameStatus !== 'playing') return;

		const opponentPieces = slice.boardState.pieces.filter((p) => p.owner === 'opponent');
		const rng = slice._chessRng ?? deps.rngFallback;

		const move = pickChessMove<ChessProtocolPiece>(opponentPieces, {
			getValidMoves: (piece) => slice.getValidMoves(piece as ChessPiece),
			getPieceAt: (position) => slice.getPieceAt(position),
			rng,
		}, difficulty, styleForDecision);

		if (!move) {
			const terminalStatus = getNoLegalMovesStatus('opponent', slice.boardState.pieces);
			log(`[AI] No valid moves — setting chess status ${terminalStatus}`);
			if (terminalStatus !== 'playing') slice.setGameStatus(terminalStatus);
			return;
		}

		const plan: MovePlan = {
			piece: move.piece as ChessPiece,
			target: move.target,
			isAttack: move.isAttack,
			score: move.score,
		};

		const postDelayMs = getPostDelayMsProfile(difficulty, rng, style);
		slice.selectPiece(plan.piece);
		deps.schedule(() => attemptMove(plan), Math.round(postDelayMs));
	};

	return { runAITurn };
}

/**
 * chessAI.ts — pure move-selection for the opponent bot.
 *
 * `pickChessMove` is a deterministic decision function: given a snapshot of
 * the board (the opponent's pieces, the legal moves/attacks per piece, and
 * a seeded RNG for tie-breaking) it returns the best move it can find, or
 * `null` if no legal move exists (stalemate from the bot's perspective).
 *
 * No timers, no setState, no Zustand access. The orchestration concerns
 * (when to fire, how to retry on pending animations, how to call
 * selectPiece/movePiece on the slice) live in `useChessAITurn`. Keeping
 * the decision pure means the AI is testable and — should we ever want a
 * cross-peer deterministic bot — the same `pickChessMove` plus a shared
 * seed produces the same plan on both sides.
 */

import type { ChessBoardPosition, ChessPieceType, ChessProtocolPiece } from '@shared/protocol-core/chess';
import { isChessAttackInstantKill } from '@shared/p2p-wire/chess';

export type ChessAIDifficulty = 'normal' | 'heroic' | 'mythic';
export type ChessAIStyle = 'balanced' | 'aggressive' | 'defensive' | 'human';

export interface AIChessHelpers<P extends ChessProtocolPiece> {
	getValidMoves: (piece: P) => { moves: ChessBoardPosition[]; attacks: ChessBoardPosition[] };
	getPieceAt: (position: ChessBoardPosition) => P | null;
	rng: () => number;
}

export interface ChessAIConfig {
	readonly attackBias: number;
	readonly instantKillBonus: number;
	readonly riskPenalty: number;
	readonly pawnPushBonus: number;
	readonly quietNoise: number;
	readonly moveErrorChance: number;
	readonly moveErrorWindow: number;
}

export interface ChessAIStyleProfile {
	readonly attackBiasDelta: number;
	readonly instantKillBonusDelta: number;
	readonly riskPenaltyDelta: number;
	readonly pawnPushBonusDelta: number;
	readonly quietNoiseDelta: number;
	readonly moveErrorChanceDelta: number;
	readonly moveErrorWindowDelta: number;
}

export interface AIChessMove<P extends ChessProtocolPiece> {
	piece: P;
	target: ChessBoardPosition;
	isAttack: boolean;
	score: number;
}

const PIECE_VALUE: Record<ChessPieceType, number> = {
	king: 1000,
	queen: 90,
	rook: 50,
	bishop: 30,
	knight: 30,
	pawn: 10,
};

const AI_CONFIG_BY_DIFFICULTY: Record<ChessAIDifficulty, ChessAIConfig> = {
	normal: {
		attackBias: 0,
		instantKillBonus: 8,
		riskPenalty: 0.35,
		pawnPushBonus: 3,
		quietNoise: 2.5,
		moveErrorChance: 0.18,
		moveErrorWindow: 3,
	},
	heroic: {
		attackBias: 6,
		instantKillBonus: 10,
		riskPenalty: 0.28,
		pawnPushBonus: 2,
		quietNoise: 1.5,
		moveErrorChance: 0.08,
		moveErrorWindow: 2,
	},
	mythic: {
		attackBias: 10,
		instantKillBonus: 12,
		riskPenalty: 0.22,
		pawnPushBonus: 1,
		quietNoise: 0.7,
		moveErrorChance: 0.02,
		moveErrorWindow: 1,
	},
};

const AI_STYLE_MODIFIERS: Record<ChessAIStyle, ChessAIStyleProfile> = {
	balanced: {
		attackBiasDelta: 0,
		instantKillBonusDelta: 0,
		riskPenaltyDelta: 0,
		pawnPushBonusDelta: 0,
		quietNoiseDelta: 0,
		moveErrorChanceDelta: 0,
		moveErrorWindowDelta: 0,
	},
	aggressive: {
		attackBiasDelta: 8,
		instantKillBonusDelta: 3,
		riskPenaltyDelta: -0.05,
		pawnPushBonusDelta: -1,
		quietNoiseDelta: -0.6,
		moveErrorChanceDelta: -0.08,
		moveErrorWindowDelta: -1,
	},
	defensive: {
		attackBiasDelta: -2,
		instantKillBonusDelta: -2,
		riskPenaltyDelta: 0.08,
		pawnPushBonusDelta: 2,
		quietNoiseDelta: 0.8,
		moveErrorChanceDelta: -0.04,
		moveErrorWindowDelta: -1,
	},
	human: {
		attackBiasDelta: -1,
		instantKillBonusDelta: -1,
		riskPenaltyDelta: 0.09,
		pawnPushBonusDelta: 1,
		quietNoiseDelta: 2.4,
		moveErrorChanceDelta: 0.24,
		moveErrorWindowDelta: 5,
	},
};

const clampMoveErrorChance = (value: number): number => Math.max(0, Math.min(1, value));
const clampMoveErrorWindow = (value: number): number => Math.max(1, Math.round(value));
const getStyle = (style: ChessAIStyle = 'balanced'): ChessAIStyle => style;

const withAIStyle = (
	difficulty: ChessAIDifficulty,
	style: ChessAIStyle = 'balanced',
): ChessAIConfig => {
	const baseConfig = getChessAIConfig(difficulty);
	const profile = AI_STYLE_MODIFIERS[getStyle(style)];

	return {
		attackBias: baseConfig.attackBias + profile.attackBiasDelta,
		instantKillBonus: baseConfig.instantKillBonus + profile.instantKillBonusDelta,
		riskPenalty: baseConfig.riskPenalty + profile.riskPenaltyDelta,
		pawnPushBonus: baseConfig.pawnPushBonus + profile.pawnPushBonusDelta,
		quietNoise: baseConfig.quietNoise + profile.quietNoiseDelta,
		moveErrorChance: clampMoveErrorChance(baseConfig.moveErrorChance + profile.moveErrorChanceDelta),
		moveErrorWindow: clampMoveErrorWindow(baseConfig.moveErrorWindow + profile.moveErrorWindowDelta),
	};
};

export const getDefaultChessAIDifficulty = (difficulty?: ChessAIDifficulty): ChessAIDifficulty =>
	difficulty ?? 'normal';

export const getChessAIConfig = (difficulty: ChessAIDifficulty): ChessAIConfig =>
	AI_CONFIG_BY_DIFFICULTY[difficulty];

const scoreAttack = <P extends ChessProtocolPiece>(
	attacker: P,
	defender: P
): number => {
	const attackerValue = PIECE_VALUE[attacker.type];
	const targetValue = PIECE_VALUE[defender.type];
	const isInstantKill = isChessAttackInstantKill({
		attackerType: attacker.type,
		defenderType: defender.type,
	});

	if (isInstantKill) {
		const attackBias = attacker.type === 'pawn' ? 15 : 10;
		return targetValue + attackBias;
	}
	const riskFactor = attackerValue * 0.3;
	return targetValue - riskFactor;
};

const scoreQuietMove = <P extends ChessProtocolPiece>(
	piece: P,
	move: ChessBoardPosition,
	rng: () => number
): number => {
	const forwardBonus = (piece.position.row - move.row) * 2;
	const pawnPushBonus = piece.type === 'pawn' ? 3 : 0;
	return 5 + forwardBonus + pawnPushBonus + rng() * 3;
};

const buildScoredAttack = <P extends ChessProtocolPiece>(
	attacker: P,
		defender: P,
	target: ChessBoardPosition,
	config: ChessAIConfig,
	rng: () => number
): AIChessMove<P> => {
	const base = scoreAttack(attacker, defender);
	const attackerValue = PIECE_VALUE[attacker.type];
	const riskPenalty = attackerValue * config.riskPenalty;
	const isInstantKill = isChessAttackInstantKill({
		attackerType: attacker.type,
		defenderType: defender.type,
	});
	const instantKillBonus = isInstantKill ? config.instantKillBonus : 0;
	const score = base + config.attackBias + instantKillBonus + rng() * config.quietNoise - riskPenalty;
	return { piece: attacker, target, isAttack: true, score };
};

const buildScoredQuiet = <P extends ChessProtocolPiece>(
	piece: P,
	move: ChessBoardPosition,
	config: ChessAIConfig,
	rng: () => number
): AIChessMove<P> => {
	const attackerValue = PIECE_VALUE[piece.type];
	const quietBonus = scoreQuietMove(piece, move, rng);
	const pawnBonus = piece.type === 'pawn' ? config.pawnPushBonus : 0;
	const score = quietBonus + pawnBonus + rng() * config.quietNoise - attackerValue * 0.04;
	return { piece, target: move, isAttack: false, score };
};

const pickWithHumanizedError = <P extends ChessProtocolPiece>(
	moves: AIChessMove<P>[],
	config: ChessAIConfig,
	rng: () => number
): AIChessMove<P> | null => {
	if (!moves.length) return null;
	moves.sort((a, b) => b.score - a.score);

	if (moves.length === 1) return moves[0] ?? null;
	if (config.moveErrorChance <= 0 || config.moveErrorWindow <= 1) return moves[0] ?? null;
	if (rng() >= config.moveErrorChance) return moves[0] ?? null;

	const window = Math.min(config.moveErrorWindow, moves.length);
	const offset = Math.floor(rng() * window);
	return moves[offset] ?? moves[0] ?? null;
};

/**
 * Pick the bot's next move for the side that owns `pieces`. Prefers the
 * highest-scoring capture; if no capture has positive score, falls back
 * to the highest-scoring quiet move. Returns `null` only when the side
 * has zero legal options on the board.
 */
export const pickChessMove = <P extends ChessProtocolPiece>(
	pieces: ReadonlyArray<P>,
	helpers: AIChessHelpers<P>,
	difficulty: ChessAIDifficulty = 'normal',
	style: ChessAIStyle = 'balanced'
): AIChessMove<P> | null => {
	const config = withAIStyle(difficulty, style);
	let bestAttack: AIChessMove<P> | null = null;
	let bestQuiet: AIChessMove<P> | null = null;
	const allMoves: AIChessMove<P>[] = [];

	for (const piece of pieces) {
		const { moves, attacks } = helpers.getValidMoves(piece);

		for (const attack of attacks) {
			const target = helpers.getPieceAt(attack);
			if (!target) continue;
			const move = buildScoredAttack(piece, target, attack, config, helpers.rng);
			if (move.score > 0) {
				allMoves.push(move);
				if (!bestAttack || move.score > bestAttack.score) {
					bestAttack = move;
				}
			}
		}

		for (const move of moves) {
			const scored = buildScoredQuiet(piece, move, config, helpers.rng);
			allMoves.push(scored);
			if (!bestQuiet || scored.score > bestQuiet.score) {
				bestQuiet = scored;
			}
		}
	}

	const chosen = pickWithHumanizedError(allMoves, config, helpers.rng);
	if (!chosen) return null;

	if (bestAttack && bestQuiet) {
		const capturePreference = bestAttack.score + config.attackBias > bestQuiet.score;
		return capturePreference && chosen.isAttack === false ? bestAttack : chosen;
	}

	return bestAttack ?? bestQuiet ?? chosen;
};

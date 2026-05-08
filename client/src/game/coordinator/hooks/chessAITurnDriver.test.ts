/**
 * Contract tests for `createChessAITurnDriver`.
 *
 * The driver's job is to plan an opponent move, request a delayed attempt,
 * retry on pending animation, and — crucially — early-return when the
 * slice state has flipped between scheduling and firing. The early-return
 * gates are what prevent the "doble movimiento" symptom: a stray callback
 * that fires after a turn change must not commit a second move.
 *
 * The factory is exercised here directly with a fake scheduler. Timer
 * cleanup itself is owned by the hook (`useChessAITurn`) and is not
 * scope here; what we lock in is the *behavioural* defense — that even if
 * the scheduler fires a stale callback, the driver refuses to act.
 */

import { describe, expect, it, vi } from 'vitest';
import {
	createChessAITurnDriver,
	CHESS_AI_POST_SELECT_DELAY_MS,
	CHESS_AI_ANIMATION_RETRY_DELAY_MS,
	type ChessAIDriverSlice,
} from './chessAITurnDriver';
import type { ChessPiece, ChessGameStatus } from '../../types/ChessTypes';
import type { ChessBoardPosition } from '@shared/protocol-core/chess';

interface FakeSliceState {
	currentTurn: 'player' | 'opponent';
	gameStatus: ChessGameStatus;
	pieces: ChessPiece[];
	pendingAttackAnimation: boolean;
}

interface FakeSliceWithSpies {
	readonly slice: ChessAIDriverSlice;
	readonly state: FakeSliceState;
	readonly selectPiece: ReturnType<typeof vi.fn>;
	readonly movePiece: ReturnType<typeof vi.fn>;
	readonly setGameStatus: ReturnType<typeof vi.fn>;
}

const makeOpponentQueen = (id = 'opp-queen', row = 3, col = 2): ChessPiece => ({
	id,
	type: 'queen',
	owner: 'opponent',
	position: { row, col },
	hasMoved: false,
	health: 100,
	maxHealth: 100,
	stamina: 1,
	heroClass: 'neutral',
	heroName: 'Test Queen',
	deckCardIds: [],
	hasSpells: false,
	element: 'fire',
});

const makeFakeSlice = (initial: FakeSliceState): FakeSliceWithSpies => {
	const state: FakeSliceState = { ...initial, pieces: [...initial.pieces] };
	const selectPiece = vi.fn<(piece: ChessPiece | null) => void>();
	const movePiece = vi.fn<(target: ChessBoardPosition) => null>(() => null);
	const setGameStatus = vi.fn<(status: ChessGameStatus) => void>((status) => {
		state.gameStatus = status;
	});

	const slice: ChessAIDriverSlice = {
		get boardState() {
			return {
				currentTurn: state.currentTurn,
				gameStatus: state.gameStatus,
				pieces: state.pieces,
			};
		},
		get pendingAttackAnimation() {
			return state.pendingAttackAnimation
				? ({} as unknown as ChessAIDriverSlice['pendingAttackAnimation'])
				: null;
		},
		_chessRng: () => 0.42,
		getValidMoves: (piece) => {
			if (piece.id !== 'opp-queen') return { moves: [], attacks: [] };
			return { moves: [{ row: piece.position.row - 1, col: piece.position.col }], attacks: [] };
		},
		getPieceAt: () => null,
		selectPiece,
		movePiece,
		setGameStatus,
	};

	return { slice, state, selectPiece, movePiece, setGameStatus };
};

interface ScheduledCall {
	readonly fn: () => void;
	readonly ms: number;
}

const makeFakeScheduler = () => {
	const calls: ScheduledCall[] = [];
	const schedule = (fn: () => void, ms: number): void => {
		calls.push({ fn, ms });
	};
	return { schedule, calls };
};

describe('createChessAITurnDriver', () => {
	it('plans a move and schedules the attempt at POST_SELECT_DELAY_MS', () => {
		const fake = makeFakeSlice({
			currentTurn: 'opponent',
			gameStatus: 'playing',
			pieces: [makeOpponentQueen()],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();

		expect(fake.selectPiece).toHaveBeenCalledTimes(1);
		expect(fake.selectPiece.mock.calls[0]?.[0]?.id).toBe('opp-queen');
		expect(sched.calls).toHaveLength(1);
		expect(sched.calls[0]?.ms).toBe(CHESS_AI_POST_SELECT_DELAY_MS);
		expect(fake.movePiece).not.toHaveBeenCalled();
	});

	it('runAITurn early-returns when currentTurn is not opponent', () => {
		const fake = makeFakeSlice({
			currentTurn: 'player',
			gameStatus: 'playing',
			pieces: [makeOpponentQueen()],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();

		expect(fake.selectPiece).not.toHaveBeenCalled();
		expect(sched.calls).toHaveLength(0);
	});

	it('runAITurn early-returns when game is not playing', () => {
		const fake = makeFakeSlice({
			currentTurn: 'opponent',
			gameStatus: 'player_wins',
			pieces: [makeOpponentQueen()],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();

		expect(fake.selectPiece).not.toHaveBeenCalled();
		expect(sched.calls).toHaveLength(0);
	});

	it('attemptMove early-returns when turn flipped between select and fire (the doble-movimiento defense)', () => {
		const fake = makeFakeSlice({
			currentTurn: 'opponent',
			gameStatus: 'playing',
			pieces: [makeOpponentQueen()],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();
		expect(sched.calls).toHaveLength(1);

		fake.state.currentTurn = 'player';
		const attemptCallback = sched.calls[0]?.fn;
		attemptCallback?.();

		expect(fake.movePiece).not.toHaveBeenCalled();
		expect(sched.calls).toHaveLength(1);
	});

	it('attemptMove re-schedules at retry delay when pendingAttackAnimation is set', () => {
		const fake = makeFakeSlice({
			currentTurn: 'opponent',
			gameStatus: 'playing',
			pieces: [makeOpponentQueen()],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();
		expect(sched.calls).toHaveLength(1);

		fake.state.pendingAttackAnimation = true;
		const attemptCallback = sched.calls[0]?.fn;
		attemptCallback?.();

		expect(fake.movePiece).not.toHaveBeenCalled();
		expect(sched.calls).toHaveLength(2);
		expect(sched.calls[1]?.ms).toBe(CHESS_AI_ANIMATION_RETRY_DELAY_MS);
	});

	it('attemptMove commits movePiece when slice still allows the planned target', () => {
		const fake = makeFakeSlice({
			currentTurn: 'opponent',
			gameStatus: 'playing',
			pieces: [makeOpponentQueen()],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();
		const attemptCallback = sched.calls[0]?.fn;
		attemptCallback?.();

		expect(fake.movePiece).toHaveBeenCalledTimes(1);
	});

	it('runAITurn awards player_wins when opponent has no legal moves', () => {
		const fake = makeFakeSlice({
			currentTurn: 'opponent',
			gameStatus: 'playing',
			pieces: [],
			pendingAttackAnimation: false,
		});
		const sched = makeFakeScheduler();

		const driver = createChessAITurnDriver({
			getSlice: () => fake.slice,
			rngFallback: () => 0,
			schedule: sched.schedule,
		});

		driver.runAITurn();

		expect(fake.setGameStatus).toHaveBeenCalledWith('player_wins');
		expect(sched.calls).toHaveLength(0);
	});
});

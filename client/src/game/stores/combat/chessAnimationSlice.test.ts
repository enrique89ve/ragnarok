import { beforeEach, describe, expect, it } from 'vitest';
import type { ActiveMine, ChessPiece } from '../../types/ChessTypes';
import { useUnifiedCombatStore } from '../unifiedCombatStore';
import { initialBoardState } from './types';

const makePiece = (input: Partial<ChessPiece> & Pick<ChessPiece, 'id' | 'type' | 'owner'>): ChessPiece => ({
	position: { row: 0, col: 0 },
	health: 100,
	maxHealth: 100,
	stamina: 10,
	heroClass: 'neutral',
	heroName: `${input.owner} ${input.type}`,
	deckCardIds: [],
	hasSpells: false,
	hasMoved: false,
	element: 'neutral',
	...input,
});

const makeMine = (overrides: Partial<ActiveMine> = {}): ActiveMine => ({
	id: 'mine-1',
	owner: 'player',
	kingId: 'k-id',
	centerPosition: { row: 3, col: 2 },
	affectedTiles: [{ row: 3, col: 2 }],
	staPenalty: 2,
	manaBoost: 1,
	placedOnTurn: 0,
	expiresOnTurn: 5,
	triggered: false,
	...overrides,
});

describe('chessAnimationSlice', () => {
	beforeEach(() => {
		useUnifiedCombatStore.getState().reset();
	});

	it('initial state: all animation flags are null', () => {
		const state = useUnifiedCombatStore.getState();
		expect(state.pendingAttackAnimation).toBeNull();
		expect(state.lastInstantKill).toBeNull();
		expect(state.lastMineTriggered).toBeNull();
	});

	it('startAttackAnimation populates pendingAttackAnimation with positions and a monotonic timestamp', () => {
		const attacker = makePiece({ id: 'a1', type: 'pawn', owner: 'player', position: { row: 1, col: 1 } });
		const defender = makePiece({ id: 'd1', type: 'queen', owner: 'opponent', position: { row: 2, col: 2 } });

		useUnifiedCombatStore.getState().startAttackAnimation(attacker, defender, true);
		const animation = useUnifiedCombatStore.getState().pendingAttackAnimation;

		expect(animation).not.toBeNull();
		expect(animation?.attacker.id).toBe('a1');
		expect(animation?.defender.id).toBe('d1');
		expect(animation?.attackerPosition).toEqual({ row: 1, col: 1 });
		expect(animation?.defenderPosition).toEqual({ row: 2, col: 2 });
		expect(animation?.isInstantKill).toBe(true);
		expect(typeof animation?.timestamp).toBe('number');
	});

	it('startAttackAnimation copies positions defensively (mutating the input piece does not leak)', () => {
		const attacker = makePiece({ id: 'a1', type: 'pawn', owner: 'player', position: { row: 1, col: 1 } });
		const defender = makePiece({ id: 'd1', type: 'queen', owner: 'opponent', position: { row: 2, col: 2 } });

		useUnifiedCombatStore.getState().startAttackAnimation(attacker, defender, false);
		attacker.position.row = 99;
		defender.position.row = 99;

		const animation = useUnifiedCombatStore.getState().pendingAttackAnimation;
		expect(animation?.attackerPosition).toEqual({ row: 1, col: 1 });
		expect(animation?.defenderPosition).toEqual({ row: 2, col: 2 });
	});

	it('resolves a non-instant chess attack before animation cleanup', () => {
		const attacker = makePiece({ id: 'a1', type: 'queen', owner: 'player', position: { row: 1, col: 1 } });
		const defender = makePiece({ id: 'd1', type: 'rook', owner: 'opponent', position: { row: 2, col: 2 } });

		useUnifiedCombatStore.setState({
			boardState: {
				...initialBoardState,
				pieces: [attacker, defender],
				currentTurn: 'player',
				gameStatus: 'playing',
			},
		});

		useUnifiedCombatStore.getState().startAttackAnimation(attacker, defender, false);
		const beforeCleanup = useUnifiedCombatStore.getState();

		expect(beforeCleanup.pendingAttackAnimation).not.toBeNull();
		expect(beforeCleanup.pendingCombat?.attacker.id).toBe('a1');
		expect(beforeCleanup.pendingCombat?.defender.id).toBe('d1');
		expect(beforeCleanup.boardState.gameStatus).toBe('combat');

		useUnifiedCombatStore.getState().completeAttackAnimation();
		const afterCleanup = useUnifiedCombatStore.getState();

		expect(afterCleanup.pendingAttackAnimation).toBeNull();
		expect(afterCleanup.pendingCombat?.attacker.id).toBe('a1');
		expect(afterCleanup.pendingCombat?.defender.id).toBe('d1');
		expect(afterCleanup.boardState.gameStatus).toBe('combat');
	});

	it('resolves an instant chess attack before animation cleanup', () => {
		const attacker = makePiece({ id: 'a1', type: 'pawn', owner: 'player', position: { row: 1, col: 1 } });
		const defender = makePiece({ id: 'd1', type: 'queen', owner: 'opponent', position: { row: 2, col: 2 } });

		useUnifiedCombatStore.setState({
			boardState: {
				...initialBoardState,
				pieces: [attacker, defender],
				currentTurn: 'player',
				gameStatus: 'playing',
			},
		});

		useUnifiedCombatStore.getState().startAttackAnimation(attacker, defender, true);
		const beforeCleanup = useUnifiedCombatStore.getState();

		expect(beforeCleanup.pendingAttackAnimation).not.toBeNull();
		expect(beforeCleanup.pendingCombat).toBeNull();
		expect(beforeCleanup.boardState.pieces.some(piece => piece.id === 'd1')).toBe(false);
		expect(beforeCleanup.boardState.pieces.find(piece => piece.id === 'a1')?.position).toEqual({ row: 2, col: 2 });

		useUnifiedCombatStore.getState().completeAttackAnimation();
		const afterCleanup = useUnifiedCombatStore.getState();

		expect(afterCleanup.pendingAttackAnimation).toBeNull();
		expect(afterCleanup.pendingCombat).toBeNull();
		expect(afterCleanup.boardState.pieces.some(piece => piece.id === 'd1')).toBe(false);
		expect(afterCleanup.boardState.pieces.find(piece => piece.id === 'a1')?.position).toEqual({ row: 2, col: 2 });
	});

	it('clearAttackAnimation resets pendingAttackAnimation to null', () => {
		const attacker = makePiece({ id: 'a1', type: 'pawn', owner: 'player' });
		const defender = makePiece({ id: 'd1', type: 'queen', owner: 'opponent' });
		useUnifiedCombatStore.getState().startAttackAnimation(attacker, defender, true);
		expect(useUnifiedCombatStore.getState().pendingAttackAnimation).not.toBeNull();

		useUnifiedCombatStore.getState().clearAttackAnimation();
		expect(useUnifiedCombatStore.getState().pendingAttackAnimation).toBeNull();
	});

	it('recordInstantKill stores the kill event with position, attacker type, and timestamp', () => {
		useUnifiedCombatStore.getState().recordInstantKill({ row: 4, col: 3 }, 'queen');
		const event = useUnifiedCombatStore.getState().lastInstantKill;

		expect(event).not.toBeNull();
		expect(event?.position).toEqual({ row: 4, col: 3 });
		expect(event?.attackerType).toBe('queen');
		expect(typeof event?.timestamp).toBe('number');
	});

	it('recordMineTriggered stores the mine and target piece id', () => {
		const mine = makeMine();
		useUnifiedCombatStore.getState().recordMineTriggered(mine, 'piece-42');
		const event = useUnifiedCombatStore.getState().lastMineTriggered;

		expect(event?.mine.id).toBe('mine-1');
		expect(event?.targetPieceId).toBe('piece-42');
	});

	it('clearMineTriggered resets lastMineTriggered to null', () => {
		useUnifiedCombatStore.getState().recordMineTriggered(makeMine(), 'p1');
		expect(useUnifiedCombatStore.getState().lastMineTriggered).not.toBeNull();

		useUnifiedCombatStore.getState().clearMineTriggered();
		expect(useUnifiedCombatStore.getState().lastMineTriggered).toBeNull();
	});

	it('clearChessAnimations atomically clears all three animation flags', () => {
		const attacker = makePiece({ id: 'a1', type: 'pawn', owner: 'player' });
		const defender = makePiece({ id: 'd1', type: 'queen', owner: 'opponent' });

		useUnifiedCombatStore.getState().startAttackAnimation(attacker, defender, true);
		useUnifiedCombatStore.getState().recordInstantKill({ row: 0, col: 0 }, 'pawn');
		useUnifiedCombatStore.getState().recordMineTriggered(makeMine(), 'p1');

		useUnifiedCombatStore.getState().clearChessAnimations();
		const after = useUnifiedCombatStore.getState();
		expect(after.pendingAttackAnimation).toBeNull();
		expect(after.lastInstantKill).toBeNull();
		expect(after.lastMineTriggered).toBeNull();
	});

	it('timestamps from successive recorders are monotonic (deterministic counter, not wall clock)', () => {
		const piece = makePiece({ id: 'a1', type: 'pawn', owner: 'player' });
		const defender = makePiece({ id: 'd1', type: 'queen', owner: 'opponent' });

		useUnifiedCombatStore.getState().startAttackAnimation(piece, defender, false);
		const t1 = useUnifiedCombatStore.getState().pendingAttackAnimation?.timestamp ?? -1;

		useUnifiedCombatStore.getState().recordInstantKill({ row: 0, col: 0 }, 'pawn');
		const t2 = useUnifiedCombatStore.getState().lastInstantKill?.timestamp ?? -1;

		expect(t2).toBeGreaterThan(t1);
	});
});

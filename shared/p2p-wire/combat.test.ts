import { describe, expect, it } from 'vitest';
import {
	COMPACT_COMBAT_OPCODE,
	COMPACT_POKER_ACTION_CODE,
	decodeBoardCell,
	decodeChessCombatInitiated,
	decodePokerAction,
	encodeBoardCell,
	encodeChessCombatInitiated,
	encodePokerAction,
	isPokerActionCompactConsistent,
	parseCompactP2PCombatAction,
} from './combat';
import {
	buildPokerTurnId,
	createPokerTurnClock,
	createReceivedPokerTurnClock,
	getPokerTurnRemainingSeconds,
	isTimedPokerDecisionPhase,
	isUniversalPokerTurnClock,
	UNIVERSAL_POKER_TURN_CLOCK_POLICY,
} from './pokerTurnClock';

describe('compact combat wire codec', () => {
	it('encodes board positions into a single JSON-safe cell integer', () => {
		expect(encodeBoardCell({ row: 0, col: 0 })).toBe(0);
		expect(encodeBoardCell({ row: 6, col: 4 })).toBe(34);
		expect(decodeBoardCell(17)).toEqual({ row: 3, col: 2 });
	});

	it('rejects invalid board cells and coordinates', () => {
		expect(() => encodeBoardCell({ row: 7, col: 0 })).toThrow(/row out of range/);
		expect(() => encodeBoardCell({ row: 0, col: 5 })).toThrow(/col out of range/);
		expect(() => decodeBoardCell(35)).toThrow(/cell out of range/);
	});

	it('round-trips chess combat initiation as a compact tuple', () => {
		const encoded = encodeChessCombatInitiated({
			from: { row: 1, col: 2 },
			to: { row: 2, col: 2 },
		});

		expect(encoded).toEqual([COMPACT_COMBAT_OPCODE.CHESS_COMBAT_INITIATED, 7, 12]);
		expect(decodeChessCombatInitiated(encoded)).toEqual({
			from: { row: 1, col: 2 },
			to: { row: 2, col: 2 },
		});
		expect(parseCompactP2PCombatAction(encoded)).toEqual(encoded);
	});

	it('round-trips poker action with numeric opcode', () => {
		const encoded = encodePokerAction({ action: 'counter', hpCommitment: 25 });

		expect(encoded).toEqual([
			COMPACT_COMBAT_OPCODE.POKER_ACTION,
			COMPACT_POKER_ACTION_CODE.counter,
			25,
		]);
		expect(decodePokerAction(encoded)).toEqual({ action: 'counter', hpCommitment: 25 });
		expect(parseCompactP2PCombatAction(encoded)).toEqual(encoded);
	});

	it('omits absent hp commitment as null on the wire', () => {
		const encoded = encodePokerAction({ action: 'brace' });

		expect(encoded).toEqual([
			COMPACT_COMBAT_OPCODE.POKER_ACTION,
			COMPACT_POKER_ACTION_CODE.brace,
			null,
		]);
		expect(decodePokerAction(encoded)).toEqual({ action: 'brace' });
	});

	it('rejects encoder inputs that would not pass the compact schema', () => {
		expect(() => encodePokerAction({ action: 'attack', hpCommitment: 501 })).toThrow(
			/invalid poker action payload/,
		);
	});

	it('rejects legacy poker fields that disagree with the compact tuple', () => {
		const encoded = encodePokerAction({ action: 'attack', hpCommitment: 20 });

		expect(isPokerActionCompactConsistent({
			action: 'attack',
			hpCommitment: 20,
			compact: encoded,
		})).toBe(true);
		expect(isPokerActionCompactConsistent({
			action: 'brace',
			hpCommitment: 20,
			compact: encoded,
		})).toBe(false);
		expect(isPokerActionCompactConsistent({
			action: 'attack',
			hpCommitment: 10,
			compact: encoded,
		})).toBe(false);
	});
});

describe('poker turn clock contract', () => {
	it('builds stable turn ids from combat phase and active actor', () => {
		expect(buildPokerTurnId({
			combatId: 'combat-a',
			phase: 'faith',
			activePlayerId: 'piece-1',
			actionsThisRound: 2,
		})).toBe('combat-a:faith:piece-1:2');
	});

	it('creates deadlines only for timed decision phases', () => {
		expect(isTimedPokerDecisionPhase('faith')).toBe(true);
		expect(isTimedPokerDecisionPhase('pre_flop')).toBe(true);
		expect(isTimedPokerDecisionPhase('spell_pet')).toBe(false);
		expect(createPokerTurnClock({
			combatId: 'combat-a',
			phase: 'pre_flop',
			activePlayerId: 'piece-1',
			actionsThisRound: 0,
			nowMs: 1_000,
			durationMs: 60_000,
		})).toEqual({
			turnId: 'combat-a:pre_flop:piece-1:0',
			startedAtMs: 1_000,
			deadlineAtMs: 61_000,
			durationMs: 60_000,
		});
		expect(createPokerTurnClock({
			combatId: 'combat-a',
			phase: 'mulligan',
			activePlayerId: 'piece-1',
			actionsThisRound: 0,
			nowMs: 1_000,
		})).toBeNull();
	});

	it('publishes one universal policy for all timed poker decisions', () => {
		expect(UNIVERSAL_POKER_TURN_CLOCK_POLICY).toMatchObject({
			durationMs: 60_000,
			manaPoolScope: 'poker_hand',
			drawScope: 'poker_hand',
			progressionScope: 'poker_hand',
			phaseChangesRefillMana: false,
			playerChangesRefillMana: false,
		});
		expect(isUniversalPokerTurnClock(UNIVERSAL_POKER_TURN_CLOCK_POLICY)).toBe(true);
	});

	it('derives remaining seconds from deadline, not mutable browser countdown', () => {
		const clock = createPokerTurnClock({
			combatId: 'combat-a',
			phase: 'faith',
			activePlayerId: 'piece-1',
			actionsThisRound: 0,
			nowMs: 1_000,
			durationMs: 60_000,
		});

		expect(clock).toEqual({
			turnId: 'combat-a:faith:piece-1:0',
			startedAtMs: 1_000,
			deadlineAtMs: 61_000,
			durationMs: 60_000,
		});
		expect(getPokerTurnRemainingSeconds({ nowMs: 1_001, deadlineAtMs: clock!.deadlineAtMs })).toBe(60);
		expect(getPokerTurnRemainingSeconds({ nowMs: 60_001, deadlineAtMs: clock!.deadlineAtMs })).toBe(1);
		expect(getPokerTurnRemainingSeconds({ nowMs: 61_000, deadlineAtMs: clock!.deadlineAtMs })).toBe(0);
	});

	it('recreates a received turn window from local receipt time when sender time is absent', () => {
		const clock = createReceivedPokerTurnClock({
			combatId: 'combat-a',
			phase: 'destiny',
			activePlayerId: 'piece-2',
			actionsThisRound: 1,
			receivedAtMs: 5_000,
			durationMs: 30_000,
		});

		expect(clock).toEqual({
			turnId: 'combat-a:destiny:piece-2:1',
			startedAtMs: 5_000,
			deadlineAtMs: 35_000,
			durationMs: 30_000,
		});
	});

	it('preserves sender elapsed time when receiving a turn window late', () => {
		const clock = createReceivedPokerTurnClock({
			combatId: 'combat-a',
			phase: 'destiny',
			activePlayerId: 'piece-2',
			actionsThisRound: 1,
			sentAtMs: 2_000,
			receivedAtMs: 5_000,
			durationMs: 30_000,
		});

		expect(clock).toEqual({
			turnId: 'combat-a:destiny:piece-2:1',
			startedAtMs: 2_000,
			deadlineAtMs: 32_000,
			durationMs: 30_000,
		});
	});

	it('uses relative remaining time over sender wall-clock time when provided', () => {
		const clock = createReceivedPokerTurnClock({
			combatId: 'combat-a',
			phase: 'destiny',
			activePlayerId: 'piece-2',
			actionsThisRound: 1,
			sentAtMs: 3_600_000,
			receivedAtMs: 100_000,
			remainingMs: 24_000,
			durationMs: 30_000,
		});

		expect(clock).toEqual({
			turnId: 'combat-a:destiny:piece-2:1',
			startedAtMs: 94_000,
			deadlineAtMs: 124_000,
			durationMs: 30_000,
		});
	});
});

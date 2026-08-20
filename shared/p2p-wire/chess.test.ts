/**
 * Chess wire schema tests.
 *
 * Gitignored per TD-8 policy: lives locally next to the schema, runs in
 * CI via vitest's default discovery, but does not flow to the repo until
 * a deliberate allowlist entry is added.
 */

import { describe, expect, it } from 'vitest';
import {
	ChessAttackCommandSchema,
	ChessBoardPositionSchema,
	ChessCommandEnvelopeSchema,
	ChessCommandSchema,
	ChessCombatInitiatedCommandSchema,
	ChessMoveCommandSchema,
	deriveCanonicalSide,
	isChessAttackInstantKill,
	tryParseChessCommandEnvelope,
} from './chess';

describe('ChessBoardPositionSchema', () => {
	it('accepts in-bounds positions', () => {
		expect(ChessBoardPositionSchema.parse({ row: 0, col: 0 })).toEqual({ row: 0, col: 0 });
		expect(ChessBoardPositionSchema.parse({ row: 6, col: 4 })).toEqual({ row: 6, col: 4 });
		expect(ChessBoardPositionSchema.parse({ row: 3, col: 2 })).toEqual({ row: 3, col: 2 });
	});

	it('rejects out-of-bounds row', () => {
		expect(ChessBoardPositionSchema.safeParse({ row: -1, col: 0 }).success).toBe(false);
		expect(ChessBoardPositionSchema.safeParse({ row: 7, col: 0 }).success).toBe(false);
	});

	it('rejects out-of-bounds col', () => {
		expect(ChessBoardPositionSchema.safeParse({ row: 0, col: -1 }).success).toBe(false);
		expect(ChessBoardPositionSchema.safeParse({ row: 0, col: 5 }).success).toBe(false);
	});

	it('rejects non-integer coordinates', () => {
		expect(ChessBoardPositionSchema.safeParse({ row: 1.5, col: 0 }).success).toBe(false);
		expect(ChessBoardPositionSchema.safeParse({ row: 0, col: 'a' }).success).toBe(false);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(ChessBoardPositionSchema.safeParse({ row: 0, col: 0, extra: 1 }).success).toBe(false);
	});
});

describe('ChessMoveCommandSchema', () => {
	const validMove = {
		type: 'chess_move' as const,
		pieceId: 'p-a1b2c3d4-e5f6-4708-8901-234567890abc',
		from: { row: 1, col: 0 },
		to: { row: 2, col: 0 },
	};

	it('accepts a valid pawn-forward move', () => {
		expect(ChessMoveCommandSchema.parse(validMove)).toEqual(validMove);
	});

	// NOTE: cross-field refines (`from !== to`) live on ChessCommandSchema,
	// not on the per-variant object schemas, because zod's discriminatedUnion
	// rejects ZodEffects (refined) members. See its describe block below.

	it('rejects empty pieceId', () => {
		expect(ChessMoveCommandSchema.safeParse({ ...validMove, pieceId: '' }).success).toBe(false);
	});

	it('rejects pieceId over 128 chars', () => {
		expect(ChessMoveCommandSchema.safeParse({ ...validMove, pieceId: 'x'.repeat(129) }).success).toBe(false);
	});

	it('rejects wrong type literal', () => {
		expect(ChessMoveCommandSchema.safeParse({ ...validMove, type: 'chess_concede' }).success).toBe(false);
	});

	it('rejects out-of-bounds destination', () => {
		expect(ChessMoveCommandSchema.safeParse({ ...validMove, to: { row: 99, col: 0 } }).success).toBe(false);
	});
});

describe('ChessAttackCommandSchema', () => {
	const validAttack = {
		type: 'chess_attack' as const,
		pieceId: 'p-attacker-uuid',
		from: { row: 1, col: 2 },
		to: { row: 2, col: 2 },
		defenderId: 'p-defender-uuid',
	};

	it('accepts a valid attack envelope', () => {
		expect(ChessAttackCommandSchema.parse(validAttack)).toEqual(validAttack);
	});

	it('rejects missing defenderId', () => {
		const bad = { ...validAttack } as Record<string, unknown>;
		delete bad.defenderId;
		expect(ChessAttackCommandSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects empty defenderId', () => {
		expect(ChessAttackCommandSchema.safeParse({ ...validAttack, defenderId: '' }).success).toBe(false);
	});

	it('rejects defenderId over 128 chars', () => {
		expect(ChessAttackCommandSchema.safeParse({ ...validAttack, defenderId: 'x'.repeat(129) }).success).toBe(false);
	});

	it('rejects wrong type literal', () => {
		expect(ChessAttackCommandSchema.safeParse({ ...validAttack, type: 'chess_move' }).success).toBe(false);
	});

	it('rejects out-of-bounds coordinates', () => {
		expect(ChessAttackCommandSchema.safeParse({ ...validAttack, to: { row: 99, col: 0 } }).success).toBe(false);
	});
});

describe('ChessCombatInitiatedCommandSchema', () => {
	const validCombat = {
		type: 'chess_combat_initiated' as const,
		pieceId: 'p-attacker-uuid',
		from: { row: 1, col: 2 },
		to: { row: 2, col: 2 },
		defenderId: 'p-defender-uuid',
	};

	it('accepts a valid non-instant combat initiation command', () => {
		expect(ChessCombatInitiatedCommandSchema.parse(validCombat)).toEqual(validCombat);
	});

	it('accepts compact tuple metadata for transcript compression', () => {
		const withCompact = {
			...validCombat,
			compact: [1, 7, 12] as const,
		};
		expect(ChessCombatInitiatedCommandSchema.parse(withCompact)).toEqual(withCompact);
	});

	it('rejects missing defenderId', () => {
		const bad = { ...validCombat } as Record<string, unknown>;
		delete bad.defenderId;
		expect(ChessCombatInitiatedCommandSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects wrong type literal', () => {
		expect(ChessCombatInitiatedCommandSchema.safeParse({ ...validCombat, type: 'chess_attack' }).success).toBe(false);
	});
});

describe('ChessCommandSchema (discriminated union)', () => {
	it('parses chess_move into the move variant', () => {
		const out = ChessCommandSchema.parse({
			type: 'chess_move',
			pieceId: 'p1',
			from: { row: 1, col: 0 },
			to: { row: 2, col: 0 },
		});
		expect(out.type).toBe('chess_move');
		// TypeScript narrowing — `defenderId` should not exist on the move branch
		expect((out as Record<string, unknown>).defenderId).toBeUndefined();
	});

	it('parses chess_attack into the attack variant with defenderId', () => {
		const out = ChessCommandSchema.parse({
			type: 'chess_attack',
			pieceId: 'p1',
			from: { row: 1, col: 0 },
			to: { row: 2, col: 0 },
			defenderId: 'p2',
		});
		expect(out.type).toBe('chess_attack');
		// Narrowing: defenderId is required on attack branch
		if (out.type === 'chess_attack') {
			expect(out.defenderId).toBe('p2');
		}
	});

	it('parses chess_combat_initiated into the combat variant with defenderId', () => {
		const out = ChessCommandSchema.parse({
			type: 'chess_combat_initiated',
			pieceId: 'p1',
			from: { row: 1, col: 0 },
			to: { row: 2, col: 0 },
			defenderId: 'p2',
		});
		expect(out.type).toBe('chess_combat_initiated');
		if (out.type === 'chess_combat_initiated') {
			expect(out.defenderId).toBe('p2');
		}
	});

	it('rejects unknown discriminator type', () => {
		expect(ChessCommandSchema.safeParse({
			type: 'chess_concede',
			pieceId: 'p1',
			from: { row: 0, col: 0 },
			to: { row: 1, col: 0 },
		}).success).toBe(false);
	});

	// NOTE: cross-field refines (`from !== to`, `pieceId !== defenderId`)
	// live on `ChessCommandEnvelopeSchema`, NOT on `ChessCommandSchema`.
	// Reason: wrapping a discriminated union in `superRefine` produces
	// `ZodEffects` and loses discriminator narrowing for downstream
	// consumers. Refinements move to the envelope (the wire boundary)
	// where every legitimate variant flows through. Coverage for those
	// rules lives in the `ChessCommandEnvelopeSchema` describe block.
});

describe('isChessAttackInstantKill', () => {
	it('returns true when attacker is a pawn (Valkyrie execute)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'pawn', defenderType: 'queen' })).toBe(true);
		expect(isChessAttackInstantKill({ attackerType: 'pawn', defenderType: 'rook' })).toBe(true);
		expect(isChessAttackInstantKill({ attackerType: 'pawn', defenderType: 'king' })).toBe(true);
	});

	it('returns false when attacker is a king (commander does not fight)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'king', defenderType: 'queen' })).toBe(false);
		expect(isChessAttackInstantKill({ attackerType: 'king', defenderType: 'pawn' })).toBe(false);
	});

	it('returns true when defender is a pawn (no deck)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'queen', defenderType: 'pawn' })).toBe(true);
		expect(isChessAttackInstantKill({ attackerType: 'rook', defenderType: 'pawn' })).toBe(true);
		expect(isChessAttackInstantKill({ attackerType: 'knight', defenderType: 'pawn' })).toBe(true);
	});

	it('returns true when defender is a king (touching the commander wins)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'queen', defenderType: 'king' })).toBe(true);
		expect(isChessAttackInstantKill({ attackerType: 'knight', defenderType: 'king' })).toBe(true);
	});

	it('returns false for queen vs rook (non-instant — needs poker resolution)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'queen', defenderType: 'rook' })).toBe(false);
	});

	it('returns false for knight vs bishop (non-instant)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'knight', defenderType: 'bishop' })).toBe(false);
	});

	it('returns false for queen vs queen (non-instant)', () => {
		expect(isChessAttackInstantKill({ attackerType: 'queen', defenderType: 'queen' })).toBe(false);
	});

	it('keeps pawn vs king as Valkyrie execute', () => {
		expect(isChessAttackInstantKill({ attackerType: 'pawn', defenderType: 'king' })).toBe(true);
	});
});

describe('ChessCommandEnvelopeSchema', () => {
	const validEnvelope = {
		type: 'chess_command' as const,
		matchId: 'm_0123456789abcdef',
		seq: 0,
		commandId: 'a1b2c3d4-e5f6-4708-8901-234567890abc',
		prevChessStateHash: 'deadbeef-chess',
		prevCardsStateHash: 'deadbeef-cards',
		command: {
			type: 'chess_move' as const,
			pieceId: 'p-x',
			from: { row: 1, col: 0 },
			to: { row: 2, col: 0 },
		},
	};

	it('accepts a valid envelope', () => {
		expect(ChessCommandEnvelopeSchema.parse(validEnvelope)).toEqual(validEnvelope);
	});

	it('accepts seq=0 and large seq values', () => {
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, seq: 0 }).success).toBe(true);
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, seq: 1_000_000 }).success).toBe(true);
	});

	it('rejects negative seq', () => {
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, seq: -1 }).success).toBe(false);
	});

	it('rejects non-uuid commandId', () => {
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, commandId: 'not-a-uuid' }).success).toBe(false);
	});

	it('rejects empty matchId', () => {
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, matchId: '' }).success).toBe(false);
	});

	it('accepts empty prev hashes (well-known race signal — receiver enforces non-empty)', () => {
		// TD-27c-chess: empty hash on the wire means the sender hit a
		// well-known race (state pre-init, eager-WASM load). Schema parses
		// these envelopes so they reach the receiver, which decides whether
		// to drop or apply based on its own local hash availability.
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, prevChessStateHash: '' }).success).toBe(true);
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, prevCardsStateHash: '' }).success).toBe(true);
	});

	it('rejects envelope missing prevChessStateHash', () => {
		const { prevChessStateHash: _drop, ...rest } = validEnvelope;
		void _drop;
		expect(ChessCommandEnvelopeSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects envelope missing prevCardsStateHash', () => {
		const { prevCardsStateHash: _drop, ...rest } = validEnvelope;
		void _drop;
		expect(ChessCommandEnvelopeSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects wrong envelope type literal', () => {
		expect(ChessCommandEnvelopeSchema.safeParse({ ...validEnvelope, type: 'game_command' }).success).toBe(false);
	});

	it('rejects malformed nested command', () => {
		const bad = { ...validEnvelope, command: { ...validEnvelope.command, from: { row: 99, col: 0 } } };
		expect(ChessCommandEnvelopeSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects when nested chess_move has from === to (refined at envelope level)', () => {
		const bad = {
			...validEnvelope,
			command: {
				...validEnvelope.command,
				to: { ...validEnvelope.command.from },
			},
		};
		expect(ChessCommandEnvelopeSchema.safeParse(bad).success).toBe(false);
	});

	it('accepts a valid chess_attack envelope', () => {
		const attackEnvelope = {
			...validEnvelope,
			command: {
				type: 'chess_attack' as const,
				pieceId: 'p-attacker',
				from: { row: 1, col: 0 },
				to: { row: 2, col: 0 },
				defenderId: 'p-defender',
			},
		};
		expect(ChessCommandEnvelopeSchema.parse(attackEnvelope)).toEqual(attackEnvelope);
	});

	it('rejects chess_attack envelope where pieceId === defenderId', () => {
		const bad = {
			...validEnvelope,
			command: {
				type: 'chess_attack' as const,
				pieceId: 'same-id',
				from: { row: 1, col: 0 },
				to: { row: 2, col: 0 },
				defenderId: 'same-id',
			},
		};
		expect(ChessCommandEnvelopeSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects chess_attack envelope where from === to', () => {
		const bad = {
			...validEnvelope,
			command: {
				type: 'chess_attack' as const,
				pieceId: 'p1',
				from: { row: 3, col: 2 },
				to: { row: 3, col: 2 },
				defenderId: 'p2',
			},
		};
		expect(ChessCommandEnvelopeSchema.safeParse(bad).success).toBe(false);
	});

	it('accepts a valid chess_combat_initiated envelope', () => {
		const combatEnvelope = {
			...validEnvelope,
			command: {
				type: 'chess_combat_initiated' as const,
				pieceId: 'p-attacker',
				from: { row: 1, col: 0 },
				to: { row: 2, col: 0 },
				defenderId: 'p-defender',
			},
		};
		expect(ChessCommandEnvelopeSchema.parse(combatEnvelope)).toEqual(combatEnvelope);
	});

	it('rejects chess_combat_initiated envelope where pieceId === defenderId', () => {
		const bad = {
			...validEnvelope,
			command: {
				type: 'chess_combat_initiated' as const,
				pieceId: 'same-id',
				from: { row: 1, col: 0 },
				to: { row: 2, col: 0 },
				defenderId: 'same-id',
			},
		};
		expect(ChessCommandEnvelopeSchema.safeParse(bad).success).toBe(false);
	});
});

describe('tryParseChessCommandEnvelope', () => {
	it('returns parsed envelope on valid input', () => {
		const valid = {
			type: 'chess_command',
			matchId: 'm_test',
			seq: 7,
			commandId: 'a1b2c3d4-e5f6-4708-8901-234567890abc',
			prevChessStateHash: 'h1',
			prevCardsStateHash: 'h2',
			command: {
				type: 'chess_move',
				pieceId: 'p-1',
				from: { row: 0, col: 0 },
				to: { row: 1, col: 0 },
			},
		};
		const out = tryParseChessCommandEnvelope(valid);
		expect(out).not.toBeNull();
		expect(out?.command.pieceId).toBe('p-1');
	});

	it('returns null on invalid input (does not throw)', () => {
		expect(tryParseChessCommandEnvelope({ garbage: true })).toBeNull();
		expect(tryParseChessCommandEnvelope(null)).toBeNull();
		expect(tryParseChessCommandEnvelope(undefined)).toBeNull();
		expect(tryParseChessCommandEnvelope('string-payload')).toBeNull();
	});
});

describe('deriveCanonicalSide', () => {
	it('returns opposite sides for opposite isHost values on the same seed', () => {
		const seeds = ['00abc', '01abc', '7fabc', '80abc', 'abcdef0123456789'];
		for (const seed of seeds) {
			const host = deriveCanonicalSide(seed, true);
			const guest = deriveCanonicalSide(seed, false);
			expect(host).not.toBe(guest);
		}
	});

	it('depends on seed parity (host gets player on even-parity first char)', () => {
		// '0' charCode 48 -> bit 0; isHost=true -> 0 ^ 1 = 1 -> 'opponent'
		// '1' charCode 49 -> bit 1; isHost=true -> 1 ^ 1 = 0 -> 'player'
		expect(deriveCanonicalSide('0xx', true)).toBe('opponent');
		expect(deriveCanonicalSide('1xx', true)).toBe('player');
		expect(deriveCanonicalSide('0xx', false)).toBe('player');
		expect(deriveCanonicalSide('1xx', false)).toBe('opponent');
	});

	it('is deterministic for the same inputs', () => {
		expect(deriveCanonicalSide('seed-a', true)).toBe(deriveCanonicalSide('seed-a', true));
		expect(deriveCanonicalSide('seed-b', false)).toBe(deriveCanonicalSide('seed-b', false));
	});

	it('throws on empty seed (programmer error, not adversarial input)', () => {
		expect(() => deriveCanonicalSide('', true)).toThrow();
	});
});

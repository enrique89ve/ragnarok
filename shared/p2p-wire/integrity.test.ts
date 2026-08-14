import { describe, expect, it } from 'vitest';

import {
	CHESS_INTEGRITY_PROTOCOL_VERSION,
	CHESS_INTEGRITY_SCOPE,
	Hash256Schema,
	computeChessIntegrityRoot,
	computeTransitionIntentHash,
	parseHash256,
	tryParseTransitionReceiptMessage,
} from './integrity';

const CHESS_HASH = Hash256Schema.parse('1'.repeat(64));
const CARDS_HASH = Hash256Schema.parse('2'.repeat(64));

describe('computeChessIntegrityRoot', () => {
	it('is deterministic for identical canonical inputs', () => {
		const input = {
			matchId: 'match-integrity-1',
			chessHash: CHESS_HASH,
			cardsHash: CARDS_HASH,
		};

		expect(computeChessIntegrityRoot(input)).toBe(computeChessIntegrityRoot(input));
	});

	it('changes when either covered domain or match changes', () => {
		const baseline = computeChessIntegrityRoot({
			matchId: 'match-integrity-1',
			chessHash: CHESS_HASH,
			cardsHash: CARDS_HASH,
		});

		expect(computeChessIntegrityRoot({
			matchId: 'match-integrity-2',
			chessHash: CHESS_HASH,
			cardsHash: CARDS_HASH,
		})).not.toBe(baseline);
		expect(computeChessIntegrityRoot({
			matchId: 'match-integrity-1',
			chessHash: Hash256Schema.parse('3'.repeat(64)),
			cardsHash: CARDS_HASH,
		})).not.toBe(baseline);
		expect(computeChessIntegrityRoot({
			matchId: 'match-integrity-1',
			chessHash: CHESS_HASH,
			cardsHash: Hash256Schema.parse('4'.repeat(64)),
		})).not.toBe(baseline);
	});
});

describe('transition ACK runtime boundary', () => {
	const root = computeChessIntegrityRoot({
		matchId: 'match-integrity-1',
		chessHash: CHESS_HASH,
		cardsHash: CARDS_HASH,
	});
	const commandId = '11111111-2222-4333-8444-555555555555';
	const intentHash = computeTransitionIntentHash({
		matchId: 'match-integrity-1',
		seq: 0,
		commandId,
		prevRoot: root,
		action: { type: 'chess_move', pieceId: 'piece-1', to: { row: 2, col: 0 } },
	});

	it('accepts an exact applied receipt', () => {
		expect(tryParseTransitionReceiptMessage({
			type: 'transition_receipt_v1',
			protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
			scope: CHESS_INTEGRITY_SCOPE,
			matchId: 'match-integrity-1',
			seq: 0,
			commandId,
			intentHash,
			status: 'applied',
			prevRoot: root,
			nextRoot: root,
		})).not.toBeNull();
	});

	it('rejects malformed hashes, versions and smuggled fields', () => {
		const valid = {
			type: 'transition_receipt_v1',
			protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
			scope: CHESS_INTEGRITY_SCOPE,
			matchId: 'match-integrity-1',
			seq: 0,
			commandId,
			intentHash,
			status: 'applied',
			prevRoot: root,
			nextRoot: root,
		};

		expect(tryParseTransitionReceiptMessage({ ...valid, nextRoot: 'short' })).toBeNull();
		expect(tryParseTransitionReceiptMessage({ ...valid, protocolVersion: 2 })).toBeNull();
		expect(tryParseTransitionReceiptMessage({ ...valid, injected: true })).toBeNull();
	});

	it('binds the intent hash to action and pre-state', () => {
		const changedAction = computeTransitionIntentHash({
			matchId: 'match-integrity-1',
			seq: 0,
			commandId,
			prevRoot: root,
			action: { type: 'chess_move', pieceId: 'piece-1', to: { row: 3, col: 0 } },
		});
		expect(changedAction).not.toBe(intentHash);
	});

	it('parses only lowercase 256-bit hexadecimal hashes', () => {
		expect(parseHash256('a'.repeat(64))).not.toBeNull();
		expect(parseHash256('A'.repeat(64))).toBeNull();
		expect(parseHash256('a'.repeat(63))).toBeNull();
	});
});

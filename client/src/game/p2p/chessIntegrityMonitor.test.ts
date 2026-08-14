import { describe, expect, it } from 'vitest';

import {
	CHESS_INTEGRITY_PROTOCOL_VERSION,
	CHESS_INTEGRITY_SCOPE,
	Hash256Schema,
	computeTransitionIntentHash,
	type TransitionReceiptMessage,
} from '@shared/p2p-wire/integrity';

import { createChessIntegrityMonitor } from './chessIntegrityMonitor';

const PREV_ROOT = Hash256Schema.parse('1'.repeat(64));
const NEXT_ROOT = Hash256Schema.parse('2'.repeat(64));
const COMMAND_ID = '11111111-2222-4333-8444-555555555555';
const INTENT_HASH = computeTransitionIntentHash({
	matchId: 'match-monitor-1',
	seq: 3,
	commandId: COMMAND_ID,
	prevRoot: PREV_ROOT,
	action: { type: 'chess_move', pieceId: 'piece-1' },
});

const EXPECTED = {
	matchId: 'match-monitor-1',
	seq: 3,
	commandId: COMMAND_ID,
	intentHash: INTENT_HASH,
	prevRoot: PREV_ROOT,
	nextRoot: NEXT_ROOT,
} as const;

function appliedReceipt(overrides: Partial<TransitionReceiptMessage> = {}): TransitionReceiptMessage {
	return {
		type: 'transition_receipt_v1',
		protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
		scope: CHESS_INTEGRITY_SCOPE,
		matchId: EXPECTED.matchId,
		seq: EXPECTED.seq,
		commandId: EXPECTED.commandId,
		intentHash: INTENT_HASH,
		status: 'applied',
		prevRoot: PREV_ROOT,
		nextRoot: NEXT_ROOT,
		...overrides,
	};
}

describe('createChessIntegrityMonitor', () => {
	it('confirms a matching post-commit ACK and clears the pending transition', () => {
		const monitor = createChessIntegrityMonitor();
		expect(monitor.register(EXPECTED)).toEqual({ status: 'registered' });
		expect(monitor.canStartTransition()).toBe(false);

		expect(monitor.confirm(appliedReceipt())).toEqual({
			status: 'confirmed',
			commandId: EXPECTED.commandId,
		});
		expect(monitor.canStartTransition()).toBe(true);
	});

	it('quarantines on a different post-state root', () => {
		const monitor = createChessIntegrityMonitor();
		monitor.register(EXPECTED);

		const result = monitor.confirm(appliedReceipt({
			nextRoot: Hash256Schema.parse('3'.repeat(64)),
		}));

		expect(result.status).toBe('quarantined');
		expect(monitor.getState().status).toBe('quarantined');
		expect(monitor.canStartTransition()).toBe(false);
	});

	it('quarantines when the peer explicitly rejects the transition', () => {
		const monitor = createChessIntegrityMonitor();
		monitor.register(EXPECTED);
		const rejected: TransitionReceiptMessage = {
			type: 'transition_receipt_v1',
			protocolVersion: CHESS_INTEGRITY_PROTOCOL_VERSION,
			scope: CHESS_INTEGRITY_SCOPE,
			matchId: EXPECTED.matchId,
			seq: EXPECTED.seq,
			commandId: EXPECTED.commandId,
			intentHash: INTENT_HASH,
			status: 'rejected',
			currentRoot: PREV_ROOT,
			reason: 'illegal-target',
		};

		expect(monitor.confirm(rejected).status).toBe('quarantined');
	});

	it('ignores stale ACKs without clearing the current expectation', () => {
		const monitor = createChessIntegrityMonitor();
		monitor.register(EXPECTED);

		expect(monitor.confirm(appliedReceipt({ commandId: '22222222-3333-4444-8555-666666666666' }))).toEqual({
			status: 'ignored',
			reason: 'unrelated_ack',
		});
		expect(monitor.canStartTransition()).toBe(false);
	});

	it('fails closed while an ACK is pending and reopens only on reset', () => {
		const monitor = createChessIntegrityMonitor();
		monitor.register(EXPECTED);
		expect(monitor.register({ ...EXPECTED, commandId: '22222222-3333-4444-8555-666666666666' })).toEqual({
			status: 'blocked',
			reason: 'pending_ack',
		});

		monitor.reset();
		expect(monitor.canStartTransition()).toBe(true);
	});
});

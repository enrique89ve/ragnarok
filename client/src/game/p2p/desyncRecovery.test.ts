import { describe, expect, it } from 'vitest';

import {
	CLEAN_DESYNC_RECOVERY,
	CLEAN_DESYNC_RECOVERY_LEDGER,
	classifyP2PIntegrityFailure,
	getDomainRevision,
	observeDesync,
	observeDomainDesync,
	observeMatchingDomainInLedger,
	observeMatchingDomainRoot,
	observeMatchingRoot,
} from './desyncRecovery';

describe('P2P desync recovery policy', () => {
	it('reads the revision cursor for the requested domain', () => {
		const clock = { canonicalOrder: 8, cardsRevision: 3, chessRevision: 2, pokerRevision: 4 };

		expect(getDomainRevision(clock, 'cards')).toBe(3);
		expect(getDomainRevision(clock, 'chess')).toBe(2);
		expect(getDomainRevision(clock, 'poker')).toBe(4);
		expect(getDomainRevision(undefined, 'cards')).toBe(0);
	});

	it('requests one transcript replay before hard-pausing a repeated mismatch', () => {
		const first = observeDesync(CLEAN_DESYNC_RECOVERY);
		const second = observeDesync(first.state);

		expect(first.action).toBe('request_replay');
		expect(second.action).toBe('hard_pause');
		expect(observeMatchingRoot()).toEqual(CLEAN_DESYNC_RECOVERY);
	});

	it('does not classify authenticated protocol faults as soft mismatches', () => {
		expect(classifyP2PIntegrityFailure('root_mismatch')).toBe('recoverable_mismatch');
		expect(classifyP2PIntegrityFailure('invalid_signature')).toBe('protocol_fault');
		expect(classifyP2PIntegrityFailure('sequence_gap')).toBe('protocol_fault');
	});

	it('keeps recovery evidence scoped to the domain that mismatched', () => {
		const first = observeDesync(CLEAN_DESYNC_RECOVERY);
		const pending = { state: first.state, domain: 'cards' as const };

		// A matching Chess root must not erase a pending Cards replay request.
		expect(observeMatchingDomainRoot(pending, 'chess')).toEqual(pending);
		expect(observeMatchingDomainRoot(pending, 'cards')).toEqual({
			state: CLEAN_DESYNC_RECOVERY,
			domain: null,
		});
		expect(observeMatchingRoot()).toEqual(CLEAN_DESYNC_RECOVERY);
		expect(observeDesync(first.state).action).toBe('hard_pause');
	});

	it('keeps recovery attempts independent across domains', () => {
		const afterCards = observeDomainDesync(CLEAN_DESYNC_RECOVERY_LEDGER, 'cards');
		const afterPoker = observeDomainDesync(afterCards.state, 'poker');

		expect(afterCards.action).toBe('request_replay');
		expect(afterPoker.action).toBe('request_replay');
		expect(afterPoker.state.cards.status).toBe('replay_requested');
		expect(afterPoker.state.poker.status).toBe('replay_requested');
		expect(observeMatchingDomainInLedger(afterPoker.state, 'cards').poker.status).toBe('replay_requested');
	});
});

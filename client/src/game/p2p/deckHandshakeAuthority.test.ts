import { describe, expect, it } from 'vitest';
import {
	bindDeckClaimsToAnnounce,
	canInitDeckHandshake,
	checkDeckVerificationIdentity,
	createDeckHandshakeSnapshot,
	isCurrentDeckVerificationGeneration,
} from './deckHandshakeAuthority';

const deck = {
	heroClass: 'mage',
	cardIds: [2, 1, 2],
	nftLevels: [],
} as const;

const claims = [
	{ authority: 'starter-entitlement' as const, cardId: 2 },
	{ authority: 'starter-entitlement' as const, cardId: 1 },
	{ authority: 'starter-entitlement' as const, cardId: 2 },
];

describe('deck handshake authority', () => {
	it('binds claims to the announced card multiset and keeps stable hashes', () => {
		const first = bindDeckClaimsToAnnounce(deck, claims);
		const second = bindDeckClaimsToAnnounce(deck, claims);

		expect(first.status).toBe('bound');
		expect(second).toEqual(first);
		if (first.status === 'bound') {
			expect(first.snapshot.claimsHash).toBeTruthy();
			expect(first.snapshot.deckHash).toBeTruthy();
		}
	});

	it('rejects claims that do not cover the announced deck', () => {
		const result = bindDeckClaimsToAnnounce(deck, claims.slice(0, 2));

		expect(result).toEqual({
			status: 'rejected',
			code: 'deck_claims_card_mismatch',
			detail: 'deck announced 3 card(s), but claims cover 2',
		});
	});

	it('does not hide a changed claim set behind the same deck snapshot', () => {
		const original = createDeckHandshakeSnapshot(deck, claims);
		const changed = createDeckHandshakeSnapshot(deck, [
			...claims.slice(0, 2),
			{ authority: 'starter-entitlement', cardId: 1 },
		]);

		expect(changed.claimsHash).not.toBe(original.claimsHash);
	});

	it('blocks shared-network init until remote verification is approved', () => {
		const snapshot = createDeckHandshakeSnapshot(deck, claims);
		const base = {
			matchSeed: 'seed-1',
			myCanonicalSide: 'player' as const,
			localSnapshot: snapshot,
			remoteSnapshot: snapshot,
			sharedNetwork: true,
		};

		expect(canInitDeckHandshake({ ...base, remoteVerification: 'pending' })).toBe(false);
		expect(canInitDeckHandshake({ ...base, remoteVerification: 'checking' })).toBe(false);
		expect(canInitDeckHandshake({ ...base, remoteVerification: 'approved' })).toBe(true);
		expect(canInitDeckHandshake({ ...base, remoteVerification: 'rejected' })).toBe(false);
		expect(canInitDeckHandshake({ ...base, sharedNetwork: false, remoteVerification: 'pending' })).toBe(true);
	});

	it('requires the deck claims account to match the announced Hive identity', () => {
		expect(checkDeckVerificationIdentity('@Alice', 'alice', true)).toBe('approved');
		expect(checkDeckVerificationIdentity('bob', 'alice', true)).toBe('rejected');
		expect(checkDeckVerificationIdentity('alice', null, false)).toBe('pending');
		expect(checkDeckVerificationIdentity('alice', null, true)).toBe('rejected');
	});

	it('invalidates async verification from an older session generation', () => {
		expect(isCurrentDeckVerificationGeneration(4, 4)).toBe(true);
		expect(isCurrentDeckVerificationGeneration(4, 5)).toBe(false);
	});
});

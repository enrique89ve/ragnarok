import { afterEach, describe, expect, it } from 'vitest';
import {
	buildServerSignedChallenge,
	resetP2PChallengeSigningSecretForTests,
	verifyServerSignedChallengeForTarget,
} from './p2pChallengeSigner';

describe('p2pChallengeSigner', () => {
	const originalSecret = process.env.P2P_CHALLENGE_SIGNING_SECRET;

	afterEach(() => {
		if (originalSecret === undefined) {
			delete process.env.P2P_CHALLENGE_SIGNING_SECRET;
		} else {
			process.env.P2P_CHALLENGE_SIGNING_SECRET = originalSecret;
		}
		resetP2PChallengeSigningSecretForTests();
	});

	it('builds a server-verifiable challenge reservation envelope', () => {
		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'x'.repeat(32);
		const challenge = buildServerSignedChallenge({
			from: 'alice',
			to: 'bob',
			peerId: 'peer-1',
			timestamp: 1_000,
			expiresAt: 91_000,
		});

		expect(challenge.serverSig).toMatch(/^[a-f0-9]{64}$/);
		expect(verifyServerSignedChallengeForTarget(challenge, 'bob')).toBe(true);
		expect(verifyServerSignedChallengeForTarget(challenge, 'mallory')).toBe(false);
	});

	it('binds the signature to the peer id and expiry', () => {
		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'x'.repeat(32);
		const challenge = buildServerSignedChallenge({
			from: 'alice',
			to: 'bob',
			peerId: 'peer-1',
			timestamp: 1_000,
			expiresAt: 91_000,
		});

		expect(verifyServerSignedChallengeForTarget({ ...challenge, peerId: 'peer-2' }, 'bob')).toBe(false);
		expect(verifyServerSignedChallengeForTarget({ ...challenge, expiresAt: 92_000 }, 'bob')).toBe(false);
	});
});

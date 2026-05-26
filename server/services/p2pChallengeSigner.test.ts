import { afterEach, describe, expect, it } from 'vitest';
import {
	buildServerSignedChallenge,
	getP2PChallengeSigningSecretStatus,
	resetP2PChallengeSigningSecretForTests,
	verifyServerSignedChallengeForTarget,
} from './p2pChallengeSigner';

describe('p2pChallengeSigner', () => {
	const originalSecret = process.env.P2P_CHALLENGE_SIGNING_SECRET;
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		if (originalSecret === undefined) {
			delete process.env.P2P_CHALLENGE_SIGNING_SECRET;
		} else {
			process.env.P2P_CHALLENGE_SIGNING_SECRET = originalSecret;
		}
		if (originalNodeEnv === undefined) {
			delete process.env.NODE_ENV;
		} else {
			process.env.NODE_ENV = originalNodeEnv;
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

	it('reports whether Dokploy provided a stable shared signing secret', () => {
		process.env.NODE_ENV = 'development';
		delete process.env.P2P_CHALLENGE_SIGNING_SECRET;
		expect(getP2PChallengeSigningSecretStatus()).toEqual({
			configured: false,
			validLength: false,
			source: 'process-fallback',
			minimumLength: 32,
			required: false,
			ready: true,
			error: null,
		});

		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'x'.repeat(32);
		expect(getP2PChallengeSigningSecretStatus()).toEqual({
			configured: true,
			validLength: true,
			source: 'env',
			minimumLength: 32,
			required: false,
			ready: true,
			error: null,
		});
	});

	it('fails closed in production when the shared signing secret is missing', () => {
		process.env.NODE_ENV = 'production';
		delete process.env.P2P_CHALLENGE_SIGNING_SECRET;

		expect(getP2PChallengeSigningSecretStatus()).toMatchObject({
			configured: false,
			validLength: false,
			source: 'process-fallback',
			required: true,
			ready: false,
		});
		expect(() => buildServerSignedChallenge({
			from: 'alice',
			to: 'bob',
			peerId: 'peer-1',
			timestamp: 1_000,
			expiresAt: 91_000,
		})).toThrow('P2P challenge signing unavailable');
	});
});

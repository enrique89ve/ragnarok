import { describe, expect, it } from 'vitest';
import {
	CHALLENGE_SIGNATURE_ALGORITHM,
	availabilityFromConnectionState,
	isP2PConnectionStateBusy,
	parsePresenceHeartbeatBody,
	readChallengeSendResponse,
	readP2PMatchTicket,
	readPresenceHeartbeatResponse,
} from './p2pAvailability';

describe('p2pAvailability', () => {
	it('marks active and reconnecting P2P states as busy', () => {
		expect(isP2PConnectionStateBusy('connecting')).toBe(true);
		expect(isP2PConnectionStateBusy('waiting')).toBe(true);
		expect(isP2PConnectionStateBusy('connected')).toBe(true);
		expect(isP2PConnectionStateBusy('reconnecting')).toBe(true);
		expect(isP2PConnectionStateBusy('grace_period')).toBe(true);
		expect(isP2PConnectionStateBusy('disconnected')).toBe(false);
		expect(isP2PConnectionStateBusy('error')).toBe(false);
	});

	it('derives conservative availability from connection and matchmaking state', () => {
		expect(availabilityFromConnectionState('disconnected', 'idle')).toBe('available');
		expect(availabilityFromConnectionState('connected', 'idle')).toBe('busy');
		expect(availabilityFromConnectionState('grace_period', 'idle')).toBe('reconnecting');
		expect(availabilityFromConnectionState('reconnecting', 'idle')).toBe('reconnecting');
		expect(availabilityFromConnectionState('disconnected', 'queued')).toBe('matchmaking');
		expect(availabilityFromConnectionState('disconnected', 'authorizing')).toBe('matchmaking');
		expect(availabilityFromConnectionState('disconnected', 'ready')).toBe('in_match');
		expect(availabilityFromConnectionState('disconnected', 'connecting')).toBe('in_match');
	});

	it('strictly parses compact heartbeat request bodies', () => {
		expect(parsePresenceHeartbeatBody({
			username: 'Enrique89.Test',
			friends: ['Alice.One', '@bob.two', 'alice.one'],
			peerId: 'peer-1',
		})).toEqual({
			ok: true,
			value: {
				username: 'enrique89.test',
				friends: ['alice.one', 'bob.two'],
				peerId: 'peer-1',
			},
		});
	});

	it('rejects unknown fields and unsafe peer ids at the request boundary', () => {
		expect(parsePresenceHeartbeatBody({
			username: 'enrique89',
			friends: [],
			html: '<script>alert(1)</script>',
		}).ok).toBe(false);
		expect(parsePresenceHeartbeatBody({
			username: 'enrique89',
			friends: [],
			peerId: '<script>',
		}).ok).toBe(false);
	});

	it('keeps only strict presence and server-signed challenge payloads', () => {
		const response = readPresenceHeartbeatResponse({
			statuses: {
				Alice: { online: true, availability: 'available', canReceiveChallenge: true, lastSeen: 100 },
				bad: { online: true, extra: 'field' },
			},
			challenges: [
				{
					from: 'Bob',
					to: 'Alice',
					peerId: 'peer-2',
					timestamp: 1000,
					expiresAt: 2000,
					nonce: 'nonce_1234567890ab',
					sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
					serverSig: 'a'.repeat(64),
				},
				{
					from: 'Mallory',
					to: 'Alice',
					peerId: 'peer-3',
					timestamp: 1000,
					expiresAt: 2000,
					nonce: 'nonce_1234567890ab',
					sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
					serverSig: 'not-hex',
				},
			],
		});

		expect(response.statuses).toEqual({
			alice: { online: true, availability: 'available', canReceiveChallenge: true, lastSeen: 100 },
		});
		expect(response.challenges).toEqual([
			{
				from: 'bob',
				to: 'alice',
				peerId: 'peer-2',
				timestamp: 1000,
				expiresAt: 2000,
				nonce: 'nonce_1234567890ab',
				sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
				serverSig: 'a'.repeat(64),
			},
		]);
	});

	it('strictly parses challenge send responses and retry metadata', () => {
		expect(readChallengeSendResponse({
			ok: true,
			challenge: {
				from: 'Bob',
				to: 'Alice',
				peerId: 'peer-2',
				timestamp: 1000,
				expiresAt: 2000,
				nonce: 'nonce_1234567890ab',
				sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
				serverSig: 'a'.repeat(64),
			},
		})).toEqual({
			ok: true,
			challenge: {
				from: 'bob',
				to: 'alice',
				peerId: 'peer-2',
				timestamp: 1000,
				expiresAt: 2000,
				nonce: 'nonce_1234567890ab',
				sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
				serverSig: 'a'.repeat(64),
			},
		});

		expect(readChallengeSendResponse({
			ok: false,
			reason: 'rate_limited',
			retryAfterMs: 180_000,
		})).toEqual({
			ok: false,
			reason: 'rate_limited',
			retryAfterMs: 180_000,
		});

		expect(readChallengeSendResponse({
			ok: false,
			reason: 'server_unconfigured',
		})).toEqual({
			ok: false,
			reason: 'server_unconfigured',
		});

		expect(readChallengeSendResponse({
			ok: false,
			reason: 'rate_limited',
			html: '<script>',
		})).toEqual({ ok: false, reason: 'invalid_input' });
	});

	it('parses P2P match tickets and allows them only inside challenge payloads', () => {
		const matchTicket = {
			token: `${'a'.repeat(24)}.${'b'.repeat(64)}`,
			roomId: 'room-1',
			peerId: 'peer-2',
			expiresAt: 2_000,
		};

		expect(readP2PMatchTicket(matchTicket)).toEqual(matchTicket);
		expect(readChallengeSendResponse({
			ok: true,
			challenge: {
				from: 'Bob',
				to: 'Alice',
				peerId: 'peer-2',
				timestamp: 1000,
				expiresAt: 2000,
				nonce: 'nonce_1234567890ab',
				sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
				serverSig: 'a'.repeat(64),
				matchTicket,
			},
		})).toEqual({
			ok: true,
			challenge: {
				from: 'bob',
				to: 'alice',
				peerId: 'peer-2',
				timestamp: 1000,
				expiresAt: 2000,
				nonce: 'nonce_1234567890ab',
				sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
				serverSig: 'a'.repeat(64),
				matchTicket,
			},
		});
		expect(readChallengeSendResponse({
			ok: true,
			matchTicket,
		})).toEqual({ ok: false, reason: 'invalid_input' });
	});
});

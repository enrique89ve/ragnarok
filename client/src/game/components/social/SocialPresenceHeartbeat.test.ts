import { describe, expect, it } from 'vitest';
import {
	buildPresenceHeartbeatBody,
	canSendPresenceHeartbeat,
	markPresenceHeartbeatSent,
	readFriendPresenceChallenges,
	getPresenceEligibleFriends,
	readFriendPresenceStatuses,
} from './SocialPresenceHeartbeat';
import { CHALLENGE_SIGNATURE_ALGORITHM } from '@shared/p2pAvailability';

describe('SocialPresenceHeartbeat', () => {
	it('registers the signed-in player even with no contacts', () => {
		expect(buildPresenceHeartbeatBody({
			username: 'Enrique89',
			friends: [],
			peerId: null,
		})).toEqual({
			username: 'enrique89',
			friends: [],
		});
	});

	it('includes contacts and the active peer id when available', () => {
		expect(buildPresenceHeartbeatBody({
			username: 'Enrique89.Test',
			friends: [{ hiveUsername: 'Enrique89' }],
			peerId: 'peer-1',
			availability: 'available',
		})).toEqual({
			username: 'enrique89.test',
			friends: ['enrique89'],
			peerId: 'peer-1',
			availability: 'available',
		});
	});

	it('does not ask presence for local-only contacts', () => {
		expect(getPresenceEligibleFriends([
			{ hiveUsername: 'local-only', relationStatus: 'local' },
			{ hiveUsername: 'accepted', relationStatus: 'accepted' },
			{ hiveUsername: 'legacy-local' },
		])).toEqual([
			{ hiveUsername: 'accepted' },
		]);
	});

	it('keeps only valid presence records from the server boundary', () => {
		expect(readFriendPresenceStatuses({
			statuses: {
				Enrique89: { online: true, lastSeen: 100, availability: 'available', canReceiveChallenge: true },
				broken: { online: 'yes' },
				extra: { online: true, injected: '<script>' },
			},
		})).toEqual({
			enrique89: { online: true, lastSeen: 100, availability: 'available', canReceiveChallenge: true },
		});
	});

	it('keeps only valid incoming challenge envelopes from heartbeat responses', () => {
		expect(readFriendPresenceChallenges({
			challenges: [
				{
					from: 'Bob',
					peerId: 'peer-room-1',
					timestamp: 1000,
					expiresAt: 2000,
					nonce: 'nonce_1234567890ab',
					sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
					serverSig: 'a'.repeat(64),
				},
				{
					from: 'Mallory',
					peerId: '<script>',
					timestamp: 1000,
					expiresAt: 2000,
					nonce: 'nonce_1234567890ab',
					sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
					serverSig: 'a'.repeat(64),
				},
			],
		})).toEqual([
			{
				from: 'bob',
				peerId: 'peer-room-1',
				timestamp: 1000,
				expiresAt: 2000,
				nonce: 'nonce_1234567890ab',
				sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
				serverSig: 'a'.repeat(64),
			},
		]);
	});

	it('locally spaces heartbeat sends so remounts do not trip the server limit', () => {
		expect(canSendPresenceHeartbeat('HiveCreatorsDay', 1_000)).toBe(true);
		markPresenceHeartbeatSent('HiveCreatorsDay', 1_000);
		expect(canSendPresenceHeartbeat('HiveCreatorsDay', 10_000)).toBe(false);
		expect(canSendPresenceHeartbeat('HiveCreatorsDay', 121_000)).toBe(true);
	});
});

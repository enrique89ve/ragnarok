import { describe, expect, it } from 'vitest';
import {
	buildFriendChallengeRequest,
	challengeRejectReasonLabel,
	formatRetryAfterMs,
	getFriendChallengeButtonState,
} from './FriendsPanel';

describe('FriendsPanel challenge helpers', () => {
	const now = 10_000;

	it('builds compact challenge requests without query-param routing state', () => {
		expect(buildFriendChallengeRequest({
			from: '@Alice.One',
			to: 'Bob.Two',
			peerId: 'peer-1',
		})).toEqual({
			from: 'alice.one',
			to: 'bob.two',
			peerId: 'peer-1',
		});
	});

	it('allows challenge only for accepted online available friends', () => {
		expect(getFriendChallengeButtonState({
			friend: { hiveUsername: 'bob', relationStatus: 'accepted' },
			presence: { online: true, availability: 'available', canReceiveChallenge: true },
			hiveUsername: 'alice',
			now,
		})).toEqual({
			disabled: false,
			label: 'Challenge',
			detail: 'Available',
		});
	});

	it('disables challenges with enum-derived busy reasons', () => {
		expect(getFriendChallengeButtonState({
			friend: { hiveUsername: 'bob', relationStatus: 'accepted' },
			presence: { online: true, availability: 'reconnecting', canReceiveChallenge: false },
			hiveUsername: 'alice',
			now,
		})).toEqual({
			disabled: true,
			label: 'Challenge',
			detail: 'Reconnecting',
		});
	});

	it('disables direct challenges when the local P2P gate is blocked', () => {
		expect(getFriendChallengeButtonState({
			friend: { hiveUsername: 'bob', relationStatus: 'accepted' },
			presence: { online: true, availability: 'available', canReceiveChallenge: true },
			hiveUsername: 'alice',
			p2pBlockedDetail: 'Claim starter',
			now,
		})).toEqual({
			disabled: true,
			label: 'Challenge',
			detail: 'Claim starter',
		});
	});

	it('disables repeated sends during challenge cooldown and outgoing pending state', () => {
		expect(getFriendChallengeButtonState({
			friend: { hiveUsername: 'bob', relationStatus: 'accepted' },
			presence: { online: true, availability: 'available', canReceiveChallenge: true },
			hiveUsername: 'alice',
			cooldownUntil: now + 180_000,
			now,
		})).toEqual({
			disabled: true,
			label: 'Cooldown',
			detail: 'Wait 3m',
		});

		expect(getFriendChallengeButtonState({
			friend: { hiveUsername: 'bob', relationStatus: 'accepted' },
			presence: { online: true, availability: 'available', canReceiveChallenge: true },
			hiveUsername: 'alice',
			outgoingChallenge: {
				to: 'bob',
				peerId: 'peer-1',
				sentAt: now,
				expiresAt: now + 90_000,
			},
			now,
		})).toEqual({
			disabled: true,
			label: 'Pending',
			detail: 'Challenge sent',
		});
	});

	it('formats rate-limit copy from retry metadata', () => {
		expect(formatRetryAfterMs(61_000)).toBe('2m');
		expect(challengeRejectReasonLabel('rate_limited', 180_000)).toBe('Wait 3m before challenging again.');
		expect(challengeRejectReasonLabel('starter_claim_required')).toBe('Claim starter before challenging.');
	});
});

import { describe, expect, it } from 'vitest';
import {
	buildPresenceHeartbeatBody,
	getPresenceEligibleFriends,
	readFriendPresenceStatuses,
} from './SocialPresenceHeartbeat';

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
		})).toEqual({
			username: 'enrique89.test',
			friends: ['enrique89'],
			peerId: 'peer-1',
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
				Enrique89: { online: true, lastSeen: 100 },
				broken: { online: 'yes' },
			},
		})).toEqual({
			enrique89: { online: true, lastSeen: 100 },
		});
	});
});

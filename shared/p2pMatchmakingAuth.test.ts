import { describe, expect, it } from 'vitest';
import {
	buildP2PQueueAuthMessage,
	p2pQueueStarterClaimState,
} from './p2pMatchmakingAuth';

describe('p2pMatchmakingAuth', () => {
	it('builds the exact signed message for queue ownership', () => {
		expect(buildP2PQueueAuthMessage({
			username: ' Alice ',
			peerId: 'peer-123',
			starterClaimed: true,
			timestamp: 1_800_000_000_000,
		})).toBe('ragnarok-queue:alice:peer-123:starter-claimed:1800000000000');
	});

	it('makes unclaimed starter state part of the signed payload', () => {
		expect(p2pQueueStarterClaimState(false)).toBe('starter-unclaimed');
		expect(buildP2PQueueAuthMessage({
			username: '@Bob',
			peerId: 'peer-456',
			starterClaimed: false,
			timestamp: 1_800_000_000_001,
		})).toBe('ragnarok-queue:bob:peer-456:starter-unclaimed:1800000000001');
	});
});

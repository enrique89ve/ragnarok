import { describe, expect, it } from 'vitest';
import { PROTOCOL_PHASE_POLICIES } from './protocolPhase';
import { buildStarterClaimAuthMessage, resolveStarterClaimAuthMode } from './starterClaimAuth';

describe('starterClaimAuth', () => {
	it('builds the exact shared-network starter claim message', () => {
		expect(buildStarterClaimAuthMessage({
			username: ' @Alice ',
			timestamp: 1_800_000_000_000,
		})).toBe('ragnarok-starter-claim:alice:1800000000000');
	});

	it('derives starter receipt auth from the canonical walletInvocation capability', () => {
		expect(resolveStarterClaimAuthMode(PROTOCOL_PHASE_POLICIES['local-gameplay-v1']))
			.toBe('unsigned-local');
		expect(resolveStarterClaimAuthMode(PROTOCOL_PHASE_POLICIES['hive-testnet-v1']))
			.toBe('hive-body-auth');
		expect(resolveStarterClaimAuthMode(PROTOCOL_PHASE_POLICIES['mainnet-v1']))
			.toBe('hive-body-auth');
	});
});

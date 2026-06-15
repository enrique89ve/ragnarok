import { describe, expect, it } from 'vitest';
import { buildStarterClaimAuthMessage } from './starterClaimAuth';

describe('starterClaimAuth', () => {
	it('builds the exact shared-network starter claim message', () => {
		expect(buildStarterClaimAuthMessage({
			username: ' @Alice ',
			timestamp: 1_800_000_000_000,
		})).toBe('ragnarok-starter-claim:alice:1800000000000');
	});
});

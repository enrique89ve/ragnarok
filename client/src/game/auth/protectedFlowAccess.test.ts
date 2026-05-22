import { describe, expect, it } from 'vitest';
import {
	normalizeProtectedFlowAccountId,
	resolveProtectedFlowAccess,
} from './protectedFlowAccess';

describe('protectedFlowAccess', () => {
	it('normalizes Hive account ids before flow checks', () => {
		expect(normalizeProtectedFlowAccountId('  ENRIQUE89  ')).toBe('enrique89');
		expect(normalizeProtectedFlowAccountId('   ')).toBeNull();
		expect(normalizeProtectedFlowAccountId(null)).toBeNull();
	});

	it('allows anonymous local-dev flows', () => {
		expect(resolveProtectedFlowAccess({
			accountId: null,
			sharedNetwork: false,
			surface: 'starter_claim',
		})).toEqual({
			kind: 'allowed',
			accountId: null,
			localDev: true,
		});
	});

	it('blocks protected shared-network flows without a Hive account', () => {
		const access = resolveProtectedFlowAccess({
			accountId: null,
			sharedNetwork: true,
			surface: 'multiplayer',
		});

		expect(access.kind).toBe('blocked');
		if (access.kind === 'blocked') {
			expect(access.reason).toBe('hive_account_required');
			expect(access.message).toContain('Multiplayer requires a connected Hive account');
		}
	});

	it('allows protected shared-network flows for a Hive account', () => {
		expect(resolveProtectedFlowAccess({
			accountId: 'Alice',
			sharedNetwork: true,
			surface: 'campaign',
		})).toEqual({
			kind: 'allowed',
			accountId: 'alice',
			localDev: false,
		});
	});
});

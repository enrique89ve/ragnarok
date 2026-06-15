import { describe, expect, it } from 'vitest';
import {
	normalizeProtectedFlowAccountId,
	resolveProtectedFlowAccess,
	type ProtectedFlowSurface,
} from './protectedFlowAccess';

const ACCOUNT_BOUND_SURFACES: readonly ProtectedFlowSurface[] = [
	'starter_claim',
	'campaign',
	'campaign_battle',
	'collection',
	'multiplayer',
	'packs',
	'warband',
	'quick_match',
];

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
			authenticatedAccountId: null,
			sharedNetwork: true,
			surface: 'multiplayer',
		});

		expect(access.kind).toBe('blocked');
		if (access.kind === 'blocked') {
			expect(access.reason).toBe('hive_account_required');
			expect(access.message).toContain('Multiplayer requires a connected Hive account');
		}
	});

	it('blocks protected shared-network flows when the account is only persisted', () => {
		const access = resolveProtectedFlowAccess({
			accountId: 'alice',
			authenticatedAccountId: null,
			sharedNetwork: true,
			surface: 'starter_claim',
		});

		expect(access.kind).toBe('blocked');
		if (access.kind === 'blocked') {
			expect(access.reason).toBe('hive_session_required');
			expect(access.message).toContain('current Hive Keychain signature for @alice');
		}
	});

	it('blocks protected shared-network flows when the signed account does not match', () => {
		const access = resolveProtectedFlowAccess({
			accountId: 'alice',
			authenticatedAccountId: 'bob',
			sharedNetwork: true,
			surface: 'campaign',
		});

		expect(access.kind).toBe('blocked');
		if (access.kind === 'blocked') {
			expect(access.reason).toBe('hive_session_mismatch');
			expect(access.message).toContain('opened for @alice');
			expect(access.message).toContain('belongs to @bob');
		}
	});

	it('allows protected shared-network flows for a Hive account', () => {
		expect(resolveProtectedFlowAccess({
			accountId: 'Alice',
			authenticatedAccountId: '  alice ',
			sharedNetwork: true,
			surface: 'campaign',
		})).toEqual({
			kind: 'allowed',
			accountId: 'alice',
			localDev: false,
		});
	});

	it('blocks multiplayer until the signed account has claimed starter', () => {
		const access = resolveProtectedFlowAccess({
			accountId: 'Alice',
			authenticatedAccountId: 'alice',
			sharedNetwork: true,
			surface: 'multiplayer',
			requiresStarterClaim: true,
			starterClaimed: false,
		});

		expect(access.kind).toBe('blocked');
		if (access.kind === 'blocked') {
			expect(access.reason).toBe('starter_claim_required');
			expect(access.accountId).toBe('alice');
			expect(access.message).toContain('@alice');
			expect(access.message).toContain('starter');
		}
	});

	it('allows multiplayer when session and starter claim are both present', () => {
		expect(resolveProtectedFlowAccess({
			accountId: 'Alice',
			authenticatedAccountId: 'alice',
			sharedNetwork: true,
			surface: 'multiplayer',
			requiresStarterClaim: true,
			starterClaimed: true,
		})).toEqual({
			kind: 'allowed',
			accountId: 'alice',
			localDev: false,
		});
	});

	it('keeps local battle surfaces behind local starter claim without requiring Hive', () => {
		const blocked = resolveProtectedFlowAccess({
			accountId: null,
			sharedNetwork: false,
			surface: 'quick_match',
			requiresStarterClaim: true,
			starterClaimed: false,
		});
		expect(blocked.kind).toBe('blocked');
		if (blocked.kind === 'blocked') {
			expect(blocked.reason).toBe('starter_claim_required');
		}

		expect(resolveProtectedFlowAccess({
			accountId: null,
			sharedNetwork: false,
			surface: 'quick_match',
			requiresStarterClaim: true,
			starterClaimed: true,
		})).toEqual({
			kind: 'allowed',
			accountId: null,
			localDev: true,
		});
	});

	it('requires the same signed Hive account for every account-bound surface', () => {
		for (const surface of ACCOUNT_BOUND_SURFACES) {
			expect(resolveProtectedFlowAccess({
				accountId: 'Alice',
				authenticatedAccountId: 'alice',
				sharedNetwork: true,
				surface,
			})).toEqual({
				kind: 'allowed',
				accountId: 'alice',
				localDev: false,
			});

			const blocked = resolveProtectedFlowAccess({
				accountId: 'Alice',
				authenticatedAccountId: null,
				sharedNetwork: true,
				surface,
			});
			expect(blocked.kind).toBe('blocked');
			if (blocked.kind === 'blocked') {
				expect(blocked.reason).toBe('hive_session_required');
			}
		}
	});
});

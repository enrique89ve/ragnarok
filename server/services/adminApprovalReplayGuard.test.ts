import { beforeEach, describe, expect, it } from 'vitest';
import {
	reserveAdminApproval,
	resetAdminApprovalReplayGuardForTests,
	validateAdminApprovalNonceFreshness,
} from './adminApprovalReplayGuard';

describe('adminApprovalReplayGuard', () => {
	beforeEach(() => {
		resetAdminApprovalReplayGuardForTests();
	});

	it('rejects stale timestamp nonces before signature verification work', () => {
		const now = 1_000_000;
		const result = validateAdminApprovalNonceFreshness({
			approver: 'ragnarok',
			nonce: now - 11 * 60 * 1000,
			signature: 'SIG_K1_stale',
		}, now);

		expect(result).toEqual({ success: false, reason: 'admin approval expired' });
	});

	it('rejects replaying the same signed approval message', () => {
		const now = 1_000_000;
		const input = {
			protocol: 'ragnarok' as const,
			action: 'genesis' as const,
			approval: {
				approver: 'ragnarok',
				nonce: now,
				signature: 'SIG_K1_valid',
			},
			operatorAccount: 'ragnarok-ops',
			signedMessage: '{"domain":"ragnarok-admin-approval-v1"}',
			now,
		};

		expect(reserveAdminApproval(input)).toEqual({ success: true });
		expect(reserveAdminApproval(input)).toEqual({
			success: false,
			reason: 'admin approval already consumed',
		});
	});

	it('rejects non-increasing nonces for the same approver/action/operator scope', () => {
		const now = 1_000_000;
		const base = {
			protocol: 'ragnarok' as const,
			action: 'mint_batch' as const,
			operatorAccount: 'ragnarok-ops',
			now,
		};

		expect(reserveAdminApproval({
			...base,
			approval: { approver: 'ragnarok', nonce: now, signature: 'SIG_K1_a' },
			signedMessage: 'message-a',
		})).toEqual({ success: true });

		expect(reserveAdminApproval({
			...base,
			approval: { approver: 'ragnarok', nonce: now - 1, signature: 'SIG_K1_b' },
			signedMessage: 'message-b',
		})).toEqual({
			success: false,
			reason: 'admin approval nonce was already used',
		});
	});
});

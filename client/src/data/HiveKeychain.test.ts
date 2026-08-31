import { describe, expect, it } from 'vitest';

import {
	getHiveKeychainBlockNum,
	getHiveKeychainError,
	getHiveKeychainResultId,
	getHiveKeychainSignature,
	type HiveKeychainResponse,
} from './HiveKeychain';

describe('HiveKeychain response helpers', () => {
	it('extracts requestSignBuffer signatures from string results', () => {
		const response: HiveKeychainResponse = {
			success: true,
			result: 'SIG_HEX',
		};

		expect(getHiveKeychainSignature(response)).toBe('SIG_HEX');
		expect(getHiveKeychainResultId(response)).toBeUndefined();
		expect(getHiveKeychainBlockNum(response)).toBeUndefined();
	});

	it('extracts broadcast metadata from object results', () => {
		const response: HiveKeychainResponse = {
			success: true,
			result: {
				id: 'tx-1',
				block_num: 42,
			},
		};

		expect(getHiveKeychainResultId(response)).toBe('tx-1');
		expect(getHiveKeychainBlockNum(response)).toBe(42);
	});

	it('normalizes Keychain error shapes', () => {
		expect(getHiveKeychainError({
			success: false,
			error: new Error('ledger not supported'),
		}, 'fallback')).toBe('ledger not supported');
		expect(getHiveKeychainError({
			success: false,
			message: 'cancelled',
		}, 'fallback')).toBe('cancelled');
		expect(getHiveKeychainError({
			success: false,
		}, 'fallback')).toBe('fallback');
	});

	it('does not expose raw assertion objects from Keychain', () => {
		const assertion = {
			generatedMessage: false,
			code: 'ERR_ASSERTION',
			expected: true,
			operator: '===',
		};

		const message = getHiveKeychainError({
			success: false,
			error: assertion,
		}, 'fallback');

		expect(message).toContain('Posting key');
		expect(message).not.toContain('ERR_ASSERTION');
		expect(message).not.toContain('generatedMessage');
	});

	it('falls back for unknown structured errors instead of serializing them', () => {
		const message = getHiveKeychainError({
			success: false,
			error: { code: 'UNKNOWN_INTERNAL_ERROR', detail: 'private key' },
		}, 'safe fallback');

		expect(message).toBe('safe fallback');
	});
});

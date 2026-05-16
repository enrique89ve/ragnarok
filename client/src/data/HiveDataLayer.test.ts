import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signHiveMessage } from './HiveAuth';
import {
	buildSessionAuthorizeMessage,
	buildSessionRenewalMessage,
	signSessionAuthorize,
	signSessionRenewal,
} from './HiveDataLayer';

vi.mock('./HiveAuth', () => ({
	signHiveMessage: vi.fn(),
}));

const signHiveMessageMock = vi.mocked(signHiveMessage);

describe('HiveDataLayer battle authority signatures', () => {
	beforeEach(() => {
		signHiveMessageMock.mockReset();
		signHiveMessageMock.mockResolvedValue({ success: true, signature: 'SIG_POSTING' });
	});

	it('authorizes the match session key with Posting authority', async () => {
		await expect(signSessionAuthorize('match-1', 'pubkey-1', {
			username: 'alice',
		})).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionAuthorizeMessage('match-1', 'pubkey-1'),
			{
				keyType: 'Posting',
				title: 'Authorize session key',
				username: 'alice',
				providerId: 'hive_keychain',
			},
		);
	});

	it('renews match sessions with Posting authority', async () => {
		await expect(signSessionRenewal('match-1', 'pubkey-2', {
			username: 'alice',
		})).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionRenewalMessage('match-1', 'pubkey-2'),
			{
				keyType: 'Posting',
				title: 'Renew session key',
				username: 'alice',
				providerId: 'hive_keychain',
			},
		);
	});

	it('keeps the global HiveAuth session fallback when no username is supplied', async () => {
		await expect(signSessionAuthorize('match-1', 'pubkey-1')).resolves.toBe('SIG_POSTING');

		expect(signHiveMessageMock).toHaveBeenCalledWith(
			buildSessionAuthorizeMessage('match-1', 'pubkey-1'),
			{
				keyType: 'Posting',
				title: 'Authorize session key',
			},
		);
	});
});

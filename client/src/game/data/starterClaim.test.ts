import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildStarterClaimAuthMessage } from '@shared/starterClaimAuth';

const starterClaimMocks = vi.hoisted(() => ({
	authenticatedHiveUsername: null as string | null,
	markClaimed: vi.fn(),
	seedStarterHeroDecks: vi.fn(),
	signHiveMessage: vi.fn(),
}));

vi.mock('./starterSet', () => ({
	getStarterCards: () => [{ id: 1, name: 'Starter' }],
	seedStarterHeroDecks: starterClaimMocks.seedStarterHeroDecks,
}));

vi.mock('../stores/starterStore', () => ({
	useStarterStore: {
		getState: () => ({
			markClaimed: starterClaimMocks.markClaimed,
		}),
	},
}));

vi.mock('../../data/HiveSessionIdentity', () => ({
	getAuthenticatedHiveUsername: () => starterClaimMocks.authenticatedHiveUsername,
}));

vi.mock('../../data/HiveAuth', () => ({
	signHiveMessage: starterClaimMocks.signHiveMessage,
}));

type StarterClaimTestProfile = 'local-dev' | 'local-gameplay-v1' | 'hive-testnet-v1';

async function importStarterClaimWithProfile(profile: StarterClaimTestProfile) {
	vi.resetModules();
	vi.stubEnv('VITE_NETWORK_STAGE', profile === 'local-dev' ? 'local' : 'testnet');
	vi.stubEnv(
		'VITE_RAGNAROK_RESET_EPOCH',
		profile === 'hive-testnet-v1' ? 'closed-beta-starter-claim' : 'alfa-testnet-starter-claim',
	);
	const module = await import('./starterClaim');
	return module.claimStarterEntitlement;
}

describe('claimStarterEntitlement', () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		starterClaimMocks.authenticatedHiveUsername = null;
		starterClaimMocks.markClaimed.mockReset();
		starterClaimMocks.seedStarterHeroDecks.mockReset();
		starterClaimMocks.signHiveMessage.mockReset();
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })));
	});

	it('allows local-dev starter ceremony without a Hive account', async () => {
		const claimStarterEntitlement = await importStarterClaimWithProfile('local-dev');

		const result = await claimStarterEntitlement({ accountId: null });

		expect(result.success).toBe(true);
		expect(starterClaimMocks.seedStarterHeroDecks).toHaveBeenCalledTimes(1);
		expect(starterClaimMocks.markClaimed).toHaveBeenCalledWith(null);
		expect(starterClaimMocks.signHiveMessage).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('blocks shared-network starter ceremony without a Hive account', async () => {
		const claimStarterEntitlement = await importStarterClaimWithProfile('local-gameplay-v1');

		const result = await claimStarterEntitlement({ accountId: null });

		expect(result.success).toBe(false);
		expect(starterClaimMocks.seedStarterHeroDecks).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).not.toHaveBeenCalled();
	});

	it('blocks shared-network starter ceremony when the account has no current Keychain signature', async () => {
		const claimStarterEntitlement = await importStarterClaimWithProfile('hive-testnet-v1');

		const result = await claimStarterEntitlement({ accountId: 'alice' });

		expect(result.success).toBe(false);
		expect(starterClaimMocks.seedStarterHeroDecks).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).not.toHaveBeenCalled();
	});

	it('blocks shared-network starter ceremony when the signed account differs', async () => {
		starterClaimMocks.authenticatedHiveUsername = 'bob';
		const claimStarterEntitlement = await importStarterClaimWithProfile('hive-testnet-v1');

		const result = await claimStarterEntitlement({ accountId: 'alice' });

		expect(result.success).toBe(false);
		expect(starterClaimMocks.seedStarterHeroDecks).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).not.toHaveBeenCalled();
	});

	it('registers the normalized F1 starter receipt without a wallet signature', async () => {
		starterClaimMocks.authenticatedHiveUsername = 'enrique89';
		const claimStarterEntitlement = await importStarterClaimWithProfile('local-gameplay-v1');

		const result = await claimStarterEntitlement({ accountId: '  ENRIQUE89  ' });

		expect(result.success).toBe(true);
		expect(starterClaimMocks.signHiveMessage).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).toHaveBeenCalledWith('enrique89');
		const postCall = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/starter/claim');
		expect(postCall).toBeDefined();
		const bodyText = postCall?.[1]?.body;
		expect(typeof bodyText).toBe('string');
		if (typeof bodyText !== 'string') throw new Error('expected starter claim POST body');
		expect(JSON.parse(bodyText)).toEqual({ username: 'enrique89' });
	});

	it('keeps signed body auth for the F2 starter receipt', async () => {
		starterClaimMocks.authenticatedHiveUsername = 'enrique89';
		starterClaimMocks.signHiveMessage.mockResolvedValueOnce({
			success: true,
			signature: 'starter-signature',
		});
		const claimStarterEntitlement = await importStarterClaimWithProfile('hive-testnet-v1');

		const result = await claimStarterEntitlement({ accountId: '  ENRIQUE89  ' });

		expect(result.success).toBe(true);
		expect(starterClaimMocks.markClaimed).toHaveBeenCalledWith('enrique89');
		const postCall = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/starter/claim');
		expect(postCall).toBeDefined();
		const bodyText = postCall?.[1]?.body;
		expect(typeof bodyText).toBe('string');
		if (typeof bodyText !== 'string') throw new Error('expected starter claim POST body');
		const body = JSON.parse(bodyText) as Record<string, unknown>;
		expect(body).toMatchObject({
			username: 'enrique89',
			signature: 'starter-signature',
		});
		expect(typeof body.timestamp).toBe('number');
		if (typeof body.timestamp !== 'number') throw new Error('expected starter claim timestamp');
		expect(starterClaimMocks.signHiveMessage).toHaveBeenCalledWith(
			buildStarterClaimAuthMessage({
				username: 'enrique89',
				timestamp: body.timestamp,
			}),
			{ username: 'enrique89', title: 'Ragnarok: starter claim' },
		);
	});

	it('does not mark local starter claimed when the F1 registry rejects', async () => {
		starterClaimMocks.authenticatedHiveUsername = 'alice';
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 403 })));
		const claimStarterEntitlement = await importStarterClaimWithProfile('local-gameplay-v1');

		const result = await claimStarterEntitlement({ accountId: 'alice' });

		expect(result).toEqual({
			success: false,
			error: 'Starter claim registry rejected the ceremony (HTTP 403).',
		});
		expect(starterClaimMocks.seedStarterHeroDecks).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).not.toHaveBeenCalled();
		expect(starterClaimMocks.signHiveMessage).not.toHaveBeenCalled();
	});

	it('reuses an existing shared-network registry receipt without another signature', async () => {
		starterClaimMocks.authenticatedHiveUsername = 'alice';
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
			success: true,
			claimed: true,
		}), { status: 200 })));
		const claimStarterEntitlement = await importStarterClaimWithProfile('hive-testnet-v1');

		const result = await claimStarterEntitlement({ accountId: 'alice' });

		expect(result.success).toBe(true);
		expect(starterClaimMocks.signHiveMessage).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).toHaveBeenCalledWith('alice');
	});
});

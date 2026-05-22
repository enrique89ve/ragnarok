import { beforeEach, describe, expect, it, vi } from 'vitest';

const starterClaimMocks = vi.hoisted(() => ({
	markClaimed: vi.fn(),
	seedStarterHeroDecks: vi.fn(),
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

async function importStarterClaimWithStage(stage: 'local' | 'testnet') {
	vi.resetModules();
	vi.stubEnv('VITE_NETWORK_STAGE', stage);
	const module = await import('./starterClaim');
	return module.claimStarterEntitlement;
}

describe('claimStarterEntitlement', () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
		starterClaimMocks.markClaimed.mockReset();
		starterClaimMocks.seedStarterHeroDecks.mockReset();
	});

	it('allows local-dev starter ceremony without a Hive account', async () => {
		const claimStarterEntitlement = await importStarterClaimWithStage('local');

		const result = await claimStarterEntitlement({ accountId: null });

		expect(result.success).toBe(true);
		expect(starterClaimMocks.seedStarterHeroDecks).toHaveBeenCalledTimes(1);
		expect(starterClaimMocks.markClaimed).toHaveBeenCalledWith(null);
	});

	it('blocks shared-network starter ceremony without a Hive account', async () => {
		const claimStarterEntitlement = await importStarterClaimWithStage('testnet');

		const result = await claimStarterEntitlement({ accountId: null });

		expect(result.success).toBe(false);
		expect(starterClaimMocks.seedStarterHeroDecks).not.toHaveBeenCalled();
		expect(starterClaimMocks.markClaimed).not.toHaveBeenCalled();
	});

	it('scopes shared-network starter ceremony to the normalized Hive account', async () => {
		const claimStarterEntitlement = await importStarterClaimWithStage('testnet');

		const result = await claimStarterEntitlement({ accountId: '  ENRIQUE89  ' });

		expect(result.success).toBe(true);
		expect(starterClaimMocks.markClaimed).toHaveBeenCalledWith('enrique89');
	});
});

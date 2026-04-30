import { afterEach, describe, expect, it, vi } from 'vitest';

describe('verifyDeckOwnership', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('accepts starter cards without nft_id in testnet', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_DATA_LAYER_MODE', 'hive');
		vi.resetModules();

		const { verifyDeckOwnership } = await import('./deckVerification');
		const result = await verifyDeckOwnership('alice', [
			{ cardId: 140, category: 'starter' },
		]);

		expect(result).toEqual({
			valid: true,
			checkedCount: 0,
			starterCount: 1,
			invalidCards: [],
		});
	});

	it('rejects non-starter cards without nft_id in testnet', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_DATA_LAYER_MODE', 'hive');
		vi.resetModules();

		const { verifyDeckOwnership } = await import('./deckVerification');
		const result = await verifyDeckOwnership('alice', [
			{ cardId: 20001, category: 'genesis' },
		]);

		expect(result).toEqual({
			valid: false,
			checkedCount: 0,
			starterCount: 0,
			invalidCards: ['no-nft:20001'],
		});
	});

	it('rejects starter labels outside the fixed entitlement in testnet', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_DATA_LAYER_MODE', 'hive');
		vi.resetModules();

		const { verifyDeckOwnership } = await import('./deckVerification');
		const result = await verifyDeckOwnership('alice', [
			{ cardId: 204, category: 'starter' },
		]);

		expect(result).toEqual({
			valid: false,
			checkedCount: 0,
			starterCount: 0,
			invalidCards: ['invalid-starter:204'],
		});
	});
});

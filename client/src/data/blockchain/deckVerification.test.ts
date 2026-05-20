import { afterEach, describe, expect, it, vi } from 'vitest';

describe('verifyDeckOwnership', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('accepts starter cards without nft_id in testnet', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'testnet-deck-verification');
		vi.resetModules();

		const runtime = await import('../../game/config/featureFlags');
		const { verifyDeckOwnership } = await import('./deckVerification');
		const result = await verifyDeckOwnership('alice', [
			{ cardId: 140, category: 'starter' },
		]);

		expect(runtime.getDataLayerMode()).toBe('hive');
		expect(runtime.isBlockchainPackagingEnabled()).toBe(true);
		expect(result).toEqual({
			valid: true,
			checkedCount: 0,
			starterCount: 1,
			invalidCards: [],
		});
	});

	it('rejects non-starter cards without nft_id in testnet', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'closed-beta-deck-verification');
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

	it('accepts QA full-catalog cards without nft_id only in QA Season 0', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'qa-s0-deck-verification');
		vi.resetModules();

		const { verifyDeckOwnership } = await import('./deckVerification');
		const result = await verifyDeckOwnership('alice', [
			{ cardId: 20001, category: 'genesis' },
		]);

		expect(result).toEqual({
			valid: true,
			checkedCount: 0,
			starterCount: 0,
			invalidCards: [],
		});
	});

	it('rejects the same full-catalog card after the Closed Beta epoch cutover', async () => {
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'closed-beta-2026-06');
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
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'testnet-deck-verification');
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

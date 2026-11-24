import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const duatMocks = vi.hoisted(() => ({
	isHiveMode: vi.fn(() => true),
	isSharedNetworkEnvironment: vi.fn(() => true),
	lookupDuatSnapshot: vi.fn(),
	getDuatPacksFor: vi.fn(() => 5),
	getDuatClaim: vi.fn(async () => null),
	getGenesisState: vi.fn(async () => ({ version: '1.0.0', sealed: true })),
}));

vi.mock('../config/featureFlags', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../config/featureFlags')>();
	return {
		...actual,
		isHiveMode: () => duatMocks.isHiveMode(),
		isSharedNetworkEnvironment: () => duatMocks.isSharedNetworkEnvironment(),
	};
});

vi.mock('@shared/protocol-core/duatSnapshot', () => ({
	lookupDuatSnapshot: duatMocks.lookupDuatSnapshot,
	getDuatPacksFor: duatMocks.getDuatPacksFor,
}));

vi.mock('../../data/blockchain/replayDB', () => ({
	getDuatClaim: duatMocks.getDuatClaim,
	getGenesisState: duatMocks.getGenesisState,
}));

describe('useDuatClaimStore phase gating', () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
		duatMocks.isHiveMode.mockReturnValue(true);
		duatMocks.isSharedNetworkEnvironment.mockReturnValue(true);
		duatMocks.lookupDuatSnapshot.mockReset().mockReturnValue({ account: 'alice', duatRaw: 50000 });
		duatMocks.getDuatPacksFor.mockReset().mockReturnValue(5);
		duatMocks.getDuatClaim.mockReset().mockResolvedValue(null);
		duatMocks.getGenesisState.mockReset().mockResolvedValue({ version: '1.0.0', sealed: true });
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('keeps DUAT claim blocked in F1 Alfa testnet even if genesis state is sealed', async () => {
		vi.resetModules();
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'alfa-testnet-duat-check');
		const { useDuatClaimStore } = await import('./duatClaimStore');

		await useDuatClaimStore.getState().checkAccount('alice');

		const entry = useDuatClaimStore.getState().currentUserEntry;
		expect(entry).toMatchObject({
			account: 'alice',
			eligible: true,
			packsEarned: 5,
			claimReady: false,
		});
		expect(entry?.claimBlockedReason).toContain('disabled in this testnet phase');
	});

	it('marks DUAT claim ready on mainnet once genesis state is sealed', async () => {
		vi.resetModules();
		vi.stubEnv('VITE_NETWORK_STAGE', 'mainnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'mainnet-season-1');
		const { useDuatClaimStore } = await import('./duatClaimStore');

		await useDuatClaimStore.getState().checkAccount('alice');

		const entry = useDuatClaimStore.getState().currentUserEntry;
		expect(entry).toMatchObject({
			account: 'alice',
			eligible: true,
			packsEarned: 5,
			claimReady: true,
			claimBlockedReason: null,
		});
	});
});

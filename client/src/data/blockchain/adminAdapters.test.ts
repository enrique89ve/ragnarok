import { afterEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

async function loadAdminAdapters() {
	vi.resetModules();
	return import('./adminAdapters');
}

function adminConfigResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		success: true,
		stage: 'testnet',
		executionMode: 'testnet',
		protocolId: 'rk_game_testnet',
		collectionId: 'ragnarok-testnet',
		nftLoxProtocolId: 'nftlox_testnet',
		resetEpoch: 'closed-beta-2026-06',
		resettable: true,
		economic: false,
		runtimePhase: 'closed-beta',
		seasonStart: '2026-05-19T00:00:00Z',
		storageNamespace: 'ragnarok-testnet-closed-beta-2026-06-rk-game-testnet',
		qaFullCatalogEnabled: false,
		state: {
			persistence: 'json-file',
			chainStateFile: 'data/chain-state.testnet.json',
			stateDirectory: 'data',
			chainStateFileConfigured: true,
			ownershipSource: 'nftlox',
			ownershipSourceConfigured: true,
		},
		adminAccount: 'ragnarok-test',
		adminOperatorAccount: 'ragnarok-test-operator',
		multisigConfigured: true,
		closedBetaCutover: {
			targetPhase: 'closed-beta',
			activePhase: 'closed-beta',
			resetEpoch: 'closed-beta-2026-06',
			storageNamespace: 'ragnarok-testnet-closed-beta-2026-06-rk-game-testnet',
			operatorSignoffRequired: true,
			inviteBlocked: false,
			blockerIds: [],
			checks: [
				{
					id: 'qa_full_catalog_disabled',
					status: 'pass',
					detail: 'qaFullCatalogEnabled=false',
				},
			],
		},
		...overrides,
	};
}

describe('admin blockchain adapters', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it('reports an unconfigured operator instead of rejecting the admin config shape', async () => {
		const fetchMock = vi.fn(async () => jsonResponse(adminConfigResponse({
			adminOperatorAccount: '',
			multisigConfigured: false,
		})));
		vi.stubGlobal('fetch', fetchMock);

		const { getAdminServerConfig } = await loadAdminAdapters();

		await expect(getAdminServerConfig()).rejects.toThrow('Admin operator account is not configured');
		expect(fetchMock).toHaveBeenCalledWith('/api/admin/config');
	});

	it('can read admin runtime config while the operator is missing', async () => {
		const fetchMock = vi.fn(async () => jsonResponse(adminConfigResponse({
			adminOperatorAccount: '',
			multisigConfigured: false,
		})));
		vi.stubGlobal('fetch', fetchMock);

		const { getAdminServerConfig } = await loadAdminAdapters();
		const config = await getAdminServerConfig({ requireMultisig: false });

		expect(config.adminOperatorAccount).toBe('');
		expect(config.multisigConfigured).toBe(false);
		expect(config.closedBetaCutover.activePhase).toBe('closed-beta');
		expect(fetchMock).toHaveBeenCalledWith('/api/admin/config');
	});

	it('returns runtime and cutover evidence from the admin config boundary', async () => {
		const fetchMock = vi.fn(async () => jsonResponse(adminConfigResponse()));
		vi.stubGlobal('fetch', fetchMock);

		const { getAdminServerConfig } = await loadAdminAdapters();
		const config = await getAdminServerConfig();

		expect(config).toMatchObject({
			stage: 'testnet',
			protocolId: 'rk_game_testnet',
			resetEpoch: 'closed-beta-2026-06',
			runtimePhase: 'closed-beta',
			qaFullCatalogEnabled: false,
			state: {
				persistence: 'json-file',
				ownershipSource: 'nftlox',
			},
			multisigConfigured: true,
		});
		expect(config.closedBetaCutover.inviteBlocked).toBe(false);
		expect(config.closedBetaCutover.operatorSignoffRequired).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith('/api/admin/config');
	});

	it('accepts unauthenticated session status while operator config is missing', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({
			success: true,
			authenticated: false,
			adminAccount: 'ragnarok',
			adminOperatorAccount: '',
			reason: 'missing_session',
		}));
		vi.stubGlobal('fetch', fetchMock);

		const { getAdminSessionStatus } = await loadAdminAdapters();
		const status = await getAdminSessionStatus();

		expect(status.authenticated).toBe(false);
		expect(status.adminOperatorAccount).toBe('');
		expect(status.reason).toBe('missing_session');
		expect(fetchMock).toHaveBeenCalledWith('/api/admin/session/status', {
			credentials: 'same-origin',
		});
	});
});

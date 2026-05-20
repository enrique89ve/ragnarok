import { describe, expect, it } from 'vitest';
import {
	RAGNAROK_RUNTIME_CONFIGS,
	createRagnarokDatabaseName,
	createRagnarokStorageKey,
	getRagnarokStorageNamespace,
	isQaFullCatalogEntitlementEnabled,
	resolveRagnarokRuntimeConfig,
	shouldAcceptCustomJsonId,
} from './runtimeConfig';

describe('runtimeConfig', () => {
	it('resolves testnet as a mainnet-like resettable profile', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-2026-05',
		});

		expect(config).toMatchObject({
			stage: 'testnet',
			executionMode: 'testnet',
			protocolId: 'rk_game_testnet',
			adminAccount: 'ragnarok-test',
			treasuryAccount: 'ragnarok-test',
			resettable: true,
			economic: false,
			acceptsLegacyProtocolIds: false,
			resetEpoch: 'qa-s0-2026-05',
		});
	});

	it('requires an explicit reset epoch for testnet so shared phases cannot inherit stale projections', () => {
		expect(() => resolveRagnarokRuntimeConfig({ VITE_NETWORK_STAGE: 'testnet' })).toThrow(
			/VITE_RAGNAROK_RESET_EPOCH/,
		);
	});

	it('lets the server-only reset epoch override the browser-visible value', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-browser',
			RAGNAROK_RESET_EPOCH: 'qa-s0-server',
		});

		expect(config.resetEpoch).toBe('qa-s0-server');
	});

	it('keeps mainnet permanent and legacy-aware for migration replay', () => {
		const config = resolveRagnarokRuntimeConfig({ VITE_NETWORK_STAGE: 'mainnet' });

		expect(config).toMatchObject({
			stage: 'mainnet',
			executionMode: 'mainnet',
			protocolId: 'ragnarok-cards',
			resettable: false,
			economic: true,
			acceptsLegacyProtocolIds: true,
		});
	});

	it('uses only the active testnet protocol id by default', () => {
		const testnet = RAGNAROK_RUNTIME_CONFIGS.testnet;

		expect(shouldAcceptCustomJsonId(testnet, 'rk_game_testnet')).toBe(true);
		expect(shouldAcceptCustomJsonId(testnet, 'ragnarok-cards')).toBe(false);
		expect(shouldAcceptCustomJsonId(testnet, 'rp_match_start')).toBe(false);
	});

	it('lets explicit env override protocol id without changing stage policy', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-2026-05',
			RAGNAROK_PROTOCOL_ID: 'rk_game_internal',
		});

		expect(config.protocolId).toBe('rk_game_internal');
		expect(config.acceptsLegacyProtocolIds).toBe(false);
	});

	it('enables QA full-catalog entitlement only for QA Season 0 reset epochs', () => {
		const qaSeason0 = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-2026-05',
		});
		const qaSeason0Label = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'QA Season 0 / 2026-05',
		});
		const closedBeta = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'Closed Beta / 2026-06',
		});
		const mainnet = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'mainnet',
		});

		expect(isQaFullCatalogEntitlementEnabled(qaSeason0)).toBe(true);
		expect(isQaFullCatalogEntitlementEnabled(qaSeason0Label)).toBe(true);
		expect(isQaFullCatalogEntitlementEnabled(closedBeta)).toBe(false);
		expect(isQaFullCatalogEntitlementEnabled(mainnet)).toBe(false);
	});

	it('namespaces storage and IndexedDB by stage, reset epoch, and protocol id', () => {
		const qaSeason0 = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'QA Season 0 / 2026-05',
			RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
		});
		const closedBeta = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'Closed Beta / 2026-06',
			RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
		});

		expect(getRagnarokStorageNamespace(qaSeason0)).toBe('ragnarok-testnet-qa-season-0-2026-05-rk-game-testnet');
		expect(createRagnarokStorageKey(qaSeason0, 'ragnarok-decks')).toBe(
			'ragnarok-testnet-qa-season-0-2026-05-rk-game-testnet:ragnarok-decks',
		);
		expect(createRagnarokDatabaseName(qaSeason0, 'chain-v1')).toBe(
			'ragnarok-testnet-qa-season-0-2026-05-rk-game-testnet-chain-v1',
		);
		expect(createRagnarokStorageKey(closedBeta, 'ragnarok-decks')).toBe(
			'ragnarok-testnet-closed-beta-2026-06-rk-game-testnet:ragnarok-decks',
		);
		expect(createRagnarokStorageKey(qaSeason0, 'ragnarok-decks')).not.toBe(
			createRagnarokStorageKey(closedBeta, 'ragnarok-decks'),
		);
		expect(createRagnarokDatabaseName(qaSeason0, 'chain-v1')).not.toBe(
			createRagnarokDatabaseName(closedBeta, 'chain-v1'),
		);
	});
});

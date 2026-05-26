import { describe, expect, it } from 'vitest';
import {
	RAGNAROK_RUNTIME_CONFIGS,
	buildClosedBetaCutoverGate,
	buildRagnarokRuntimeEvidence,
	createRagnarokDatabaseName,
	createRagnarokStorageKey,
	getRagnarokStorageNamespace,
	getRagnarokRuntimePhase,
	isClosedTestnetBetaResetEpoch,
	isAlfaTestnetResetEpoch,
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

	it('classifies closed beta reset epochs without enabling QA full-catalog access', () => {
		const closedBeta = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'Closed Beta / 2026-06',
		});

		expect(isClosedTestnetBetaResetEpoch(closedBeta.resetEpoch)).toBe(true);
		expect(getRagnarokRuntimePhase(closedBeta)).toBe('closed-beta');
		expect(isQaFullCatalogEntitlementEnabled(closedBeta)).toBe(false);
	});

	it('classifies alfa testnet reset epochs as a testnet alias without enabling QA full-catalog access', () => {
		const alfa = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'alfa-testnet-full-nft-2026-05-22',
		});

		expect(alfa.stage).toBe('testnet');
		expect(alfa.executionMode).toBe('testnet');
		expect(alfa.protocolId).toBe('rk_game_testnet');
		expect(alfa.collectionId).toBe('ragnarok-testnet');
		expect(alfa.nftLoxProtocolId).toBe('');
		expect(isAlfaTestnetResetEpoch(alfa.resetEpoch)).toBe(true);
		expect(getRagnarokRuntimePhase(alfa)).toBe('alfa-testnet');
		expect(isQaFullCatalogEntitlementEnabled(alfa)).toBe(false);
		expect(getRagnarokStorageNamespace(alfa)).toBe('ragnarok-testnet-alfa-testnet-full-nft-2026-05-22-rk-game-testnet');
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

	it('builds shared runtime evidence for tester exports', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-export-evidence',
			RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
		});

		expect(buildRagnarokRuntimeEvidence(config)).toEqual({
			stage: 'testnet',
			executionMode: 'testnet',
			protocolId: 'rk_game_testnet',
			collectionId: 'ragnarok-testnet',
			nftLoxProtocolId: '',
			resetEpoch: 'qa-s0-export-evidence',
			resettable: true,
			economic: false,
			runtimePhase: 'qa-season-0',
			seasonStart: '2026-05-19T00:00:00Z',
			storageNamespace: 'ragnarok-testnet-qa-s0-export-evidence-rk-game-testnet',
			qaFullCatalogEnabled: true,
		});
	});

	it('passes the automated closed beta cutover gate for a configured closed-beta epoch', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'closed-beta-2026-06',
			VITE_NFTLOX_PROTOCOL_ID: 'nftlox_testnet',
			RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
			RAGNAROK_NFTLOX_COLLECTION_PROOF: 'verified',
			RAGNAROK_HIVE_KEYCHAIN_SMOKE: 'passed',
			RAGNAROK_P2P_TWO_BROWSER_SMOKE: 'passed',
			RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF: 'approved',
		});
		const gate = buildClosedBetaCutoverGate(config);

		expect(gate).toMatchObject({
			targetPhase: 'closed-beta',
			activePhase: 'closed-beta',
			resetEpoch: 'closed-beta-2026-06',
			operatorSignoffRequired: false,
			inviteBlocked: false,
			blockerIds: [],
		});
		expect(gate.checks.every((check) => check.status === 'pass')).toBe(true);
		expect(gate.storageNamespace).toBe('ragnarok-testnet-closed-beta-2026-06-rk-game-testnet');
	});

	it('blocks closed beta invites while the active epoch is still QA Season 0', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'qa-s0-2026-05',
			RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
			RAGNAROK_NFTLOX_COLLECTION_PROOF: 'verified',
			RAGNAROK_HIVE_KEYCHAIN_SMOKE: 'passed',
			RAGNAROK_P2P_TWO_BROWSER_SMOKE: 'passed',
			RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF: 'approved',
		});
		const gate = buildClosedBetaCutoverGate(config);

		expect(gate.activePhase).toBe('qa-season-0');
		expect(gate.inviteBlocked).toBe(true);
		expect(gate.blockerIds).toContain('closed_beta_reset_epoch');
		expect(gate.blockerIds).toContain('qa_full_catalog_disabled');
		expect(gate.blockerIds).toContain('ownership_authority_scope');
	});

	it('blocks closed beta invites when NFT custody configuration is missing', () => {
		const config = {
			...RAGNAROK_RUNTIME_CONFIGS.testnet,
			resetEpoch: 'closed-beta-2026-06',
			collectionId: '',
			nftLoxProtocolId: '',
			closedBetaNftLoxCollectionProof: true,
			closedBetaHiveKeychainSmoke: true,
			closedBetaTwoBrowserP2PSmoke: true,
			closedBetaOperatorSignoff: true,
		};
		const gate = buildClosedBetaCutoverGate(config);

		expect(gate.activePhase).toBe('closed-beta');
		expect(gate.inviteBlocked).toBe(true);
		expect(gate.blockerIds).toEqual(['collection_id_configured', 'nftlox_protocol_configured']);
	});

	it('blocks closed beta invites until human evidence gates are explicitly set', () => {
		const config = resolveRagnarokRuntimeConfig({
			VITE_NETWORK_STAGE: 'testnet',
			VITE_RAGNAROK_RESET_EPOCH: 'closed-beta-2026-06',
			VITE_NFTLOX_PROTOCOL_ID: 'nftlox_testnet',
			RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
		});
		const gate = buildClosedBetaCutoverGate(config);

		expect(gate.activePhase).toBe('closed-beta');
		expect(gate.operatorSignoffRequired).toBe(true);
		expect(gate.inviteBlocked).toBe(true);
		expect(gate.blockerIds).toEqual([
			'nftlox_collection_proof',
			'hive_keychain_smoke',
			'two_browser_p2p_smoke',
			'operator_signoff',
		]);
	});
});

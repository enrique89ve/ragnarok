export const RAGNAROK_NETWORK_STAGES = ['local', 'testnet', 'mainnet'] as const;
export type RagnarokNetworkStage = typeof RAGNAROK_NETWORK_STAGES[number];

export const RAGNAROK_RUNTIME_EXECUTION_MODES = ['local-dev', 'testnet', 'mainnet'] as const;
export type RagnarokRuntimeExecutionMode = typeof RAGNAROK_RUNTIME_EXECUTION_MODES[number];

export const RAGNAROK_RUNTIME_PHASES = ['local', 'qa-season-0', 'alfa-testnet', 'closed-beta', 'generic-testnet', 'mainnet'] as const;
export type RagnarokRuntimePhase = typeof RAGNAROK_RUNTIME_PHASES[number];

export const RAGNAROK_CLOSED_BETA_CUTOVER_CHECK_IDS = [
	'testnet_profile',
	'closed_beta_reset_epoch',
	'qa_full_catalog_disabled',
	'isolated_storage_namespace',
	'collection_id_configured',
	'nftlox_protocol_configured',
	'resettable_non_economic',
	'ownership_authority_scope',
	'nftlox_collection_proof',
	'hive_keychain_smoke',
	'two_browser_p2p_smoke',
	'operator_signoff',
] as const;
export type RagnarokClosedBetaCutoverCheckId = typeof RAGNAROK_CLOSED_BETA_CUTOVER_CHECK_IDS[number];
export type RagnarokClosedBetaCutoverCheckStatus = 'pass' | 'fail';

export type RagnarokClosedBetaCutoverCheck = {
	readonly id: RagnarokClosedBetaCutoverCheckId;
	readonly status: RagnarokClosedBetaCutoverCheckStatus;
	readonly detail: string;
};

export type RagnarokClosedBetaCutoverGate = {
	readonly targetPhase: 'closed-beta';
	readonly activePhase: RagnarokRuntimePhase;
	readonly resetEpoch: string;
	readonly storageNamespace: string;
	readonly operatorSignoffRequired: boolean;
	readonly inviteBlocked: boolean;
	readonly blockerIds: readonly RagnarokClosedBetaCutoverCheckId[];
	readonly checks: readonly RagnarokClosedBetaCutoverCheck[];
};

export type RagnarokRuntimeConfig = {
	readonly stage: RagnarokNetworkStage;
	readonly executionMode: RagnarokRuntimeExecutionMode;
	readonly protocolId: string;
	readonly collectionId: string;
	readonly adminAccount: string;
	readonly adminOperatorAccount: string;
	readonly genesisAccount: string;
	readonly treasuryAccount: string;
	readonly indexAccount: string;
	readonly indexerUrl: string;
	readonly artIndexerUrl: string;
	readonly nftLoxProtocolId: string;
	readonly nftArtBaseUrl: string;
	readonly externalUrlBase: string;
	readonly resetEpoch: string;
	readonly resettable: boolean;
	readonly economic: boolean;
	readonly acceptsLegacyProtocolIds: boolean;
	readonly seasonStart: string;
	readonly indexStartBlock: number;
	readonly closedBetaNftLoxCollectionProof: boolean;
	readonly closedBetaHiveKeychainSmoke: boolean;
	readonly closedBetaTwoBrowserP2PSmoke: boolean;
	readonly closedBetaOperatorSignoff: boolean;
};

export type RagnarokRuntimeEvidence = {
	readonly stage: RagnarokRuntimeConfig['stage'];
	readonly executionMode: RagnarokRuntimeConfig['executionMode'];
	readonly protocolId: string;
	readonly collectionId: string;
	readonly nftLoxProtocolId: string;
	readonly resetEpoch: string;
	readonly resettable: boolean;
	readonly economic: boolean;
	readonly runtimePhase: RagnarokRuntimePhase;
	readonly seasonStart: string;
	readonly indexStartBlock: number;
	readonly storageNamespace: string;
	readonly qaFullCatalogEnabled: boolean;
};

export type RagnarokRuntimeEnv = Partial<Record<
	| 'VITE_NETWORK_STAGE'
	| 'VITE_RAGNAROK_PROTOCOL_ID'
	| 'VITE_RAGNAROK_COLLECTION_ID'
	| 'VITE_RAGNAROK_ADMIN_ACCOUNT'
	| 'VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT'
	| 'VITE_RAGNAROK_GENESIS_ACCOUNT'
	| 'VITE_RAGNAROK_TREASURY_ACCOUNT'
	| 'VITE_RAGNAROK_INDEX_ACCOUNT'
	| 'VITE_RAGNAROK_INDEXER_URL'
	| 'VITE_RAGNAROK_ART_INDEXER_URL'
	| 'VITE_NFTLOX_PROTOCOL_ID'
	| 'VITE_NFT_ART_BASE_URL'
	| 'VITE_EXTERNAL_URL_BASE'
	| 'VITE_RAGNAROK_RESET_EPOCH'
	| 'VITE_SEASON_START'
	| 'VITE_RAGNAROK_INDEX_START_BLOCK'
	| 'RAGNAROK_PROTOCOL_ID'
	| 'RAGNAROK_RESET_EPOCH'
	| 'RAGNAROK_ADMIN_OPERATOR_ACCOUNT'
	| 'RAGNAROK_SEASON_START'
	| 'RAGNAROK_INDEX_START_BLOCK'
	| 'RAGNAROK_NFTLOX_COLLECTION_PROOF'
	| 'RAGNAROK_HIVE_KEYCHAIN_SMOKE'
	| 'RAGNAROK_P2P_TWO_BROWSER_SMOKE'
	| 'RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF',
	string | undefined
>>;

const GITHUB_PAGES_BASE_URL = 'https://dhenz14.github.io/norse-mythos-card-game';

export const RAGNAROK_RUNTIME_CONFIGS = {
	local: {
		stage: 'local',
		executionMode: 'local-dev',
		protocolId: 'ragnarok-cards-local',
		collectionId: 'ragnarok-local',
		adminAccount: 'ragnarok',
		adminOperatorAccount: '',
		genesisAccount: 'ragnarok-genesis',
		treasuryAccount: 'ragnarok-treasury',
		indexAccount: 'ragnarok-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox_testnet',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resetEpoch: 'local-dev',
		resettable: true,
		economic: false,
		acceptsLegacyProtocolIds: true,
		seasonStart: '2026-06-14T23:28:54Z',
		indexStartBlock: 107278144,
		closedBetaNftLoxCollectionProof: false,
		closedBetaHiveKeychainSmoke: false,
		closedBetaTwoBrowserP2PSmoke: false,
		closedBetaOperatorSignoff: false,
	},
	testnet: {
		stage: 'testnet',
		executionMode: 'testnet',
		protocolId: 'rk_game_testnet',
		collectionId: 'ragnarok-testnet',
		adminAccount: 'ragnarok-test',
		adminOperatorAccount: '',
		genesisAccount: 'ragnarok-test',
		treasuryAccount: 'ragnarok-test',
		indexAccount: 'ragnarok-test-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: '',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resetEpoch: 'testnet-s01-2026-05-19',
		resettable: true,
		economic: false,
		acceptsLegacyProtocolIds: false,
		seasonStart: '2026-06-14T23:28:54Z',
		indexStartBlock: 107278144,
		closedBetaNftLoxCollectionProof: false,
		closedBetaHiveKeychainSmoke: false,
		closedBetaTwoBrowserP2PSmoke: false,
		closedBetaOperatorSignoff: false,
	},
	mainnet: {
		stage: 'mainnet',
		executionMode: 'mainnet',
		protocolId: 'ragnarok-cards',
		collectionId: 'ragnarok-alpha',
		adminAccount: 'ragnarok',
		adminOperatorAccount: '',
		genesisAccount: 'ragnarok-genesis',
		treasuryAccount: 'ragnarok-treasury',
		indexAccount: 'ragnarok-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resetEpoch: 'mainnet-genesis',
		resettable: false,
		economic: true,
		acceptsLegacyProtocolIds: true,
		seasonStart: '2026-06-14T23:28:54Z',
		indexStartBlock: 107278144,
		closedBetaNftLoxCollectionProof: false,
		closedBetaHiveKeychainSmoke: false,
		closedBetaTwoBrowserP2PSmoke: false,
		closedBetaOperatorSignoff: false,
	},
} as const satisfies Record<RagnarokNetworkStage, RagnarokRuntimeConfig>;

export const RAGNAROK_PROTOCOL_IDS = [
	RAGNAROK_RUNTIME_CONFIGS.mainnet.protocolId,
	RAGNAROK_RUNTIME_CONFIGS.testnet.protocolId,
	RAGNAROK_RUNTIME_CONFIGS.local.protocolId,
] as const;
export type RagnarokKnownProtocolId = typeof RAGNAROK_PROTOCOL_IDS[number];

export const DEFAULT_RAGNAROK_RUNTIME_CONFIG = RAGNAROK_RUNTIME_CONFIGS.local;

export function isRagnarokNetworkStage(value: string | undefined): value is RagnarokNetworkStage {
	return value === 'local' || value === 'testnet' || value === 'mainnet';
}

export function resolveRagnarokNetworkStage(env: RagnarokRuntimeEnv): RagnarokNetworkStage {
	return isRagnarokNetworkStage(env.VITE_NETWORK_STAGE) ? env.VITE_NETWORK_STAGE : 'local';
}

function overrideString(value: string | undefined, fallback: string): string {
	return value && value.trim().length > 0 ? value.trim() : fallback;
}

function optionalString(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function evidenceFlag(value: string | undefined): boolean {
	const normalized = value?.trim().toLowerCase();
	return normalized === '1'
		|| normalized === 'true'
		|| normalized === 'yes'
		|| normalized === 'pass'
		|| normalized === 'passed'
		|| normalized === 'verified'
		|| normalized === 'approved';
}

function optionalPositiveInteger(value: string | undefined, fieldName: string): number | undefined {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	const parsed = Number(trimmed);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(`${fieldName} must be a positive integer`);
	}
	return parsed;
}

function resolveResetEpoch(env: RagnarokRuntimeEnv, base: RagnarokRuntimeConfig): string {
	const explicitEpoch = optionalString(env.RAGNAROK_RESET_EPOCH) ?? optionalString(env.VITE_RAGNAROK_RESET_EPOCH);
	if (explicitEpoch) return explicitEpoch;
	if (base.stage === 'testnet') {
		throw new Error(
			'VITE_RAGNAROK_RESET_EPOCH or RAGNAROK_RESET_EPOCH is required for the testnet runtime profile.',
		);
	}
	return base.resetEpoch;
}

export function resolveRagnarokRuntimeConfig(env: RagnarokRuntimeEnv): RagnarokRuntimeConfig {
	const base = RAGNAROK_RUNTIME_CONFIGS[resolveRagnarokNetworkStage(env)];

	return {
		...base,
		protocolId: overrideString(env.RAGNAROK_PROTOCOL_ID, overrideString(env.VITE_RAGNAROK_PROTOCOL_ID, base.protocolId)),
		collectionId: overrideString(env.VITE_RAGNAROK_COLLECTION_ID, base.collectionId),
		adminAccount: overrideString(env.VITE_RAGNAROK_ADMIN_ACCOUNT, base.adminAccount),
		adminOperatorAccount: overrideString(
			env.RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
			overrideString(env.VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT, base.adminOperatorAccount),
		),
		genesisAccount: overrideString(env.VITE_RAGNAROK_GENESIS_ACCOUNT, base.genesisAccount),
		treasuryAccount: overrideString(env.VITE_RAGNAROK_TREASURY_ACCOUNT, base.treasuryAccount),
		indexAccount: overrideString(env.VITE_RAGNAROK_INDEX_ACCOUNT, base.indexAccount),
		indexerUrl: overrideString(env.VITE_RAGNAROK_INDEXER_URL, base.indexerUrl),
		artIndexerUrl: overrideString(env.VITE_RAGNAROK_ART_INDEXER_URL, base.artIndexerUrl),
		nftLoxProtocolId: overrideString(env.VITE_NFTLOX_PROTOCOL_ID, base.nftLoxProtocolId),
		nftArtBaseUrl: overrideString(env.VITE_NFT_ART_BASE_URL, base.nftArtBaseUrl),
		externalUrlBase: overrideString(env.VITE_EXTERNAL_URL_BASE, base.externalUrlBase),
		resetEpoch: resolveResetEpoch(env, base),
		seasonStart: overrideString(env.RAGNAROK_SEASON_START, overrideString(env.VITE_SEASON_START, base.seasonStart)),
		indexStartBlock: optionalPositiveInteger(env.RAGNAROK_INDEX_START_BLOCK, 'RAGNAROK_INDEX_START_BLOCK')
			?? optionalPositiveInteger(env.VITE_RAGNAROK_INDEX_START_BLOCK, 'VITE_RAGNAROK_INDEX_START_BLOCK')
			?? base.indexStartBlock,
		closedBetaNftLoxCollectionProof: evidenceFlag(env.RAGNAROK_NFTLOX_COLLECTION_PROOF),
		closedBetaHiveKeychainSmoke: evidenceFlag(env.RAGNAROK_HIVE_KEYCHAIN_SMOKE),
		closedBetaTwoBrowserP2PSmoke: evidenceFlag(env.RAGNAROK_P2P_TWO_BROWSER_SMOKE),
		closedBetaOperatorSignoff: evidenceFlag(env.RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF),
	};
}

export function shouldAcceptCustomJsonId(config: RagnarokRuntimeConfig, customJsonId: string): boolean {
	if (customJsonId === config.protocolId) return true;
	if (!config.acceptsLegacyProtocolIds) return false;
	return customJsonId.startsWith('rp_') || customJsonId === 'ragnarok_level_up';
}

export function normalizeRuntimeNamespaceSegment(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized.length > 0 ? normalized : 'default';
}

export function isQaFullCatalogResetEpoch(resetEpoch: string): boolean {
	const normalized = normalizeRuntimeNamespaceSegment(resetEpoch);
	return (
		normalized === 'qa-s0'
		|| normalized.startsWith('qa-s0-')
		|| normalized === 'qa-season-0'
		|| normalized.startsWith('qa-season-0-')
	);
}

export function isAlfaTestnetResetEpoch(resetEpoch: string): boolean {
	const normalized = normalizeRuntimeNamespaceSegment(resetEpoch);
	return normalized === 'alfa-testnet' || normalized.startsWith('alfa-testnet-');
}

export function isClosedTestnetBetaResetEpoch(resetEpoch: string): boolean {
	const normalized = normalizeRuntimeNamespaceSegment(resetEpoch);
	return normalized === 'closed-beta' || normalized.startsWith('closed-beta-');
}

export function isNftFullTestnetRuntimePhase(phase: RagnarokRuntimePhase): boolean {
	return phase === 'alfa-testnet' || phase === 'closed-beta';
}

export function isQaFullCatalogEntitlementEnabled(config: RagnarokRuntimeConfig): boolean {
	return (
		config.stage === 'testnet'
		&& config.resettable
		&& !config.economic
		&& isQaFullCatalogResetEpoch(config.resetEpoch)
	);
}

export function getRagnarokRuntimePhase(config: RagnarokRuntimeConfig): RagnarokRuntimePhase {
	if (config.stage === 'local') return 'local';
	if (config.stage === 'mainnet') return 'mainnet';
	if (isQaFullCatalogResetEpoch(config.resetEpoch)) return 'qa-season-0';
	if (isAlfaTestnetResetEpoch(config.resetEpoch)) return 'alfa-testnet';
	if (isClosedTestnetBetaResetEpoch(config.resetEpoch)) return 'closed-beta';
	return 'generic-testnet';
}

export function getRagnarokStorageNamespace(config: RagnarokRuntimeConfig): string {
	return [
		'ragnarok',
		normalizeRuntimeNamespaceSegment(config.stage),
		normalizeRuntimeNamespaceSegment(config.resetEpoch),
		normalizeRuntimeNamespaceSegment(config.protocolId),
	].join('-');
}

export function createRagnarokStorageKey(config: RagnarokRuntimeConfig, key: string): string {
	return `${getRagnarokStorageNamespace(config)}:${normalizeRuntimeNamespaceSegment(key)}`;
}

export function createRagnarokDatabaseName(config: RagnarokRuntimeConfig, name: string): string {
	return `${getRagnarokStorageNamespace(config)}-${normalizeRuntimeNamespaceSegment(name)}`;
}

export function buildRagnarokRuntimeEvidence(config: RagnarokRuntimeConfig): RagnarokRuntimeEvidence {
	return {
		stage: config.stage,
		executionMode: config.executionMode,
		protocolId: config.protocolId,
		collectionId: config.collectionId,
		nftLoxProtocolId: config.nftLoxProtocolId,
		resetEpoch: config.resetEpoch,
		resettable: config.resettable,
		economic: config.economic,
		runtimePhase: getRagnarokRuntimePhase(config),
		seasonStart: config.seasonStart,
		indexStartBlock: config.indexStartBlock,
		storageNamespace: getRagnarokStorageNamespace(config),
		qaFullCatalogEnabled: isQaFullCatalogEntitlementEnabled(config),
	};
}

function createClosedBetaCutoverCheck(
	id: RagnarokClosedBetaCutoverCheckId,
	passes: boolean,
	detail: string,
): RagnarokClosedBetaCutoverCheck {
	return {
		id,
		status: passes ? 'pass' : 'fail',
		detail,
	};
}

export function buildClosedBetaCutoverGate(config: RagnarokRuntimeConfig): RagnarokClosedBetaCutoverGate {
	const runtimePhase = getRagnarokRuntimePhase(config);
	const storageNamespace = getRagnarokStorageNamespace(config);
	const qaFullCatalogEnabled = isQaFullCatalogEntitlementEnabled(config);
	const closedBetaEpoch = isClosedTestnetBetaResetEpoch(config.resetEpoch);
	const testnetProfile = config.stage === 'testnet';
	const checks: readonly RagnarokClosedBetaCutoverCheck[] = [
		createClosedBetaCutoverCheck(
			'testnet_profile',
			testnetProfile,
			`stage=${config.stage}`,
		),
		createClosedBetaCutoverCheck(
			'closed_beta_reset_epoch',
			testnetProfile && closedBetaEpoch,
			`resetEpoch=${config.resetEpoch}`,
		),
		createClosedBetaCutoverCheck(
			'qa_full_catalog_disabled',
			testnetProfile && !qaFullCatalogEnabled,
			`qaFullCatalogEnabled=${String(qaFullCatalogEnabled)}`,
		),
		createClosedBetaCutoverCheck(
			'isolated_storage_namespace',
			testnetProfile && closedBetaEpoch && !isQaFullCatalogResetEpoch(config.resetEpoch),
			`storageNamespace=${storageNamespace}`,
		),
		createClosedBetaCutoverCheck(
			'collection_id_configured',
			config.collectionId.trim().length > 0,
			`collectionId=${config.collectionId || 'missing'}`,
		),
		createClosedBetaCutoverCheck(
			'nftlox_protocol_configured',
			config.nftLoxProtocolId.trim().length > 0,
			`nftLoxProtocolId=${config.nftLoxProtocolId || 'missing'}`,
		),
		createClosedBetaCutoverCheck(
			'resettable_non_economic',
			testnetProfile && config.resettable && !config.economic,
			`resettable=${String(config.resettable)}, economic=${String(config.economic)}`,
		),
		createClosedBetaCutoverCheck(
			'ownership_authority_scope',
			testnetProfile && runtimePhase === 'closed-beta' && !qaFullCatalogEnabled,
			'starter entitlement remains universal; genesis cards require nft-custody or replay-derived pack acquisition',
		),
		createClosedBetaCutoverCheck(
			'nftlox_collection_proof',
			testnetProfile && runtimePhase === 'closed-beta' && config.closedBetaNftLoxCollectionProof,
			`RAGNAROK_NFTLOX_COLLECTION_PROOF=${String(config.closedBetaNftLoxCollectionProof)}`,
		),
		createClosedBetaCutoverCheck(
			'hive_keychain_smoke',
			testnetProfile && runtimePhase === 'closed-beta' && config.closedBetaHiveKeychainSmoke,
			`RAGNAROK_HIVE_KEYCHAIN_SMOKE=${String(config.closedBetaHiveKeychainSmoke)}`,
		),
		createClosedBetaCutoverCheck(
			'two_browser_p2p_smoke',
			testnetProfile && runtimePhase === 'closed-beta' && config.closedBetaTwoBrowserP2PSmoke,
			`RAGNAROK_P2P_TWO_BROWSER_SMOKE=${String(config.closedBetaTwoBrowserP2PSmoke)}`,
		),
		createClosedBetaCutoverCheck(
			'operator_signoff',
			testnetProfile && runtimePhase === 'closed-beta' && config.closedBetaOperatorSignoff,
			`RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF=${String(config.closedBetaOperatorSignoff)}`,
		),
	];
	const blockerIds = checks
		.filter((check) => check.status === 'fail')
		.map((check) => check.id);

	return {
		targetPhase: 'closed-beta',
		activePhase: runtimePhase,
		resetEpoch: config.resetEpoch,
		storageNamespace,
		operatorSignoffRequired: !config.closedBetaOperatorSignoff,
		inviteBlocked: blockerIds.length > 0,
		blockerIds,
		checks,
	};
}

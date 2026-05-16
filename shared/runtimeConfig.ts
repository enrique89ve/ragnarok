export const RAGNAROK_NETWORK_STAGES = ['local', 'testnet', 'mainnet'] as const;
export type RagnarokNetworkStage = typeof RAGNAROK_NETWORK_STAGES[number];

export const RAGNAROK_RUNTIME_EXECUTION_MODES = ['local-dev', 'testnet', 'mainnet'] as const;
export type RagnarokRuntimeExecutionMode = typeof RAGNAROK_RUNTIME_EXECUTION_MODES[number];

export type RagnarokRuntimeConfig = {
	readonly stage: RagnarokNetworkStage;
	readonly executionMode: RagnarokRuntimeExecutionMode;
	readonly protocolId: string;
	readonly collectionId: string;
	readonly adminAccount: string;
	readonly genesisAccount: string;
	readonly treasuryAccount: string;
	readonly indexAccount: string;
	readonly indexerUrl: string;
	readonly artIndexerUrl: string;
	readonly nftLoxProtocolId: string;
	readonly nftArtBaseUrl: string;
	readonly externalUrlBase: string;
	readonly resettable: boolean;
	readonly economic: boolean;
	readonly acceptsLegacyProtocolIds: boolean;
};

export type RagnarokRuntimeEnv = Partial<Record<
	| 'VITE_NETWORK_STAGE'
	| 'VITE_RAGNAROK_PROTOCOL_ID'
	| 'VITE_RAGNAROK_COLLECTION_ID'
	| 'VITE_RAGNAROK_ADMIN_ACCOUNT'
	| 'VITE_RAGNAROK_GENESIS_ACCOUNT'
	| 'VITE_RAGNAROK_TREASURY_ACCOUNT'
	| 'VITE_RAGNAROK_INDEX_ACCOUNT'
	| 'VITE_RAGNAROK_INDEXER_URL'
	| 'VITE_RAGNAROK_ART_INDEXER_URL'
	| 'VITE_NFTLOX_PROTOCOL_ID'
	| 'VITE_NFT_ART_BASE_URL'
	| 'VITE_EXTERNAL_URL_BASE'
	| 'RAGNAROK_PROTOCOL_ID',
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
		genesisAccount: 'ragnarok-genesis',
		treasuryAccount: 'ragnarok-treasury',
		indexAccount: 'ragnarok-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox_testnet',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resettable: true,
		economic: false,
		acceptsLegacyProtocolIds: true,
	},
	testnet: {
		stage: 'testnet',
		executionMode: 'testnet',
		protocolId: 'rk_game_testnet',
		collectionId: 'ragnarok-testnet',
		adminAccount: 'ragnarok-test',
		genesisAccount: 'ragnarok-test',
		treasuryAccount: 'ragnarok-test',
		indexAccount: 'ragnarok-test-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox_testnet',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resettable: true,
		economic: false,
		acceptsLegacyProtocolIds: false,
	},
	mainnet: {
		stage: 'mainnet',
		executionMode: 'mainnet',
		protocolId: 'ragnarok-cards',
		collectionId: 'ragnarok-alpha',
		adminAccount: 'ragnarok',
		genesisAccount: 'ragnarok-genesis',
		treasuryAccount: 'ragnarok-treasury',
		indexAccount: 'ragnarok-index',
		indexerUrl: '',
		artIndexerUrl: '',
		nftLoxProtocolId: 'nftlox',
		nftArtBaseUrl: GITHUB_PAGES_BASE_URL,
		externalUrlBase: GITHUB_PAGES_BASE_URL,
		resettable: false,
		economic: true,
		acceptsLegacyProtocolIds: true,
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

export function resolveRagnarokRuntimeConfig(env: RagnarokRuntimeEnv): RagnarokRuntimeConfig {
	const base = RAGNAROK_RUNTIME_CONFIGS[resolveRagnarokNetworkStage(env)];

	return {
		...base,
		protocolId: overrideString(env.RAGNAROK_PROTOCOL_ID, overrideString(env.VITE_RAGNAROK_PROTOCOL_ID, base.protocolId)),
		collectionId: overrideString(env.VITE_RAGNAROK_COLLECTION_ID, base.collectionId),
		adminAccount: overrideString(env.VITE_RAGNAROK_ADMIN_ACCOUNT, base.adminAccount),
		genesisAccount: overrideString(env.VITE_RAGNAROK_GENESIS_ACCOUNT, base.genesisAccount),
		treasuryAccount: overrideString(env.VITE_RAGNAROK_TREASURY_ACCOUNT, base.treasuryAccount),
		indexAccount: overrideString(env.VITE_RAGNAROK_INDEX_ACCOUNT, base.indexAccount),
		indexerUrl: overrideString(env.VITE_RAGNAROK_INDEXER_URL, base.indexerUrl),
		artIndexerUrl: overrideString(env.VITE_RAGNAROK_ART_INDEXER_URL, base.artIndexerUrl),
		nftLoxProtocolId: overrideString(env.VITE_NFTLOX_PROTOCOL_ID, base.nftLoxProtocolId),
		nftArtBaseUrl: overrideString(env.VITE_NFT_ART_BASE_URL, base.nftArtBaseUrl),
		externalUrlBase: overrideString(env.VITE_EXTERNAL_URL_BASE, base.externalUrlBase),
	};
}

export function shouldAcceptCustomJsonId(config: RagnarokRuntimeConfig, customJsonId: string): boolean {
	if (customJsonId === config.protocolId) return true;
	if (!config.acceptsLegacyProtocolIds) return false;
	return customJsonId.startsWith('rp_') || customJsonId === 'ragnarok_level_up';
}

import {
	RAGNAROK_RUNTIME_CONFIGS,
	createRagnarokDatabaseName,
	createRagnarokStorageKey,
	getRagnarokStorageNamespace,
	resolveRagnarokRuntimeConfig,
	type RagnarokRuntimeConfig,
} from '@shared/runtimeConfig';

export type RagnarokNetworkConfig = RagnarokRuntimeConfig;

export const RAGNAROK_NETWORK_CONFIGS = RAGNAROK_RUNTIME_CONFIGS;

const CLIENT_RUNTIME_ENV = {
	VITE_NETWORK_STAGE: import.meta.env.VITE_NETWORK_STAGE,
	VITE_RAGNAROK_PROTOCOL_ID: import.meta.env.VITE_RAGNAROK_PROTOCOL_ID,
	VITE_RAGNAROK_COLLECTION_ID: import.meta.env.VITE_RAGNAROK_COLLECTION_ID,
	VITE_RAGNAROK_ADMIN_ACCOUNT: import.meta.env.VITE_RAGNAROK_ADMIN_ACCOUNT,
	VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT: import.meta.env.VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT,
	VITE_RAGNAROK_GENESIS_ACCOUNT: import.meta.env.VITE_RAGNAROK_GENESIS_ACCOUNT,
	VITE_RAGNAROK_TREASURY_ACCOUNT: import.meta.env.VITE_RAGNAROK_TREASURY_ACCOUNT,
	VITE_RAGNAROK_INDEX_ACCOUNT: import.meta.env.VITE_RAGNAROK_INDEX_ACCOUNT,
	VITE_RAGNAROK_INDEXER_URL: import.meta.env.VITE_RAGNAROK_INDEXER_URL,
	VITE_RAGNAROK_ART_INDEXER_URL: import.meta.env.VITE_RAGNAROK_ART_INDEXER_URL,
	VITE_NFTLOX_PROTOCOL_ID: import.meta.env.VITE_NFTLOX_PROTOCOL_ID,
	VITE_NFT_ART_BASE_URL: import.meta.env.VITE_NFT_ART_BASE_URL,
	VITE_EXTERNAL_URL_BASE: import.meta.env.VITE_EXTERNAL_URL_BASE,
	VITE_RAGNAROK_RESET_EPOCH: import.meta.env.VITE_RAGNAROK_RESET_EPOCH,
	VITE_SEASON_START: import.meta.env.VITE_SEASON_START,
};

export const RAGNAROK_NETWORK_CONFIG = Object.freeze(resolveRagnarokRuntimeConfig(CLIENT_RUNTIME_ENV));

export function getRagnarokNetworkConfig(): RagnarokNetworkConfig {
	return RAGNAROK_NETWORK_CONFIG;
}

export function getRagnarokProtocolId(): string {
	return RAGNAROK_NETWORK_CONFIG.protocolId;
}

export function getRagnarokCollectionId(): string {
	return RAGNAROK_NETWORK_CONFIG.collectionId;
}

export function getRagnarokRuntimeStorageNamespace(): string {
	return getRagnarokStorageNamespace(RAGNAROK_NETWORK_CONFIG);
}

export function createRuntimeStorageKey(key: string): string {
	return createRagnarokStorageKey(RAGNAROK_NETWORK_CONFIG, key);
}

export function createRuntimeDatabaseName(name: string): string {
	return createRagnarokDatabaseName(RAGNAROK_NETWORK_CONFIG, name);
}

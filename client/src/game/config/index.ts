/**
 * Config - Exports
 * 
 * Added from Enrique's fork - Jan 31, 2026
 */

export {
	FeatureFlags,
	getDataLayerMode,
	getRuntimeExecutionMode,
	isBattleHistoryEnabled,
	isHiveMode,
	isLocalDevMode,
	isLocalMode,
	isMainnetMode,
	isMainnetStage,
	isResettableEnvironment,
	isSharedNetworkEnvironment,
	isTestMode,
	isTestnetStage,
} from './featureFlags';
export type { DataLayerMode, FeatureFlagsType, NetworkStage } from './featureFlags';
export {
	RAGNAROK_NETWORK_CONFIG,
	RAGNAROK_NETWORK_CONFIGS,
	getRagnarokCollectionId,
	getRagnarokNetworkConfig,
	getRagnarokProtocolId,
} from './networkConfig';
export type { RagnarokNetworkConfig } from './networkConfig';
export { StorageKeys, createStorageKey } from './storageKeys';
export type { StorageKey } from './storageKeys';

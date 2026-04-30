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
	isTestMode,
} from './featureFlags';
export type { DataLayerMode, FeatureFlagsType } from './featureFlags';
export { StorageKeys, createStorageKey } from './storageKeys';
export type { StorageKey } from './storageKeys';

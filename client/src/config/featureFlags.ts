/**
 * Shared feature flags — importable from both game/ and data/ domains.
 *
 * Re-exports from the canonical game/config/featureFlags.ts.
 * Both domains import from '@/config/featureFlags' to avoid
 * data/ → game/ reverse coupling.
 */

export {
	FeatureFlags,
	isHiveMode,
	isMainnetMode,
	isTestMode,
	isLocalMode,
	isLocalDevMode,
	isBattleHistoryEnabled,
	getDataLayerMode,
	getNetworkStage,
	getRuntimeExecutionMode,
	isEconomicEnvironment,
	isBlockchainPackagingEnabled,
	isLocalStage,
	isMainnetStage,
	isResettableEnvironment,
	isSharedNetworkEnvironment,
	isTestnetStage,
} from '../game/config/featureFlags';

export type { DataLayerMode, FeatureFlagsType, NetworkStage, RuntimeExecutionMode } from '../game/config/featureFlags';
export {
	RAGNAROK_NETWORK_CONFIG,
	RAGNAROK_NETWORK_CONFIGS,
	getRagnarokCollectionId,
	getRagnarokNetworkConfig,
	getRagnarokProtocolId,
} from '../game/config/networkConfig';
export type { RagnarokNetworkConfig } from '../game/config/networkConfig';

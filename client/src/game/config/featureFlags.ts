/**
 * featureFlags.ts
 *
 * Feature flags to control game features.
 * Driven by Vite env vars at build time (VITE_NETWORK_STAGE, VITE_DATA_LAYER_MODE, VITE_BLOCKCHAIN_PACKAGING).
 * Defaults to safe local/off values when env vars are not set.
 */

export type DataLayerMode = 'local' | 'test' | 'hive';
export type NetworkStage = 'local' | 'testnet' | 'mainnet';
export type RuntimeExecutionMode = 'mainnet' | 'local-dev';

function resolveDataLayerMode(): DataLayerMode {
	const raw = import.meta.env.VITE_DATA_LAYER_MODE as string | undefined;
	if (raw === 'hive' || raw === 'test' || raw === 'local') return raw;
	return 'local';
}

function resolveNetworkStage(): NetworkStage {
	const raw = import.meta.env.VITE_NETWORK_STAGE as string | undefined;
	if (raw === 'testnet' || raw === 'mainnet' || raw === 'local') return raw;
	return 'local';
}

function resolveBlockchainPackaging(): boolean {
	const raw = import.meta.env.VITE_BLOCKCHAIN_PACKAGING as string | undefined;
	return raw === 'true' || raw === '1';
}

export const FeatureFlags = {
	DATA_LAYER_MODE: resolveDataLayerMode(),
	NETWORK_STAGE: resolveNetworkStage(),
	BATTLE_HISTORY_ENABLED: true,
	BATTLE_HISTORY_MAX_SIZE: 5,
	DATA_LAYER_DEBUG: false,
	BLOCKCHAIN_PACKAGING_ENABLED: resolveBlockchainPackaging(),
};

export type FeatureFlagsType = typeof FeatureFlags;

/**
 * Checks if Hive blockchain mode is active.
 */
export function isHiveMode(): boolean {
	return FeatureFlags.DATA_LAYER_MODE === 'hive';
}

/**
 * Economic mainnet mode: ownership is enforced and only persistent assets
 * (`nft` + `starter`) participate in blockchain packaging.
 */
export function isMainnetMode(): boolean {
	return FeatureFlags.NETWORK_STAGE === 'mainnet';
}

/**
 * Checks if test mode is active (mock blockchain endpoints).
 */
export function isTestMode(): boolean {
	return FeatureFlags.DATA_LAYER_MODE === 'test';
}

/**
 * Checks if local mode is active (localStorage only).
 */
export function isLocalMode(): boolean {
	return FeatureFlags.DATA_LAYER_MODE === 'local';
}

export function getNetworkStage(): NetworkStage {
	return FeatureFlags.NETWORK_STAGE;
}

export function isLocalStage(): boolean {
	return FeatureFlags.NETWORK_STAGE === 'local';
}

export function isTestnetStage(): boolean {
	return FeatureFlags.NETWORK_STAGE === 'testnet';
}

export function isMainnetStage(): boolean {
	return FeatureFlags.NETWORK_STAGE === 'mainnet';
}

export function isResettableEnvironment(): boolean {
	return !isMainnetStage();
}

export function isSharedNetworkEnvironment(): boolean {
	return isTestnetStage() || isMainnetStage();
}

export function isEconomicEnvironment(): boolean {
	return isMainnetStage();
}

/**
 * Local/dev mode: the full card catalog can be used for gameplay simulation,
 * but catalog access is not economic ownership.
 */
export function isLocalDevMode(): boolean {
	return !isEconomicEnvironment();
}

/**
 * Checks if battle history is enabled.
 */
export function isBattleHistoryEnabled(): boolean {
	return FeatureFlags.BATTLE_HISTORY_ENABLED;
}

/**
 * Gets current data layer mode.
 */
export function getDataLayerMode(): DataLayerMode {
	return FeatureFlags.DATA_LAYER_MODE;
}

export function getRuntimeExecutionMode(): RuntimeExecutionMode {
	return isEconomicEnvironment() ? 'mainnet' : 'local-dev';
}

/**
 * Checks if blockchain packaging is enabled.
 */
export function isBlockchainPackagingEnabled(): boolean {
	return FeatureFlags.BLOCKCHAIN_PACKAGING_ENABLED;
}

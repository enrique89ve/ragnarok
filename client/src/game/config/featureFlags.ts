/**
 * featureFlags.ts
 *
 * Feature flags to control game features.
 * Driven by Vite env vars at build time (VITE_DATA_LAYER_MODE, VITE_BLOCKCHAIN_PACKAGING).
 * Defaults to safe local/off values when env vars are not set.
 */

export type DataLayerMode = 'local' | 'test' | 'hive';

function resolveDataLayerMode(): DataLayerMode {
	const raw = import.meta.env.VITE_DATA_LAYER_MODE as string | undefined;
	if (raw === 'hive' || raw === 'test' || raw === 'local') return raw;
	return 'local';
}

function resolveBlockchainPackaging(): boolean {
	const raw = import.meta.env.VITE_BLOCKCHAIN_PACKAGING as string | undefined;
	return raw === 'true' || raw === '1';
}

export const FeatureFlags = {
	DATA_LAYER_MODE: resolveDataLayerMode(),
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

/**
 * Checks if blockchain packaging is enabled.
 */
export function isBlockchainPackagingEnabled(): boolean {
	return FeatureFlags.BLOCKCHAIN_PACKAGING_ENABLED;
}

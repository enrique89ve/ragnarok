/**
 * featureFlags.ts
 *
 * Feature flags to control game features.
 * Driven by VITE_NETWORK_STAGE. The normal runtime path is:
 *   local   -> local data, no blockchain packaging
 *   testnet -> Hive data, blockchain packaging
 *   mainnet -> Hive data, blockchain packaging
 *
 * VITE_DATA_LAYER_MODE and VITE_BLOCKCHAIN_PACKAGING remain as explicit
 * test/debug overrides, not as the everyday configuration surface.
 * Defaults to safe local/off values when env vars are not set.
 */

import {
	isRagnarokNetworkStage,
	type RagnarokNetworkStage,
	type RagnarokRuntimeExecutionMode,
} from '@shared/runtimeConfig';

export type DataLayerMode = 'local' | 'test' | 'hive';
export type NetworkStage = RagnarokNetworkStage;
export type RuntimeExecutionMode = RagnarokRuntimeExecutionMode;

function resolveNetworkStage(): NetworkStage {
	const raw = import.meta.env.VITE_NETWORK_STAGE as string | undefined;
	if (isRagnarokNetworkStage(raw)) return raw;
	return 'local';
}

function getDefaultDataLayerMode(stage: NetworkStage): DataLayerMode {
	return stage === 'local' ? 'local' : 'hive';
}

function resolveDataLayerMode(stage: NetworkStage): DataLayerMode {
	const raw = import.meta.env.VITE_DATA_LAYER_MODE as string | undefined;
	if (raw === 'hive' || raw === 'test' || raw === 'local') return raw;
	return getDefaultDataLayerMode(stage);
}

function resolveBlockchainPackaging(stage: NetworkStage): boolean {
	const raw = import.meta.env.VITE_BLOCKCHAIN_PACKAGING as string | undefined;
	if (raw === 'true' || raw === '1') return true;
	if (raw === 'false' || raw === '0') return false;
	return stage !== 'local';
}

function resolveBooleanEnv(value: unknown, fallback: boolean): boolean {
	return value === 'true' || value === '1' ? true : value === 'false' || value === '0' ? false : fallback;
}

const NETWORK_STAGE = resolveNetworkStage();

export const FeatureFlags = {
	DATA_LAYER_MODE: resolveDataLayerMode(NETWORK_STAGE),
	NETWORK_STAGE,
	BATTLE_HISTORY_ENABLED: true,
	BATTLE_HISTORY_MAX_SIZE: 5,
	DATA_LAYER_DEBUG: false,
	BLOCKCHAIN_PACKAGING_ENABLED: resolveBlockchainPackaging(NETWORK_STAGE),
	P2P_WEBRTC_ENABLED: resolveBooleanEnv(import.meta.env.VITE_P2P_WEBRTC_ENABLED, false),
	P2P_WS_FALLBACK_ENABLED: resolveBooleanEnv(import.meta.env.VITE_P2P_WS_FALLBACK_ENABLED, true),
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

export function isP2PWebRTCEnabled(): boolean {
	return FeatureFlags.P2P_WEBRTC_ENABLED;
}

export function isP2PWebSocketFallbackEnabled(): boolean {
	return FeatureFlags.P2P_WS_FALLBACK_ENABLED;
}

/**
 * Local/dev mode: the full card catalog can be used for gameplay simulation,
 * but catalog access is not economic ownership.
 */
export function isLocalDevMode(): boolean {
	return isLocalStage();
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
	if (isMainnetStage()) return 'mainnet';
	if (isTestnetStage()) return 'testnet';
	return 'local-dev';
}

/**
 * Checks if blockchain packaging is enabled.
 */
export function isBlockchainPackagingEnabled(): boolean {
	return FeatureFlags.BLOCKCHAIN_PACKAGING_ENABLED;
}

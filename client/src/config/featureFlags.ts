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
	isTestMode,
	isLocalMode,
	isBattleHistoryEnabled,
	getDataLayerMode,
	isBlockchainPackagingEnabled,
} from '../game/config/featureFlags';

export type { DataLayerMode, FeatureFlagsType } from '../game/config/featureFlags';

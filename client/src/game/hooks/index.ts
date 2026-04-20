/**
 * Game Hooks - Adapter Layer for Store Migration
 * 
 * These hooks bridge old stores to new unified stores.
 * Components should import from here during migration.
 */

export { MIGRATION_FLAGS, isMigrationEnabled } from './useAdapterConfig';
export { useTargetingAdapter, type TargetingAdapter } from './useTargetingAdapter';
export { useAnimationAdapter, fireAnnouncementAdapter, type AnimationAdapter } from './useAnimationAdapter';
export { useGamePhaseAdapter, type GamePhaseAdapter, type LegacyScreen } from './useGamePhaseAdapter';
export { useEventAnimationBridge } from './useEventAnimationBridge';

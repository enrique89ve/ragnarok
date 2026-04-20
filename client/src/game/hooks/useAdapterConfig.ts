/**
 * Migration Feature Flags
 * 
 * Controls which stores components use during migration.
 * Set to true to use new unified stores, false for legacy stores.
 */

export const MIGRATION_FLAGS = {
  USE_GAME_FLOW_STORE: true,
  USE_UNIFIED_COMBAT_STORE: true,
} as const;

export function isMigrationEnabled(flag: keyof typeof MIGRATION_FLAGS): boolean {
  return MIGRATION_FLAGS[flag];
}

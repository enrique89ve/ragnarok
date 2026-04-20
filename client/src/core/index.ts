/**
 * Core Game Module
 *
 * This module contains the pure game logic separated from React components.
 * During migration, this re-exports from existing locations.
 *
 * Future structure:
 * - engine/   - Game engine, card resolver, combat system
 * - entities/ - Domain entities (Card, Hero, Player)
 * - effects/  - Effect system and handlers
 */

// Re-export game utilities (will be moved to engine/)
export * from '../game/utils/gameUtils';
export * from '../game/utils/cards/cardUtils';

// Re-export types (will be moved to entities/)
export type {
        CardData,
        CardInstance,
        GameState,
        Player,
        MinionCardData,
        SpellCardData,
        WeaponCardData,
        HeroCardData,
} from '../game/types';

// Re-export activity types for event logging
export type {
        ActivityCategory,
        ActivityEventType,
        ActivityEvent,
        ActivityLogState,
} from '../game/types/ActivityTypes';
export { EVENT_CATEGORY_MAP } from '../game/types/ActivityTypes';

// Re-export effect registry (will be moved to effects/)
export * from '../game/effects/EffectRegistry';

/**
 * Public API for the game schemas package.
 *
 * Layout:
 *   manifest    — PROTOCOL_VERSION + COLLECTION_NAME (control center)
 *   primitives/ — canonical enums, branded ids, adapters
 *   card        — Card schema (composes primitives)            [pending]
 *   asset       — Asset schema (file existence + provenance)   [pending]
 */
export * from './manifest';
export * from './primitives';

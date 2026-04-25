/**
 * Game manifest — single control center for versioning.
 *
 * The game has ONE NFT collection ("Genesis"), sealed once at the Genesis
 * ceremony (see docs/GENESIS_RUNBOOK.md). After sealing, no more NFTs are minted.
 *
 * Versioning therefore tracks gameplay rules only, not card inventory.
 */

/**
 * Gameplay protocol version.
 *
 * Semantic versioning, where the categories are:
 *   - major: changes that break replay determinism (combat resolver, target system,
 *            element interaction, mana mechanics, etc.). Old replays no longer
 *            reproduce on the new engine.
 *   - minor: backwards-compatible additions (new keyword, new effect type, new
 *            card to the registry). Old replays still reproduce identically.
 *   - patch: bugfix to an incorrectly-implemented rule. Replays may diverge from
 *            the buggy past, but the new behavior is the canonical one.
 *
 * Each match records the protocol version it was played under so replays can be
 * routed to the appropriate engine code path (or refused as incompatible).
 */
export const PROTOCOL_VERSION = '1.0.0' as const;

/**
 * The single canonical NFT collection name. Used by:
 *  - on-chain mint payload metadata
 *  - UI collection viewer ("My Genesis Cards")
 *  - drop tables for pack opening
 *
 * If the collection is ever renamed, this constant is the only place to change it.
 */
export const COLLECTION_NAME = 'Genesis' as const;
export type CollectionName = typeof COLLECTION_NAME;

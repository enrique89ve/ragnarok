/**
 * Ragnarok Data Layer - Main Export
 * 
 * BLUEPRINT STATUS: Foundation built, awaiting Hive integration.
 * 
 * On-chain (Hive) - 5 Core Items:
 * 1. User records & profiles
 * 2. Player stats (Elo, wins, losses)
 * 3. Match results (verifiable)
 * 4. Card/NFT ownership
 * 5. Token balances (RUNE, VALKYRIE, SEASON_POINTS)
 * 
 * Off-chain (Local):
 * - Combat state & animations
 * - UI preferences
 * - Deck drafts
 * - Session data
 * 
 * Future Extensions (add when needed):
 * - Card rentals/delegations
 * - Marketplace listings
 * - Quests/tournaments
 */

export * from './schemas/HiveTypes';
export * from './schemas/LocalTypes';

export { useHiveDataStore, generateMatchId, generateCardUid } from './HiveDataLayer';

export { HiveSync, hiveSync, type HiveBroadcastResult } from './HiveSync';

export { hiveEvents, type HiveEvent, type HiveEventType } from './HiveEvents';

// Blockchain exports removed — game code should import via getNFTBridge()
// Direct blockchain imports only allowed in: HiveNFTBridge.ts, HiveKeychainLogin.tsx, BlockchainSubscriber.ts

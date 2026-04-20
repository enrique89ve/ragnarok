/**
 * Decentralized Index — Barrel Exports
 *
 * Single import point for all index functionality:
 *   import { syncIndex, getTop100, getPlayerProfile } from '../data/indexer';
 */

// Sync service
export { syncIndex, startIndexSync, stopIndexSync, getIndexHealthStatus } from './indexSync';

// IndexedDB operations
export {
	getIndexDB,
	putIndexEntries,
	getOpsByPlayer,
	getOpsByPlayerAction,
	getOpsByBlock,
	putLeaderboard,
	getLeaderboard,
	updateLeaderboardEntry,
	putSupplyCounters,
	getSupplyCounter,
	getSyncMeta,
	putSyncMeta,
	applyOptimisticElo,
	clearAllIndexData,
} from './indexDB';

// Query API
export {
	getTop100,
	getPlayerRank,
	getMatchHistory,
	getPlayerCards,
	getCardSupply,
	getAllSupplyCounters,
	getPlayerProfile,
	applyOptimisticMatchResult,
	getIndexStatus,
} from './indexQueries';

// Re-export types
export type {
	MatchRecord,
	CardOwnership,
	PlayerProfile,
	IndexStatus,
} from './indexQueries';

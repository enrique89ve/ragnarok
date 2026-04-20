/**
 * Decentralized Indexer — Shared Type Definitions
 *
 * Used by both the operator binary and game client.
 * See docs/DECENTRALIZED_INDEXER_DESIGN.md for full architecture.
 */

import type { CanonicalAction } from './protocol-core/types';

// ============================================================
// Constants
// ============================================================

export const INDEXER_VERSION = 1;
export const RAGNAROK_INDEX_ACCOUNT = 'ragnarok-index';
export const RAGNAROK_APP_IDS = ['ragnarok-cards', 'ragnarok_level_up'] as const;
export const RAGNAROK_LEGACY_PREFIX = 'rp_';

export const CHUNK_SIZE_BLOCKS = 10_000;
export const COMPACTION_AGE_BLOCKS = 864_000; // ~30 days at 3s/block
export const POLL_INTERVAL_MS = 10_000;
export const BLOCKS_PER_BATCH = 50;
export const OPERATOR_HEARTBEAT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
export const MIN_OPERATORS_FOR_CONSENSUS = 3;
export const STATE_CONFIRMATION_QUORUM = 0.6;
export const PROTOCOL_CHANGE_QUORUM = 0.8;
export const OPERATOR_REVENUE_SHARE = 0.05; // 5% of pack sale revenue
export const PUBLISHER_FAILOVER_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

// IPFS gateway fallbacks (public, free)
export const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://dweb.link/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
] as const;

// ============================================================
// Index Entry — one per ragnarok-cards op on chain
// ============================================================

export interface IndexEntry {
	player: string;
	counterparty?: string;
	action: CanonicalAction | 'legacy_pack_open';
	trxId: string;
	blockNum: number;
	opIndexInBlock: number;
	timestamp: number;
	derived?: DerivedState;
}

export interface DerivedState {
	eloAfter?: number;
	cardId?: number;
	cardUid?: string;
	winner?: string;
	loser?: string;
	supplyAfter?: number;
	runeChange?: number;
}

// ============================================================
// Index Manifest — root document pointing to chunks + snapshots
// ============================================================

export interface IndexManifest {
	version: typeof INDEXER_VERSION;
	lastBlock: number;
	lastBlockTimestamp: number;
	totalOps: number;
	chunks: ChunkDescriptor[];
	compacted?: ChunkDescriptor[];
	snapshots: {
		leaderboard: string;
		supply: string;
		genesis: string;
	};
	attestations: OperatorAttestation[];
	publisher: string;
	publisherRotation: string[];
	transcriptCIDs?: string[];
}

export interface ChunkDescriptor {
	file: string;
	blockRange: [number, number];
	opCount: number;
	sha256: string;
}

// ============================================================
// Operator Types
// ============================================================

export interface OperatorAttestation {
	operator: string;
	stateHash: string;
	signature: string;
	block: number;
	timestamp: number;
}

export interface OperatorInfo {
	account: string;
	registeredAt: number;
	lastAttestation: number;
	status: 'active' | 'stale' | 'inactive';
	isGenesisSigner: boolean;
}

// ============================================================
// Snapshot Types — pre-computed for instant client queries
// ============================================================

export interface LeaderboardEntry {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	rank: number;
}

export interface LeaderboardSnapshot {
	updatedAtBlock: number;
	timestamp: number;
	entries: LeaderboardEntry[];
}

export interface SupplySnapshot {
	updatedAtBlock: number;
	timestamp: number;
	counters: Record<string, { pool: string; cap: number; minted: number }>;
}

export interface GenesisSnapshot {
	sealed: boolean;
	sealBlock: number;
	packSupply: Record<string, number>;
	rewardSupply: Record<string, number>;
}

// ============================================================
// CID Publication — on-chain pointer to latest index
// ============================================================

export interface IndexUpdateOp {
	action: 'index_update';
	cid: string;
	block: number;
	stateHash: string;
	attestations: number;
}

export interface IndexAttestationOp {
	action: 'index_attestation';
	stateHash: string;
	block: number;
}

// ============================================================
// Client Sync State — stored in IndexedDB
// ============================================================

export interface IndexSyncMeta {
	key: string;
	value: string | number;
}

// ============================================================
// Degraded Mode
// ============================================================

export type IndexHealthStatus =
	| 'healthy'        // 3+ operators, consensus verified
	| 'degraded'       // <3 operators, using unverified index
	| 'snapshot-only'   // No operators, using bundled snapshot
	| 'offline';        // No index available, personal scan only

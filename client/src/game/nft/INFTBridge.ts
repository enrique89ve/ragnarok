/**
 * INFTBridge — Contract interface between game domain and NFT domain.
 *
 * Every game file that needs NFT/blockchain functionality imports this interface
 * (via getNFTBridge()) instead of importing HiveSync, HiveEvents, or HiveDataLayer directly.
 *
 * Two implementations:
 *   LocalNFTBridge  — localStorage only, no chain ops (local/test mode)
 *   HiveNFTBridge   — delegates to HiveSync, HiveEvents, replayEngine (hive mode)
 */

import type {
	HiveCardAsset,
	HivePlayerStats,
	HiveTokenBalance,
} from '@/data/schemas/HiveTypes';
import type { PackAsset } from '../../../../shared/protocol-core/types';

export type DataLayerMode = 'local' | 'test' | 'hive';

export interface BroadcastResult {
	success: boolean;
	trxId?: string;
	blockNum?: number;
	error?: string;
}

export interface AuthBody {
	username: string;
	timestamp: number;
	signature?: string;
	[key: string]: unknown;
}

export type NFTEventType =
	| 'card:transferred'
	| 'token:updated'
	| 'transaction:confirmed'
	| 'transaction:failed';

export type NFTEventCallback = (event: {
	type: NFTEventType;
	payload: unknown;
	timestamp: number;
}) => void;

export interface INFTBridge {
	// ── Mode ──
	readonly mode: DataLayerMode;
	isHiveMode(): boolean;
	isBlockchainPackagingEnabled(): boolean;

	// ── Identity ──
	getUsername(): string | null;
	isLoggedIn(): boolean;

	// ── Collection ──
	getCardCollection(): HiveCardAsset[];
	getOwnedCopies(cardId: number): number;
	addCard(card: HiveCardAsset): void;
	removeCard(cardUid: string): void;

	// ── Stats ──
	getStats(): HivePlayerStats | null;
	getElo(): number;
	updateStats(partial: Partial<HivePlayerStats>): void;

	// ── Tokens ──
	getTokenBalance(): HiveTokenBalance | null;
	updateTokenBalance(partial: Partial<HiveTokenBalance>): void;

	// ── Auth ──
	buildAuthBody(
		username: string,
		action: string,
		fields?: Record<string, unknown>,
	): Promise<AuthBody>;

	// ── Packs (v1.1) ──
	getPackCollection(): PackAsset[];
	addPack(pack: PackAsset): void;
	removePack(packUid: string): void;

	// ── Transactions ──
	claimReward(rewardId: string): Promise<BroadcastResult>;
	transferCard(cardUid: string, toUser: string, memo?: string): Promise<BroadcastResult>;
	transferCards(cardUids: string[], toUser: string, memo?: string): Promise<BroadcastResult>;
	openPack(packType: string, quantity?: number): Promise<BroadcastResult>;
	signResultHash(hash: string): Promise<string>;

	// ── Pack Transactions (v1.1) ──
	transferPack(packUid: string, toUser: string, memo?: string): Promise<BroadcastResult>;
	burnPack(packUid: string, salt: string): Promise<BroadcastResult>;

	// ── DNA Lineage (v1.1) ──
	replicateCard(sourceUid: string, foil?: 'standard' | 'gold'): Promise<BroadcastResult>;
	mergeCards(sourceUids: [string, string]): Promise<BroadcastResult>;

	// ── Events ──
	onEvent(type: NFTEventType | '*', callback: NFTEventCallback): () => void;
	emitCardTransferred(cardUid: string, from: string, to: string): void;
	emitTokenUpdate(token: string, amount: number, change: number): void;
	emitTransactionConfirmed(trxId: string): void;
	emitTransactionFailed(errorMessage: string): void;

	// ── Lifecycle ──
	login(username: string): Promise<BroadcastResult>;
	logout(): void;
	startSync(username: string): void;
	stopSync(): void;
}

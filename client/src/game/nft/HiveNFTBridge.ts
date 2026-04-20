/**
 * HiveNFTBridge — Hive blockchain implementation of INFTBridge.
 *
 * Delegates to the existing HiveSync, HiveEvents, and HiveDataLayer modules.
 * This is the ONE file in game/ that is allowed to import from data/blockchain/.
 * All 18 previously scattered blockchain imports consolidate here.
 */

import type { HiveCardAsset, HivePlayerStats, HiveTokenBalance } from '@/data/schemas/HiveTypes';
import { DEFAULT_PLAYER_STATS } from '@/data/schemas/HiveTypes';
import type { PackAsset } from '../../../../shared/protocol-core/types';
import { hiveSync, buildHiveAuthBody } from '@/data/HiveSync';
import { hiveEvents } from '@/data/HiveEvents';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import { isBlockchainPackagingEnabled as checkPackaging } from '@/game/config/featureFlags';
import type {
	INFTBridge,
	DataLayerMode,
	BroadcastResult,
	AuthBody,
	NFTEventType,
	NFTEventCallback,
} from './INFTBridge';

export class HiveNFTBridge implements INFTBridge {
	readonly mode: DataLayerMode = 'hive';

	isHiveMode(): boolean {
		return true;
	}

	isBlockchainPackagingEnabled(): boolean {
		return checkPackaging();
	}

	// ── Identity ──

	getUsername(): string | null {
		return useHiveDataStore.getState().user?.hiveUsername ?? null;
	}

	isLoggedIn(): boolean {
		return !!useHiveDataStore.getState().user;
	}

	// ── Collection ──

	getCardCollection(): HiveCardAsset[] {
		return useHiveDataStore.getState().cardCollection;
	}

	getOwnedCopies(cardId: number): number {
		const collection = useHiveDataStore.getState().cardCollection;
		return collection.filter(c => c.cardId === cardId).length;
	}

	addCard(card: HiveCardAsset): void {
		useHiveDataStore.getState().addCard(card);
	}

	removeCard(cardUid: string): void {
		useHiveDataStore.getState().removeCard(cardUid);
	}

	// ── Stats ──

	getStats(): HivePlayerStats | null {
		return useHiveDataStore.getState().stats;
	}

	getElo(): number {
		return useHiveDataStore.getState().stats?.odinsEloRating ?? DEFAULT_PLAYER_STATS.odinsEloRating;
	}

	updateStats(partial: Partial<HivePlayerStats>): void {
		useHiveDataStore.getState().updateStats(partial);
	}

	// ── Tokens ──

	getTokenBalance(): HiveTokenBalance | null {
		return useHiveDataStore.getState().tokenBalance;
	}

	updateTokenBalance(partial: Partial<HiveTokenBalance>): void {
		useHiveDataStore.getState().updateTokenBalance(partial);
	}

	// ── Auth ──

	async buildAuthBody(
		username: string,
		action: string,
		fields: Record<string, unknown> = {},
	): Promise<AuthBody> {
		const result = await buildHiveAuthBody(username, action, fields);
		return result as AuthBody;
	}

	// ── Packs (v1.1) ──

	getPackCollection(): PackAsset[] {
		return useHiveDataStore.getState().packCollection ?? [];
	}

	addPack(pack: PackAsset): void {
		useHiveDataStore.getState().addPack(pack);
	}

	removePack(packUid: string): void {
		useHiveDataStore.getState().removePack(packUid);
	}

	// ── Transactions ──

	async claimReward(rewardId: string): Promise<BroadcastResult> {
		return hiveSync.claimReward(rewardId);
	}

	async transferCard(cardUid: string, toUser: string, memo?: string): Promise<BroadcastResult> {
		return hiveSync.transferCard(cardUid, toUser, memo);
	}

	async transferCards(cardUids: string[], toUser: string, memo?: string): Promise<BroadcastResult> {
		return hiveSync.transferCards(cardUids, toUser, memo);
	}

	async openPack(packType: string, quantity: number = 1): Promise<BroadcastResult> {
		return hiveSync.openPack(packType, quantity);
	}

	async signResultHash(hash: string): Promise<string> {
		return hiveSync.signResultHash(hash);
	}

	// ── Pack Transactions (v1.1) ──

	async transferPack(packUid: string, toUser: string, memo?: string): Promise<BroadcastResult> {
		return hiveSync.transferPack(packUid, toUser, memo);
	}

	async burnPack(packUid: string, salt: string): Promise<BroadcastResult> {
		return hiveSync.burnPack(packUid, salt);
	}

	// ── DNA Lineage (v1.1) ──

	async replicateCard(sourceUid: string, foil?: 'standard' | 'gold'): Promise<BroadcastResult> {
		return hiveSync.replicateCard(sourceUid, foil);
	}

	async mergeCards(sourceUids: [string, string]): Promise<BroadcastResult> {
		return hiveSync.mergeCards(sourceUids);
	}

	// ── Events ──

	onEvent(type: NFTEventType | '*', callback: NFTEventCallback): () => void {
		const hiveType = type as string;
		return hiveEvents.on(hiveType as any, (event) => {
			callback({
				type: event.type as NFTEventType,
				payload: event.payload,
				timestamp: event.timestamp,
			});
		});
	}

	emitCardTransferred(cardUid: string, from: string, to: string): void {
		hiveEvents.emitCardTransferred(cardUid, from, to);
	}

	emitTokenUpdate(token: string, amount: number, change: number): void {
		hiveEvents.emitTokenUpdate(token, amount, change);
	}

	emitTransactionConfirmed(trxId: string): void {
		hiveEvents.emitTransactionConfirmed({ trxId, status: 'confirmed' });
	}

	emitTransactionFailed(errorMessage: string): void {
		hiveEvents.emitTransactionFailed({ status: 'failed', errorMessage });
	}

	// ── Lifecycle ──

	async login(username: string): Promise<BroadcastResult> {
		return hiveSync.login(username);
	}

	logout(): void {
		useHiveDataStore.getState().logout();
	}

	startSync(username: string): void {
		Promise.all([
			import('@/game/runtime/cardDataRuntime'),
			import('@/data/blockchain/replayEngine'),
		]).then(async ([{ ensureCardDataRuntime }, { startSync }]) => {
			await ensureCardDataRuntime();
			startSync(username);
		});
	}

	stopSync(): void {
		import('@/data/blockchain/replayEngine').then(({ stopSync }) => {
			stopSync();
		});
	}
}

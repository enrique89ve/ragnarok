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
import { buildHiveAuthBody, loginWithHiveWallet } from '@/data/HiveAuth';
import { hiveSync } from '@/data/HiveSync';
import { hiveEvents } from '@/data/HiveEvents';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import { getCurrentHiveUsername } from '@/data/HiveSessionIdentity';
import { isBlockchainPackagingEnabled as checkPackaging } from '@/game/config/featureFlags';
import { STARTER_ENTITLEMENT } from '@shared/schemas/starterEntitlement';
import { getQaFullCatalogOwnedCopies } from '../protocol/qaFullCatalogEntitlement';
import type {
	INFTBridge,
	DataLayerMode,
	BroadcastResult,
	AuthBody,
	NFTEventType,
	NFTEventCallback,
	TokenKind,
	CampaignResultBroadcastPayload,
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
		return getCurrentHiveUsername();
	}

	isLoggedIn(): boolean {
		return getCurrentHiveUsername() !== null;
	}

	// ── Collection ──

	getCardCollection(): HiveCardAsset[] {
		return useHiveDataStore.getState().cardCollection;
	}

	getOwnedCopies(cardId: number): number {
		// Honest sum: real NFT instances + universal starter entitlement + phase-scoped QA access.
		// No Math.max hack — the entitlement rule is a dataset lookup, not a synthesized minimum.
		const collection = useHiveDataStore.getState().cardCollection;
		const chainCopies = collection.filter(c => c.cardId === cardId).length;
		const entitledCopies = STARTER_ENTITLEMENT.copiesPerCardId[cardId] ?? 0;
		const qaCopies = getQaFullCatalogOwnedCopies(cardId);
		return chainCopies + entitledCopies + qaCopies;
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

	async claimDailyQuest(ymdUtc: string, slot: number, questType: string): Promise<BroadcastResult> {
		return hiveSync.claimDailyQuest(ymdUtc, slot, questType);
	}

	async submitCampaignResult(payload: CampaignResultBroadcastPayload): Promise<BroadcastResult> {
		return hiveSync.submitCampaignResult(payload);
	}

	async transferCard(cardUid: string, toUser: string, memo?: string): Promise<BroadcastResult> {
		return hiveSync.transferCard(cardUid, toUser, memo);
	}

	async transferCards(cardUids: string[], toUser: string, memo?: string): Promise<BroadcastResult> {
		return hiveSync.transferCards(cardUids, toUser, memo);
	}

	async openPack(_packType: string, _quantity: number = 1): Promise<BroadcastResult> {
		return {
			success: false,
			error: 'Legacy pack open is disabled. Use rune_exchange to create sealed packs, then burnPack from the vault.',
		};
	}

	async runeExchange(packType: string, quantity: number = 1): Promise<BroadcastResult> {
		return hiveSync.runeExchange(packType, quantity);
	}

	async purchasePackHbd(
		packType: string,
		quantity: number,
		totalPriceThousandths: number,
	): Promise<BroadcastResult> {
		return hiveSync.purchasePackHbd(packType, quantity, totalPriceThousandths);
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

	onEvent(type: NFTEventType, callback: NFTEventCallback): () => void {
		return hiveEvents.on(type, (event) => {
			callback({
				type,
				payload: event.payload,
				timestamp: event.timestamp,
			});
		});
	}

	emitCardTransferred(cardUid: string, from: string, to: string): void {
		hiveEvents.emitCardTransferred(cardUid, from, to);
	}

	emitTokenUpdate(token: TokenKind, amount: number, change: number): void {
		hiveEvents.emitTokenUpdate(token, amount, change);
	}

	emitTransactionConfirmed(trxId: string): void {
		hiveEvents.emitTransactionConfirmed({ trxId });
	}

	emitTransactionFailed(errorMessage: string): void {
		hiveEvents.emitTransactionFailed({ errorMessage });
	}

	// ── Lifecycle ──

	async login(username: string): Promise<BroadcastResult> {
		return loginWithHiveWallet(username);
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

/**
 * LocalNFTBridge — No-blockchain implementation of INFTBridge.
 *
 * Used in local/test mode. All collection/stats/tokens delegate to
 * the existing useHiveDataStore Zustand store (persists to localStorage).
 * Local-only gameplay operations return success no-ops. Hive wallet
 * transactions are rejected here so local/dev mode cannot open Keychain by
 * accident.
 * Events are silently swallowed.
 */

import type { HiveCardAsset, HivePlayerStats, HiveTokenBalance } from '@/data/schemas/HiveTypes';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import { DEFAULT_PLAYER_STATS } from '@/data/schemas/HiveTypes';
import { getCurrentHiveUsername } from '@/data/HiveSessionIdentity';
import type { PackAsset } from '../../../../shared/protocol-core/types';
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

const SUCCESS: BroadcastResult = { success: true };

export class LocalNFTBridge implements INFTBridge {
	readonly mode: DataLayerMode = 'local';

	isHiveMode(): boolean {
		return false;
	}

	isBlockchainPackagingEnabled(): boolean {
		return false;
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

	getOwnedCopies(_cardId: number): number {
		return Infinity;
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
		_action: string,
		fields: Record<string, unknown> = {},
	): Promise<AuthBody> {
		return { ...fields, username, timestamp: Date.now() };
	}

	// ── Packs (v1.1 — local mode: empty collection) ──

	getPackCollection(): PackAsset[] {
		return useHiveDataStore.getState().packCollection ?? [];
	}

	addPack(pack: PackAsset): void {
		useHiveDataStore.getState().addPack(pack);
	}

	removePack(packUid: string): void {
		useHiveDataStore.getState().removePack(packUid);
	}

	// ── Transactions (no-ops) ──

	async claimReward(_rewardId: string): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async claimDailyQuest(_slot: number, _questType: string): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async submitCampaignResult(_payload: CampaignResultBroadcastPayload): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async transferCard(_cardUid: string, _toUser: string, _memo?: string): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async transferCards(_cardUids: string[], _toUser: string, _memo?: string): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async openPack(_packType: string, _quantity?: number): Promise<BroadcastResult> {
		return {
			success: false,
			error: 'Legacy local pack opening is disabled. Use sealed pack burn from the vault.',
		};
	}

	async runeExchange(packType: string, quantity: number = 1): Promise<BroadcastResult> {
		void packType;
		void quantity;
		return { success: false, error: 'RUNE exchange requires Hive mode.' };
	}

	async purchasePackHbd(
		packType: string,
		quantity: number,
		totalPriceThousandths: number,
	): Promise<BroadcastResult> {
		void packType;
		void quantity;
		void totalPriceThousandths;
		return { success: false, error: 'HBD pack purchase requires Hive mode.' };
	}

	async signResultHash(_hash: string): Promise<string> {
		return 'local-mode-no-signature';
	}

	// ── Pack Transactions (v1.1 no-ops) ──

	async transferPack(_packUid: string, _toUser: string, _memo?: string): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async burnPack(packUid: string, _salt: string): Promise<BroadcastResult> {
		// In local mode there is no chain to mint canonical cards. The ceremony
		// flow still wants a trxId for sealed-pack derivation, so provide a
		// deterministic synthetic one derived from the pack uid.
		return {
			success: true,
			trxId: `local-burn-${packUid}`,
			blockNum: 0,
		};
	}

	// ── DNA Lineage (v1.1 no-ops) ──

	async replicateCard(_sourceUid: string, _foil?: 'standard' | 'gold'): Promise<BroadcastResult> {
		return SUCCESS;
	}

	async mergeCards(_sourceUids: [string, string]): Promise<BroadcastResult> {
		return SUCCESS;
	}

	// ── Events (no-ops) ──

	onEvent(_type: NFTEventType, _callback: NFTEventCallback): () => void {
		return () => {};
	}

	emitCardTransferred(_cardUid: string, _from: string, _to: string): void {}
	emitTokenUpdate(_token: TokenKind, _amount: number, _change: number): void {}
	emitTransactionConfirmed(_trxId: string): void {}
	emitTransactionFailed(_errorMessage: string): void {}

	// ── Lifecycle ──

	async login(_username: string): Promise<BroadcastResult> {
		return SUCCESS;
	}

	logout(): void {
		useHiveDataStore.getState().logout();
	}

	startSync(_username: string): void {}
	stopSync(): void {}
}

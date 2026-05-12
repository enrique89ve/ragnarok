/**
 * replayDB.ts - IndexedDB layer for Hive chain replay
 *
 * Every player runs this as their local light indexer (HAF replacement).
 * The replay engine reads Hive L1 custom_json ops, applies deterministic
 * rules (replayRules.ts), and writes results here. All game state is
 * derived from the chain — no server, no trust assumptions.
 *
 * Object stores:
 *   cards            keyed by uid              — HiveCardAsset NFT records
 *   matches          keyed by matchId          — HiveMatchResult rows (indexed by participant)
 *   sync_cursors     keyed by account          — replay progress per account (lastHistoryIndex, lastSyncedAt)
 *   token_balances   keyed by hiveUsername     — RUNE/VALKYRIE/SEASON_POINTS per account
 *   genesis_state    keyed by 'singleton'      — sealed flag, supply caps, reader hash, genesis block
 *   supply_counters  keyed by rarity|card:ID   — minted count vs cap (per-rarity AND per-card)
 *   match_anchors    keyed by matchId          — dual-sig match_start records (24h TTL)
 *   queue_entries    keyed by account          — active matchmaking queue entries (10min TTL)
 *   slashed_accounts keyed by account          — accounts with confirmed slash evidence
 *   player_nonces    keyed by account          — monotonic anti-replay nonces for match_result
 *   elo_ratings      keyed by account          — chain-derived ELO (K=32), wins, losses
 *   pending_slashes  keyed by evidenceKey      — queued slash evidence awaiting RPC verification
 *   reward_claims    keyed by claimKey          — tracks which milestone rewards each account claimed
 *   campaign_runs    keyed by localRunId        — local campaign run drafts/results awaiting publication
 *   campaign_nonces  keyed by account           — monotonic anti-replay nonces for campaign_result
 *   campaign_submissions keyed by submissionKey — verifier inbox; not final campaign state
 *   campaign_progress keyed by progressKey      — verified final campaign mission progress
 *   rune_ledger      keyed by entryId           — season/source-key RUNE credits and spends
 *   eitr_ledger      keyed by entryId           — season/source-key Eitr credits, debits, refunds (ADR 0001)
 *
 * All writes are idempotent — safe to re-apply the same op.
 * DB version 14 — upgrade handler creates any missing stores.
 */

import type { HiveCardAsset, HiveMatchResult, HiveTokenBalance } from '../schemas/HiveTypes';
import { DEFAULT_TOKEN_BALANCE } from '../schemas/HiveTypes';
import { DEFAULT_ELO_RATING } from './hiveConfig';
import type {
	CampaignProgressRecord,
	CampaignSubmissionRecord,
	CampaignDifficulty,
	RuneLedgerEntry,
	RuneLedgerEntryQuery,
	RuneLedgerTotalQuery,
	EitrLedgerEntry,
	EitrLedgerEntryQuery,
	EitrLedgerTotalQuery,
} from '../../../../shared/protocol-core/types';

const DB_NAME = 'ragnarok-chain-v1';
const DB_VERSION = 14;

let _db: IDBDatabase | null = null;

export interface SyncCursor {
	account: string;
	lastHistoryIndex: number; // highest Hive account-history index processed
	lastSyncedAt: number;     // unix ms
}

// Stored match includes a flat participants array for multiEntry index queries
interface StoredMatch extends HiveMatchResult {
	participants: [string, string];
}

// ---------------------------------------------------------------------------
// DB open / upgrade
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
	if (_db) return Promise.resolve(_db);

	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);

		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;

			if (!db.objectStoreNames.contains('cards')) {
				const cards = db.createObjectStore('cards', { keyPath: 'uid' });
				cards.createIndex('by_owner', 'ownerId', { unique: false });
			}

			if (!db.objectStoreNames.contains('matches')) {
				const matches = db.createObjectStore('matches', { keyPath: 'matchId' });
				// multiEntry index so each participant name is a separate index entry
				matches.createIndex('by_participant', 'participants', {
					unique: false,
					multiEntry: true,
				});
			}

			if (!db.objectStoreNames.contains('sync_cursors')) {
				db.createObjectStore('sync_cursors', { keyPath: 'account' });
			}

			if (!db.objectStoreNames.contains('token_balances')) {
				db.createObjectStore('token_balances', { keyPath: 'hiveUsername' });
			}

			if (!db.objectStoreNames.contains('genesis_state')) {
				db.createObjectStore('genesis_state', { keyPath: 'key' });
			}

			if (!db.objectStoreNames.contains('supply_counters')) {
				db.createObjectStore('supply_counters', { keyPath: 'rarity' });
			}

			if (!db.objectStoreNames.contains('match_anchors')) {
				db.createObjectStore('match_anchors', { keyPath: 'matchId' });
			}

			if (!db.objectStoreNames.contains('queue_entries')) {
				db.createObjectStore('queue_entries', { keyPath: 'account' });
			}

			if (!db.objectStoreNames.contains('slashed_accounts')) {
				db.createObjectStore('slashed_accounts', { keyPath: 'account' });
			}

			if (!db.objectStoreNames.contains('player_nonces')) {
				db.createObjectStore('player_nonces', { keyPath: 'account' });
			}

			if (!db.objectStoreNames.contains('elo_ratings')) {
				db.createObjectStore('elo_ratings', { keyPath: 'account' });
			}

			if (!db.objectStoreNames.contains('pending_slashes')) {
				db.createObjectStore('pending_slashes', { keyPath: 'evidenceKey' });
			}

			if (!db.objectStoreNames.contains('reward_claims')) {
				db.createObjectStore('reward_claims', { keyPath: 'claimKey' });
			}

			if (!db.objectStoreNames.contains('campaign_nonces')) {
				db.createObjectStore('campaign_nonces', { keyPath: 'account' });
			}
			if (!db.objectStoreNames.contains('campaign_runs')) {
				const runs = db.createObjectStore('campaign_runs', { keyPath: 'localRunId' });
				runs.createIndex('by_account', 'account', { unique: false });
				runs.createIndex('by_mission', 'missionId', { unique: false });
				runs.createIndex('by_status', 'status', { unique: false });
			}
			if (!db.objectStoreNames.contains('campaign_submissions')) {
				const submissions = db.createObjectStore('campaign_submissions', { keyPath: 'submissionKey' });
				submissions.createIndex('by_account', 'account', { unique: false });
				submissions.createIndex('by_mission', 'missionId', { unique: false });
			}
			if (!db.objectStoreNames.contains('campaign_progress')) {
				const progress = db.createObjectStore('campaign_progress', { keyPath: 'progressKey' });
				progress.createIndex('by_account', 'account', { unique: false });
				progress.createIndex('by_mission', 'missionId', { unique: false });
			}
			if (!db.objectStoreNames.contains('rune_ledger')) {
				const ledger = db.createObjectStore('rune_ledger', { keyPath: 'entryId' });
				ledger.createIndex('by_account', 'account', { unique: false });
				ledger.createIndex('by_source_type', 'sourceType', { unique: false });
			}

			// v14: Eitr ledger (canonical per docs/adr/0001-eitr-v1-canonical.md)
			if (!db.objectStoreNames.contains('eitr_ledger')) {
				const eitr = db.createObjectStore('eitr_ledger', { keyPath: 'entryId' });
				eitr.createIndex('by_account', 'account', { unique: false });
				eitr.createIndex('by_source_type', 'sourceType', { unique: false });
			}

			// v1.1: Pack NFTs
			if (!db.objectStoreNames.contains('packs')) {
				const packs = db.createObjectStore('packs', { keyPath: 'uid' });
				packs.createIndex('by_owner', 'owner', { unique: false });
				packs.createIndex('by_sealed', 'sealed', { unique: false });
			}
			if (!db.objectStoreNames.contains('pack_supply')) {
				db.createObjectStore('pack_supply', { keyPath: 'packType' });
			}

			// v1.2: DUAT Airdrop claims
			if (!db.objectStoreNames.contains('duat_claims')) {
				db.createObjectStore('duat_claims', { keyPath: 'account' });
			}

			// v1.2: Marketplace
			if (!db.objectStoreNames.contains('market_listings')) {
				const listings = db.createObjectStore('market_listings', { keyPath: 'listingId' });
				listings.createIndex('by_seller', 'seller', { unique: false });
				listings.createIndex('by_nft_uid', 'nftUid', { unique: false });
			}
			if (!db.objectStoreNames.contains('market_offers')) {
				const offers = db.createObjectStore('market_offers', { keyPath: 'offerId' });
				offers.createIndex('by_nft_uid', 'nftUid', { unique: false });
				offers.createIndex('by_buyer', 'buyer', { unique: false });
			}
		};

		req.onsuccess = () => {
			_db = req.result;
			resolve(_db);
		};

		req.onerror = () => reject(req.error);
	});
}

// ---------------------------------------------------------------------------
// Generic IDB promise helpers
// ---------------------------------------------------------------------------

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const req = db.transaction(store, 'readonly').objectStore(store).get(key);
				req.onsuccess = () => resolve(req.result as T | undefined);
				req.onerror = () => reject(req.error);
			}),
	);
}

function idbPut(store: string, value: unknown): Promise<void> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const req = db.transaction(store, 'readwrite').objectStore(store).put(value);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			}),
	);
}

function idbDelete(store: string, key: string): Promise<void> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			}),
	);
}

function idbGetByIndex<T>(store: string, indexName: string, key: string): Promise<T[]> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const results: T[] = [];
				const req = db
					.transaction(store, 'readonly')
					.objectStore(store)
					.index(indexName)
					.openCursor(IDBKeyRange.only(key));

				req.onsuccess = (e) => {
					const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						results.push(cursor.value as T);
						cursor.continue();
					} else {
						resolve(results);
					}
				};

				req.onerror = () => reject(req.error);
			}),
	);
}

function idbGetAll<T>(store: string): Promise<T[]> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const req = db.transaction(store, 'readonly').objectStore(store).getAll();
				req.onsuccess = () => resolve(req.result as T[]);
				req.onerror = () => reject(req.error);
			}),
	);
}

// ---------------------------------------------------------------------------
// Cards API
// ---------------------------------------------------------------------------

export const getCard = (uid: string): Promise<HiveCardAsset | undefined> =>
	idbGet<HiveCardAsset>('cards', uid);

export const putCard = (card: HiveCardAsset): Promise<void> =>
	idbPut('cards', card);

export const deleteCard = (uid: string): Promise<void> =>
	idbDelete('cards', uid);

export const getCardsByOwner = (ownerId: string): Promise<HiveCardAsset[]> =>
	idbGetByIndex<HiveCardAsset>('cards', 'by_owner', ownerId);

// ---------------------------------------------------------------------------
// Matches API
// ---------------------------------------------------------------------------

export async function putMatch(match: HiveMatchResult): Promise<void> {
	const stored: StoredMatch = {
		...match,
		participants: [match.player1.hiveUsername, match.player2.hiveUsername],
	};
	return idbPut('matches', stored);
}

export async function getMatchesByAccount(username: string): Promise<HiveMatchResult[]> {
	const stored = await idbGetByIndex<StoredMatch>('matches', 'by_participant', username);
	return stored
		.sort((a, b) => b.timestamp - a.timestamp)
		.map(({ participants: _p, ...match }) => match as HiveMatchResult);
}

// ---------------------------------------------------------------------------
// Sync cursor API
// ---------------------------------------------------------------------------

export const getSyncCursor = (account: string): Promise<SyncCursor | undefined> =>
	idbGet<SyncCursor>('sync_cursors', account);

export const putSyncCursor = (cursor: SyncCursor): Promise<void> =>
	idbPut('sync_cursors', cursor);

// ---------------------------------------------------------------------------
// Token Balances API
// ---------------------------------------------------------------------------

export async function getTokenBalance(username: string): Promise<HiveTokenBalance> {
	const stored = await idbGet<HiveTokenBalance>('token_balances', username);
	return stored ?? { ...DEFAULT_TOKEN_BALANCE, hiveUsername: username };
}

export const putTokenBalance = (balance: HiveTokenBalance): Promise<void> =>
	idbPut('token_balances', balance);

export async function getRuneBalanceTotal(): Promise<number> {
	const balances = await idbGetAll<HiveTokenBalance>('token_balances');
	return balances.reduce((total, balance) => total + balance.RUNE, 0);
}

// ---------------------------------------------------------------------------
// RUNE Ledger API
// ---------------------------------------------------------------------------

export const getRuneLedgerEntry = (entryId: string): Promise<RuneLedgerEntry | undefined> =>
	idbGet<RuneLedgerEntry>('rune_ledger', entryId);

export const putRuneLedgerEntry = (entry: RuneLedgerEntry): Promise<void> =>
	idbPut('rune_ledger', entry);

export async function getRuneLedgerEntries(query: RuneLedgerEntryQuery): Promise<RuneLedgerEntry[]> {
	const candidates = query.account
		? await idbGetByIndex<RuneLedgerEntry>('rune_ledger', 'by_account', query.account)
		: query.sourceType
			? await idbGetByIndex<RuneLedgerEntry>('rune_ledger', 'by_source_type', query.sourceType)
			: await idbGetAll<RuneLedgerEntry>('rune_ledger');

	return candidates
		.filter(entry => entry.seasonId === query.seasonId)
		.filter(entry => query.direction === undefined || entry.direction === query.direction)
		.filter(entry => query.sourceType === undefined || entry.sourceType === query.sourceType)
		.filter(entry => query.account === undefined || entry.account === query.account)
		.filter(entry => query.sourceKeyPrefix === undefined || entry.sourceKey.startsWith(query.sourceKeyPrefix));
}

export async function getRuneLedgerTotal(query: RuneLedgerTotalQuery): Promise<number> {
	const entries = await getRuneLedgerEntries(query);
	return entries
		.reduce((total, entry) => total + entry.amount, 0);
}

// ---------------------------------------------------------------------------
// Eitr Ledger API (canonical per docs/adr/0001-eitr-v1-canonical.md)
// ---------------------------------------------------------------------------

export const getEitrLedgerEntry = (entryId: string): Promise<EitrLedgerEntry | undefined> =>
	idbGet<EitrLedgerEntry>('eitr_ledger', entryId);

export const putEitrLedgerEntry = (entry: EitrLedgerEntry): Promise<void> =>
	idbPut('eitr_ledger', entry);

export async function getEitrLedgerEntries(query: EitrLedgerEntryQuery): Promise<EitrLedgerEntry[]> {
	const candidates = query.account
		? await idbGetByIndex<EitrLedgerEntry>('eitr_ledger', 'by_account', query.account)
		: query.sourceType
			? await idbGetByIndex<EitrLedgerEntry>('eitr_ledger', 'by_source_type', query.sourceType)
			: await idbGetAll<EitrLedgerEntry>('eitr_ledger');

	return candidates
		.filter(entry => entry.seasonId === query.seasonId)
		.filter(entry => query.direction === undefined || entry.direction === query.direction)
		.filter(entry => query.sourceType === undefined || entry.sourceType === query.sourceType)
		.filter(entry => query.account === undefined || entry.account === query.account)
		.filter(entry => query.sourceKeyPrefix === undefined || entry.sourceKey.startsWith(query.sourceKeyPrefix));
}

export async function getEitrLedgerTotal(query: EitrLedgerTotalQuery): Promise<number> {
	const entries = await getEitrLedgerEntries(query);
	return entries
		.reduce((total, entry) => total + entry.amount, 0);
}

// ---------------------------------------------------------------------------
// Genesis State API
// ---------------------------------------------------------------------------

export interface GenesisState {
	key: 'singleton';
	version: string;
	totalSupply: number;
	cardDistribution: Record<string, number>;
	sealed: boolean;
	sealedAtBlock: number | null;
	readerHash: string;
	genesisBlock: number;
}

const DEFAULT_GENESIS: GenesisState = {
	key: 'singleton',
	version: '',
	totalSupply: 0,
	cardDistribution: {},
	sealed: false,
	sealedAtBlock: null,
	readerHash: '',
	genesisBlock: 0,
};

export async function getGenesisState(): Promise<GenesisState> {
	const stored = await idbGet<GenesisState>('genesis_state', 'singleton');
	return stored ?? { ...DEFAULT_GENESIS };
}

export const putGenesisState = (state: GenesisState): Promise<void> =>
	idbPut('genesis_state', state);

// ---------------------------------------------------------------------------
// Supply Counters API
// ---------------------------------------------------------------------------

export interface SupplyCounter {
	rarity: string;
	cap: number;
	minted: number;
}

export const getSupplyCounter = (rarity: string): Promise<SupplyCounter | undefined> =>
	idbGet<SupplyCounter>('supply_counters', rarity);

export const putSupplyCounter = (counter: SupplyCounter): Promise<void> =>
	idbPut('supply_counters', counter);

// ---------------------------------------------------------------------------
// Match Anchors API
// ---------------------------------------------------------------------------

export interface MatchAnchor {
	matchId: string;
	playerA: string;
	playerB: string;
	matchHash: string;
	anchorBlockA: number | null;
	anchorBlockB: number | null;
	anchorTxA: string | null;
	anchorTxB: string | null;
	dualAnchored: boolean;
	deckHashA: string | null;
	deckHashB: string | null;
	timestamp: number;
}

export const getMatchAnchor = (matchId: string): Promise<MatchAnchor | undefined> =>
	idbGet<MatchAnchor>('match_anchors', matchId);

export const putMatchAnchor = (anchor: MatchAnchor): Promise<void> =>
	idbPut('match_anchors', anchor);

// ---------------------------------------------------------------------------
// Queue Entries API
// ---------------------------------------------------------------------------

export interface QueueEntry {
	account: string;
	mode: string;
	elo: number;
	peerId: string;
	deckHash: string;
	timestamp: number;
	blockNum: number;
}

export const getQueueEntry = (account: string): Promise<QueueEntry | undefined> =>
	idbGet<QueueEntry>('queue_entries', account);

export const putQueueEntry = (entry: QueueEntry): Promise<void> =>
	idbPut('queue_entries', entry);

export const deleteQueueEntry = (account: string): Promise<void> =>
	idbDelete('queue_entries', account);

export function getAllQueueEntries(): Promise<QueueEntry[]> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const results: QueueEntry[] = [];
				const req = db.transaction('queue_entries', 'readonly')
					.objectStore('queue_entries')
					.openCursor();
				req.onsuccess = (e) => {
					const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						results.push(cursor.value as QueueEntry);
						cursor.continue();
					} else {
						resolve(results);
					}
				};
				req.onerror = () => reject(req.error);
			}),
	);
}

// ---------------------------------------------------------------------------
// Slashed Accounts API
// ---------------------------------------------------------------------------

export interface SlashedAccount {
	account: string;
	reason: string;
	evidenceTxA: string;
	evidenceTxB: string;
	slashedAtBlock: number;
	submittedBy: string;
}

export const getSlashedAccount = (account: string): Promise<SlashedAccount | undefined> =>
	idbGet<SlashedAccount>('slashed_accounts', account);

export const putSlashedAccount = (record: SlashedAccount): Promise<void> =>
	idbPut('slashed_accounts', record);

export const isAccountSlashed = async (account: string): Promise<boolean> => {
	const record = await getSlashedAccount(account);
	return record !== undefined;
};

// ---------------------------------------------------------------------------
// Player Nonces API — monotonic nonce per account for match_result anti-replay
// ---------------------------------------------------------------------------

export interface PlayerNonce {
	account: string;
	highestMatchNonce: number; // highest result_nonce seen for this account
}

export async function getPlayerNonce(account: string): Promise<PlayerNonce> {
	const stored = await idbGet<PlayerNonce>('player_nonces', account);
	return stored ?? { account, highestMatchNonce: 0 };
}

export const putPlayerNonce = (record: PlayerNonce): Promise<void> =>
	idbPut('player_nonces', record);

/**
 * Validate and advance nonce atomically. Returns true if the nonce is higher
 * than previously seen (valid), false if it's a replay or duplicate.
 * Uses a single IDB readwrite transaction to prevent race conditions.
 */
export async function advancePlayerNonce(account: string, nonce: number): Promise<boolean> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		let accepted = false;
		const tx = db.transaction('player_nonces', 'readwrite');
		const store = tx.objectStore('player_nonces');
		const getReq = store.get(account);
		getReq.onsuccess = () => {
			const current = (getReq.result as PlayerNonce | undefined) ?? { account, highestMatchNonce: 0 };
			if (nonce <= current.highestMatchNonce) {
				return;
			}
			accepted = true;
			store.put({ account, highestMatchNonce: nonce });
		};
		getReq.onerror = () => reject(getReq.error);
		tx.oncomplete = () => resolve(accepted);
		tx.onerror = () => reject(tx.error);
	});
}

// ---------------------------------------------------------------------------
// ELO Ratings API — chain-derived ELO per account
// ---------------------------------------------------------------------------

export interface EloRating {
	account: string;
	elo: number;
	wins: number;
	losses: number;
	lastMatchBlock: number;
}

export async function getEloRating(account: string): Promise<EloRating> {
	const stored = await idbGet<EloRating>('elo_ratings', account);
	return stored ?? { account, elo: DEFAULT_ELO_RATING, wins: 0, losses: 0, lastMatchBlock: 0 };
}

export const putEloRating = (rating: EloRating): Promise<void> =>
	idbPut('elo_ratings', rating);

// ---------------------------------------------------------------------------
// Pending Slashes API — queued for retry when RPC was unreachable
// ---------------------------------------------------------------------------

export interface PendingSlash {
	evidenceKey: string;
	offender: string;
	reason: string;
	txA: string;
	txB: string;
	submittedBy: string;
	blockNum: number;
	timestamp: number;
	retries: number;
}

export const getPendingSlash = (evidenceKey: string): Promise<PendingSlash | undefined> =>
	idbGet<PendingSlash>('pending_slashes', evidenceKey);

export const putPendingSlash = (slash: PendingSlash): Promise<void> =>
	idbPut('pending_slashes', slash);

export const deletePendingSlash = (evidenceKey: string): Promise<void> =>
	idbDelete('pending_slashes', evidenceKey);

export function getAllPendingSlashes(): Promise<PendingSlash[]> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const results: PendingSlash[] = [];
				const req = db.transaction('pending_slashes', 'readonly')
					.objectStore('pending_slashes')
					.openCursor();
				req.onsuccess = (e) => {
					const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						results.push(cursor.value as PendingSlash);
						cursor.continue();
					} else {
						resolve(results);
					}
				};
				req.onerror = () => reject(req.error);
			}),
	);
}

// ---------------------------------------------------------------------------
// Reward Claims API — tracks which rewards each account has claimed
// ---------------------------------------------------------------------------

export interface RewardClaim {
	claimKey: string; // `${account}:${rewardId}`
	account: string;
	rewardId: string;
	claimedAt: number;
	blockNum: number;
	trxId: string;
}

export const getRewardClaim = (account: string, rewardId: string): Promise<RewardClaim | undefined> =>
	idbGet<RewardClaim>('reward_claims', `${account}:${rewardId}`);

export const putRewardClaim = (claim: RewardClaim): Promise<void> =>
	idbPut('reward_claims', claim);

// ---------------------------------------------------------------------------
// Campaign Run + Submission API — local drafts, verifier inbox, final progress
// ---------------------------------------------------------------------------

export type CampaignRunStatus =
	| 'started'
	| 'won'
	| 'published'
	| 'rejected';

export interface CampaignRunRecord {
	localRunId: string;
	account: string;
	campaignId: string;
	missionId: string;
	difficulty: CampaignDifficulty;
	registryHash: string;
	nonce: number;
	localStartedAt: number;
	status: CampaignRunStatus;
	createdAt: number;
	updatedAt: number;
	matchId?: string;
	matchSeed?: string;
	turnCount?: number;
	transcriptRoot?: string;
	finalStateHash?: string;
	publishedTrxId?: string;
	publishedBlockNum?: number;
	publishedAt?: number;
	lastError?: string;
}

export interface CampaignNonce {
	account: string;
	highestCampaignNonce: number;
}

interface StoredCampaignProgress extends CampaignProgressRecord {
	progressKey: string;
}

export async function advanceCampaignNonce(account: string, nonce: number): Promise<boolean> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		let accepted = false;
		const tx = db.transaction('campaign_nonces', 'readwrite');
		const store = tx.objectStore('campaign_nonces');
		const getReq = store.get(account);
		getReq.onsuccess = () => {
			const current = (getReq.result as CampaignNonce | undefined) ?? {
				account,
				highestCampaignNonce: 0,
			};
			if (nonce <= current.highestCampaignNonce) {
				return;
			}
			accepted = true;
			store.put({ account, highestCampaignNonce: nonce });
		};
		getReq.onerror = () => reject(getReq.error);
		tx.oncomplete = () => resolve(accepted);
		tx.onerror = () => reject(tx.error);
	});
}

export const getCampaignRun = (localRunId: string): Promise<CampaignRunRecord | undefined> =>
	idbGet<CampaignRunRecord>('campaign_runs', localRunId);

export const putCampaignRun = (run: CampaignRunRecord): Promise<void> =>
	idbPut('campaign_runs', run);

export const getCampaignRunsByAccount = (account: string): Promise<CampaignRunRecord[]> =>
	idbGetByIndex<CampaignRunRecord>('campaign_runs', 'by_account', account);

export const getCampaignSubmission = (submissionKey: string): Promise<CampaignSubmissionRecord | undefined> =>
	idbGet<CampaignSubmissionRecord>('campaign_submissions', submissionKey);

export const putCampaignSubmission = (submission: CampaignSubmissionRecord): Promise<void> =>
	idbPut('campaign_submissions', submission);

export const getCampaignProgress = (
	account: string,
	campaignId: string,
	missionId: string,
): Promise<CampaignProgressRecord | undefined> =>
	idbGet<StoredCampaignProgress>('campaign_progress', `${account}:${campaignId}:${missionId}`);

export const putCampaignProgress = (progress: CampaignProgressRecord): Promise<void> =>
	idbPut('campaign_progress', {
		...progress,
		progressKey: `${progress.account}:${progress.campaignId}:${progress.missionId}`,
	});

// ---------------------------------------------------------------------------
// v1.1: Pack NFTs
// ---------------------------------------------------------------------------

export interface StoredPack {
	uid: string;
	packType: string;
	dna: string;
	owner: string;
	sealed: boolean;
	mintTrxId: string;
	mintBlockNum: number;
	lastTransferBlock: number;
	cardCount: number;
	edition: string;
}

export interface StoredPackSupply {
	packType: string;
	minted: number;
	burned: number;
	cap: number;
}

export const getPack = (uid: string): Promise<StoredPack | undefined> =>
	idbGet<StoredPack>('packs', uid);

export const putPack = (pack: StoredPack): Promise<void> =>
	idbPut('packs', pack);

export const deletePack = async (uid: string): Promise<void> => {
	const db = await openDB();
	const tx = db.transaction('packs', 'readwrite');
	tx.objectStore('packs').delete(uid);
};

export async function getPacksByOwner(owner: string): Promise<StoredPack[]> {
	const db = await openDB();
	const tx = db.transaction('packs', 'readonly');
	const idx = tx.objectStore('packs').index('by_owner');
	const req = idx.getAll(owner);
	return new Promise((resolve) => {
		req.onsuccess = () => resolve(req.result || []);
		req.onerror = () => resolve([]);
	});
}

export const getPackSupply = (packType: string): Promise<StoredPackSupply | undefined> =>
	idbGet<StoredPackSupply>('pack_supply', packType);

export const putPackSupply = (supply: StoredPackSupply): Promise<void> =>
	idbPut('pack_supply', supply);

// ---------------------------------------------------------------------------
// v1.2: DUAT Airdrop claims
// ---------------------------------------------------------------------------

export interface StoredDuatClaim {
	account: string;
	duatRaw: number;
	packsEarned: number;
	blockNum: number;
	trxId: string;
}

export const getDuatClaim = (account: string): Promise<StoredDuatClaim | undefined> =>
	idbGet<StoredDuatClaim>('duat_claims', account);

export const putDuatClaim = (claim: StoredDuatClaim): Promise<void> =>
	idbPut('duat_claims', claim);

// ---------------------------------------------------------------------------
// v1.2: Marketplace — listings & offers
// ---------------------------------------------------------------------------

export interface StoredListing {
	listingId: string;
	nftUid: string;
	nftType: 'card' | 'pack';
	seller: string;
	price: number;
	currency: 'HIVE' | 'HBD';
	listedBlock: number;
	listedTrxId: string;
	active: boolean;
}

export interface StoredOffer {
	offerId: string;
	nftUid: string;
	buyer: string;
	price: number;
	currency: 'HIVE' | 'HBD';
	offeredBlock: number;
	offeredTrxId: string;
	status: 'pending' | 'accepted' | 'rejected' | 'expired';
	paymentTrxId?: string;
}

export const getListing = (listingId: string): Promise<StoredListing | undefined> =>
	idbGet<StoredListing>('market_listings', listingId);

export const putListing = (listing: StoredListing): Promise<void> =>
	idbPut('market_listings', listing);

export const deleteListing = async (listingId: string): Promise<void> => {
	const db = await openDB();
	const tx = db.transaction('market_listings', 'readwrite');
	tx.objectStore('market_listings').delete(listingId);
};

export async function getListingByNftUid(nftUid: string): Promise<StoredListing | undefined> {
	const db = await openDB();
	const tx = db.transaction('market_listings', 'readonly');
	const idx = tx.objectStore('market_listings').index('by_nft_uid');
	const req = idx.getAll(nftUid);
	return new Promise((resolve) => {
		req.onsuccess = () => {
			const active = (req.result || []).find((l: StoredListing) => l.active);
			resolve(active);
		};
		req.onerror = () => resolve(undefined);
	});
}

export const getOffer = (offerId: string): Promise<StoredOffer | undefined> =>
	idbGet<StoredOffer>('market_offers', offerId);

export const putOffer = (offer: StoredOffer): Promise<void> =>
	idbPut('market_offers', offer);

export const deleteOffer = async (offerId: string): Promise<void> => {
	const db = await openDB();
	const tx = db.transaction('market_offers', 'readwrite');
	tx.objectStore('market_offers').delete(offerId);
};

export async function getOffersByNftUid(nftUid: string): Promise<StoredOffer[]> {
	const db = await openDB();
	const tx = db.transaction('market_offers', 'readonly');
	const idx = tx.objectStore('market_offers').index('by_nft_uid');
	const req = idx.getAll(nftUid);
	return new Promise((resolve) => {
		req.onsuccess = () => resolve(req.result || []);
		req.onerror = () => resolve([]);
	});
}

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
 *   forge_commits    keyed by trxId             — forge commit-reveal records (ADR 0001 §3)
 *
 * All writes are idempotent — safe to re-apply the same op.
 * DB version 21 — upgrade handler creates any missing stores; v21 adds corrupt_records.
 */

import type { HiveCardAsset, HiveMatchResult, HiveTokenBalance } from '../schemas/HiveTypes';
import { createManagedIndexedDB } from '../../lib/storage/idbLifecycle';
import { calculateSeasonScore } from '@shared/protocol-core/runeEconomy';
import { projectEloMatch } from '@shared/protocol-core/eloEconomy';
import {
	corruptRecordId,
	parseEitrLedgerEntry,
	parseEloRating,
	parseHiveCardAsset,
	parseRuneLedgerEntry,
	parseSyncCursor,
	parseTokenBalance,
	parseLocalSettlementRecord,
	parseLocalCampaignSettlement,
	type CorruptRecordRow,
} from './replayDBValidation';
import type { MigrationDecision } from '@shared/protocolPhaseMigration';
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
	ForgeCommitRecord,
} from '../../../../shared/protocol-core/types';
import type {
	LocalSettlementCommitResult,
	LocalSettlementRecord,
} from '../../../../shared/protocol-core/localSettlement';
import type { LocalCampaignSettlementEnvelope } from '../../../../shared/protocol-core/localCampaignSettlement';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import { getEitrForgeCost } from '@shared/protocol-core/eitrEconomy';
import { prepareForgeWrite, type ForgeMutation } from '@shared/protocol-core/forgeMutation';
import type { OpResult } from '@shared/protocol-core/types';
import { getProtocolPhaseId, getRagnarokRuntimePhase } from '@shared/runtimeConfig';
import { createRuntimeDatabaseName, getRagnarokNetworkConfig } from '../../game/config/networkConfig';

const replayRuntime = getRagnarokNetworkConfig();
const replayPhase = getProtocolPhaseId(getRagnarokRuntimePhase(replayRuntime));
const DB_NAME = createRuntimeDatabaseName(replayPhase === 'local-gameplay-v1'
	? 'chain-v1'
	: `chain-v1-campaign-proof-${replayRuntime.legacyCampaignResultLastBlock ?? 0}`);
const DB_VERSION = 21;
const CORRUPT_RECORDS_STORE = 'corrupt_records';
const LOCAL_CAMPAIGN_EITR_STORE = 'local_campaign_eitr';
const NORSE_FINALE_EITR = { missionId: 'norse-9', amount: 40 } as const;

function installReplayDbStores(db: IDBDatabase, upgradeTransaction: IDBTransaction | null): void {
	if (!db.objectStoreNames.contains('phase_migrations')) db.createObjectStore('phase_migrations', { keyPath: 'migrationId' });

	if (!db.objectStoreNames.contains('cards')) {
		const cards = db.createObjectStore('cards', { keyPath: 'uid' });
		cards.createIndex('by_owner', 'ownerId', { unique: false });
	}

	if (!db.objectStoreNames.contains('matches')) {
		const matches = db.createObjectStore('matches', { keyPath: 'matchId' });
		matches.createIndex('by_participant', 'participants', {
			unique: false,
			multiEntry: true,
		});
	}

	const settlements = db.objectStoreNames.contains('local_settlements')
		? upgradeTransaction!.objectStore('local_settlements')
		: db.createObjectStore('local_settlements', { keyPath: 'eventId' });
	if (!settlements.indexNames.contains('by_match_id')) settlements.createIndex('by_match_id', 'matchId', { unique: false });
	if (!settlements.indexNames.contains('by_reset_epoch')) settlements.createIndex('by_reset_epoch', 'resetEpoch', { unique: false });
	if (!settlements.indexNames.contains('by_account')) settlements.createIndex('by_account', 'participants', { unique: false, multiEntry: true });
	const localCards = db.objectStoreNames.contains('local_card_progression')
		? upgradeTransaction!.objectStore('local_card_progression')
		: db.createObjectStore('local_card_progression', { keyPath: 'updateId' });
	if (!localCards.indexNames.contains('by_uid')) localCards.createIndex('by_uid', 'uid', { unique: false });
	if (!localCards.indexNames.contains('by_event_id')) localCards.createIndex('by_event_id', 'eventId', { unique: false });
	if (!localCards.indexNames.contains('by_owner_account')) localCards.createIndex('by_owner_account', 'ownerAccount', { unique: false });
	const localLevelUps = db.objectStoreNames.contains('local_level_ups')
		? upgradeTransaction!.objectStore('local_level_ups')
		: db.createObjectStore('local_level_ups', { keyPath: 'levelUpId' });
	if (!localLevelUps.indexNames.contains('by_event_id')) localLevelUps.createIndex('by_event_id', 'eventId', { unique: false });
	const localCampaigns = db.objectStoreNames.contains('local_campaign_settlements')
		? upgradeTransaction!.objectStore('local_campaign_settlements')
		: db.createObjectStore('local_campaign_settlements', { keyPath: 'eventId' });
	if (!localCampaigns.indexNames.contains('by_account_mission')) localCampaigns.createIndex('by_account_mission', 'account', { unique: false });
	if (!localCampaigns.indexNames.contains('by_account')) localCampaigns.createIndex('by_account', 'account', { unique: false });
	if (!db.objectStoreNames.contains('local_campaign_first_clears')) db.createObjectStore('local_campaign_first_clears', { keyPath: 'key' });
	if (!db.objectStoreNames.contains(LOCAL_CAMPAIGN_EITR_STORE)) db.createObjectStore(LOCAL_CAMPAIGN_EITR_STORE);

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

	if (!db.objectStoreNames.contains('eitr_ledger')) {
		const eitr = db.createObjectStore('eitr_ledger', { keyPath: 'entryId' });
		eitr.createIndex('by_account', 'account', { unique: false });
		eitr.createIndex('by_source_type', 'sourceType', { unique: false });
	}

	if (!db.objectStoreNames.contains('forge_commits')) {
		const forge = db.createObjectStore('forge_commits', { keyPath: 'trxId' });
		forge.createIndex('by_account', 'account', { unique: false });
		forge.createIndex('by_revealed', 'revealed', { unique: false });
	}

	if (!db.objectStoreNames.contains('packs')) {
		const packs = db.createObjectStore('packs', { keyPath: 'uid' });
		packs.createIndex('by_owner', 'owner', { unique: false });
		packs.createIndex('by_sealed', 'sealed', { unique: false });
	}
	if (!db.objectStoreNames.contains('pack_supply')) {
		db.createObjectStore('pack_supply', { keyPath: 'packType' });
	}

	if (!db.objectStoreNames.contains('duat_claims')) {
		db.createObjectStore('duat_claims', { keyPath: 'account' });
	}

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

	if (!db.objectStoreNames.contains(CORRUPT_RECORDS_STORE)) {
		const corrupt = db.createObjectStore(CORRUPT_RECORDS_STORE, { keyPath: 'id' });
		corrupt.createIndex('by_store', 'storeName', { unique: false });
	}
}

const replayIdb = createManagedIndexedDB({
	name: DB_NAME,
	version: DB_VERSION,
	onUpgrade: (db, event) => {
		const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction;
		installReplayDbStores(db, upgradeTransaction);
	},
});

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
	return replayIdb.open();
}

// ---------------------------------------------------------------------------
// Generic IDB promise helpers
// ---------------------------------------------------------------------------

function idbGetRaw(store: string, key: string): Promise<unknown> {
	return openDB().then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction(store, 'readonly');
				const req = tx.objectStore(store).get(key);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			}),
	);
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
	return idbGetRaw(store, key).then((result) => result as T | undefined);
}

function idbPut(store: string, value: unknown): Promise<void> {
	return replayIdb.runWriteTransaction(store, (tx) => {
		tx.objectStore(store).put(value);
	});
}

function idbDelete(store: string, key: string): Promise<void> {
	return replayIdb.runWriteTransaction(store, (tx) => {
		tx.objectStore(store).delete(key);
	});
}

export async function quarantineCorruptRecord(
	storeName: string,
	key: string,
	raw: unknown,
): Promise<void> {
	const row: CorruptRecordRow = {
		id: corruptRecordId(storeName, key),
		storeName,
		key,
		raw,
		quarantinedAt: Date.now(),
	};
	await replayIdb.runWriteTransaction([CORRUPT_RECORDS_STORE, storeName], (tx) => {
		tx.objectStore(CORRUPT_RECORDS_STORE).put(row);
		tx.objectStore(storeName).delete(key);
	});
}

function scheduleQuarantine(storeName: string, key: string, raw: unknown): void {
	void quarantineCorruptRecord(storeName, key, raw).catch(() => undefined);
}

export async function getCorruptRecords(): Promise<CorruptRecordRow[]> {
	return idbGetAll<CorruptRecordRow>(CORRUPT_RECORDS_STORE);
}

type SeasonRuneBreakdown = {
	readonly p2pRuneEarned: number;
	readonly campaignRuneEarned: number;
	readonly dailyQuestRuneEarned: number;
};

function runeBreakdownForAccount(record: LocalSettlementRecord, account: string): SeasonRuneBreakdown {
	let p2pRuneEarned = 0;
	let campaignRuneEarned = 0;
	let dailyQuestRuneEarned = 0;
	for (const entry of record.runeEntries) {
		if (entry.account !== account || entry.direction !== 'credit') continue;
		if (entry.sourceType === 'p2p_ranked') p2pRuneEarned += entry.amount;
		else if (entry.sourceType === 'campaign_first_clear') campaignRuneEarned += entry.amount;
		else if (entry.sourceType === 'daily_quest_claim') dailyQuestRuneEarned += entry.amount;
	}
	return { p2pRuneEarned, campaignRuneEarned, dailyQuestRuneEarned };
}

function liveEloSnapshot(
	raw: unknown,
	account: string,
	projection: LocalSettlementRecord['elo'][number],
): { elo: number; wins: number; losses: number } {
	const parsed = parseEloRating(raw, account);
	return {
		elo: parsed?.elo ?? projection.eloBefore,
		wins: parsed?.wins ?? projection.winsBefore,
		losses: parsed?.losses ?? projection.lossesBefore,
	};
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

/** Test-only namespace cleanup; closes this module's handle before deletion. */
export function closeReplayDatabaseForTests(): void {
	replayIdb.close();
}

export const closeReplayDBForTests = closeReplayDatabaseForTests;

export function resetReplayDBConnection(): Promise<void> {
	return resetReplayDatabaseForTests();
}

export function resetReplayDatabaseForTests(): Promise<void> {
	closeReplayDatabaseForTests();
	return new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase(DB_NAME);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error(`replay database cleanup blocked: ${DB_NAME}`));
	});
}

// ---------------------------------------------------------------------------
// Cards API
// ---------------------------------------------------------------------------

export async function getCard(uid: string): Promise<HiveCardAsset | undefined> {
	const raw = await idbGetRaw('cards', uid);
	if (raw === undefined) return undefined;
	const parsed = parseHiveCardAsset(raw);
	if (!parsed) {
		scheduleQuarantine('cards', uid, raw);
		return undefined;
	}
	return parsed;
}

export const putCard = (card: HiveCardAsset): Promise<void> =>
	idbPut('cards', card);

export const deleteCard = (uid: string): Promise<void> =>
	idbDelete('cards', uid);

export async function getCardsByOwner(ownerId: string): Promise<HiveCardAsset[]> {
	const rows = await idbGetByIndex<unknown>('cards', 'by_owner', ownerId);
	const cards: HiveCardAsset[] = [];
	for (const row of rows) {
		const parsed = parseHiveCardAsset(row);
		if (parsed) {
			cards.push(parsed);
			continue;
		}
		const uid = (row as { uid?: string })?.uid;
		if (uid) scheduleQuarantine('cards', uid, row);
	}
	return cards;
}

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
// Local gameplay settlement API
// ---------------------------------------------------------------------------

export async function commitLocalSettlement(record: LocalSettlementRecord): Promise<LocalSettlementCommitResult> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		let alreadyApplied = false;
		let conflict: { existingResultHash: string; existingRuntimeFingerprint: string } | null = null;
		const tx = db.transaction([
			'local_settlements', 'rune_ledger', 'elo_ratings', 'local_card_progression', 'local_level_ups',
		], 'readwrite');
		const settlements = tx.objectStore('local_settlements');
		const getRequest = settlements.get(record.eventId);
		getRequest.onsuccess = () => {
			const existing = getRequest.result as LocalSettlementRecord | undefined;
			if (existing) {
				if (
					existing.result.resultHash !== record.result.resultHash
					|| existing.runtimeFingerprint !== record.runtimeFingerprint
				) {
					conflict = {
						existingResultHash: existing.result.resultHash,
						existingRuntimeFingerprint: existing.runtimeFingerprint,
					};
					tx.abort();
					return;
				}
				alreadyApplied = true;
				return;
			}
			const winnerAccount = record.result.winnerAccount;
			const loserAccount = record.result.loserAccount;
			const winnerProj = record.elo.find((row) => row.account === winnerAccount);
			const loserProj = record.elo.find((row) => row.account === loserAccount);
			if (!winnerProj || !loserProj) {
				reject(new Error('local settlement missing elo projections'));
				tx.abort();
				return;
			}

			const eloRatings = tx.objectStore('elo_ratings');
			const winnerReq = eloRatings.get(winnerAccount);
			const loserReq = eloRatings.get(loserAccount);
			let winnerRaw: unknown;
			let loserRaw: unknown;
			let eloReadsDone = 0;

			const finishApply = () => {
				const winnerLive = liveEloSnapshot(winnerRaw, winnerAccount, winnerProj);
				const loserLive = liveEloSnapshot(loserRaw, loserAccount, loserProj);
				const stale = winnerLive.elo !== winnerProj.eloBefore
					|| winnerLive.wins !== winnerProj.winsBefore
					|| winnerLive.losses !== winnerProj.lossesBefore
					|| loserLive.elo !== loserProj.eloBefore
					|| loserLive.wins !== loserProj.winsBefore
					|| loserLive.losses !== loserProj.lossesBefore;

				let winnerAfter = winnerProj.eloAfter;
				let loserAfter = loserProj.eloAfter;
				let winnerWinsAfter = winnerProj.winsAfter;
				let winnerLossesAfter = winnerProj.lossesAfter;
				let loserWinsAfter = loserProj.winsAfter;
				let loserLossesAfter = loserProj.lossesAfter;
				let winnerSeasonScore = winnerProj.seasonScoreAfter;
				let loserSeasonScore = loserProj.seasonScoreAfter;

				if (stale) {
					const eloMatch = projectEloMatch({ winnerElo: winnerLive.elo, loserElo: loserLive.elo });
					winnerAfter = eloMatch.winner.after;
					loserAfter = eloMatch.loser.after;
					winnerWinsAfter = winnerLive.wins + 1;
					winnerLossesAfter = winnerLive.losses;
					loserWinsAfter = loserLive.wins;
					loserLossesAfter = loserLive.losses + 1;
					const winnerRune = runeBreakdownForAccount(record, winnerAccount);
					const loserRune = runeBreakdownForAccount(record, loserAccount);
					winnerSeasonScore = calculateSeasonScore({ finalElo: winnerAfter, ...winnerRune });
					loserSeasonScore = calculateSeasonScore({ finalElo: loserAfter, ...loserRune });
				}

				settlements.put(record);
				const runeLedger = tx.objectStore('rune_ledger');
				for (const entry of record.runeEntries) runeLedger.put(entry);
				eloRatings.put({
					account: winnerAccount,
					elo: winnerAfter,
					wins: winnerWinsAfter,
					losses: winnerLossesAfter,
					lastMatchBlock: 0,
					seasonScore: winnerSeasonScore,
				});
				eloRatings.put({
					account: loserAccount,
					elo: loserAfter,
					wins: loserWinsAfter,
					losses: loserLossesAfter,
					lastMatchBlock: 0,
					seasonScore: loserSeasonScore,
				});
				const cardProgression = tx.objectStore('local_card_progression');
				for (const projection of record.cardXp) {
					cardProgression.put({
						uid: projection.uid,
						ownerAccount: projection.ownerAccount,
						cardId: projection.cardId,
						xp: projection.xpAfter,
						level: projection.levelAfter,
						eventId: record.eventId,
						updateId: projection.updateId,
						timestamp: record.timestamp,
						sequence: `${record.timestamp}:${record.eventId}`,
					});
				}
				const levelUps = tx.objectStore('local_level_ups');
				for (const projection of record.levelUps) {
					levelUps.put({ ...projection, eventId: record.eventId });
				}
			};

			const maybeFinishEloReads = () => {
				eloReadsDone += 1;
				if (eloReadsDone < 2) return;
				finishApply();
			};

			winnerReq.onsuccess = () => {
				winnerRaw = winnerReq.result;
				maybeFinishEloReads();
			};
			loserReq.onsuccess = () => {
				loserRaw = loserReq.result;
				maybeFinishEloReads();
			};
			winnerReq.onerror = () => reject(winnerReq.error);
			loserReq.onerror = () => reject(loserReq.error);
		};
		getRequest.onerror = () => reject(getRequest.error);
		tx.oncomplete = () => resolve(alreadyApplied ? 'already_applied' : 'applied');
		tx.onerror = () => {
			if (!conflict) reject(tx.error);
		};
		tx.onabort = () => {
			if (conflict) {
				resolve({
					status: 'conflict',
					existingResultHash: conflict.existingResultHash,
					existingRuntimeFingerprint: conflict.existingRuntimeFingerprint,
				});
				return;
			}
			reject(tx.error ?? new Error('local settlement transaction aborted'));
		};
	});
}

export async function getLocalSettlementsByAccount(account: string): Promise<LocalSettlementRecord[]> {
	const rows = await idbGetByIndex<unknown>('local_settlements', 'by_account', account);
	const valid: LocalSettlementRecord[] = [];
	for (const row of rows) {
		const parsed = parseLocalSettlementRecord(row);
		if (parsed) {
			valid.push(parsed);
			continue;
		}
		const key = (row as { eventId?: string })?.eventId;
		if (key) scheduleQuarantine('local_settlements', key, row);
	}
	return valid;
}

export type LocalCardProgressionRecord = {
	readonly updateId: string;
	readonly uid: string;
	readonly ownerAccount: string;
	readonly cardId: number;
	readonly xp: number;
	readonly level: number;
	readonly eventId: string;
	readonly timestamp: number;
	readonly sequence: string;
};

export const getLocalCardProgressionByOwner = (ownerAccount: string): Promise<LocalCardProgressionRecord[]> =>
	idbGetByIndex<LocalCardProgressionRecord>('local_card_progression', 'by_owner_account', ownerAccount);

export type LocalCampaignSettlementRecord = LocalCampaignSettlementEnvelope;

export type LocalCampaignCommitResult = { readonly status: 'applied' | 'already_applied' | 'conflict'; readonly record: LocalCampaignSettlementRecord; readonly eitrAwarded: number };

export type LocalCampaignEitr = {
	readonly balance: number;
	readonly forgedCardId: number | null;
};

function localCampaignEitrKey(account: string, seasonId: string): string {
	return `${seasonId}:${account}`;
}

export function getLocalCampaignEitr(account: string, seasonId: string): Promise<LocalCampaignEitr | undefined> {
	return idbGet<LocalCampaignEitr>(LOCAL_CAMPAIGN_EITR_STORE, localCampaignEitrKey(account, seasonId));
}

export async function forgeLocalCampaignCommon(account: string, seasonId: string, cardId: number): Promise<LocalCampaignEitr | undefined> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(LOCAL_CAMPAIGN_EITR_STORE, 'readwrite');
		const store = tx.objectStore(LOCAL_CAMPAIGN_EITR_STORE);
		const key = localCampaignEitrKey(account, seasonId);
		const request = store.get(key);
		const cost = getEitrForgeCost('common');
		let result: LocalCampaignEitr | undefined;
		request.onsuccess = () => {
			const current: LocalCampaignEitr | undefined = request.result;
			result = current;
			if (!current || current.forgedCardId !== null || current.balance < cost) return;
			result = { balance: current.balance - cost, forgedCardId: cardId };
			store.put(result, key);
		};
		tx.oncomplete = () => resolve(result);
		tx.onabort = () => reject(tx.error ?? new Error('Local Forge transaction aborted'));
	});
}

export async function getLocalCampaignSettlementsByAccount(account: string): Promise<LocalCampaignSettlementRecord[]> {
	const rows = await idbGetByIndex<unknown>('local_campaign_settlements', 'by_account', account);
	return filterValidatedLocalCampaignSettlementRows(rows);
}

function filterValidatedLocalCampaignSettlementRows(rows: unknown[]): LocalCampaignSettlementRecord[] {
	const valid: LocalCampaignSettlementRecord[] = [];
	for (const row of rows) {
		const parsed = parseLocalCampaignSettlement(row);
		if (parsed) {
			valid.push(parsed);
			continue;
		}
		const key = (row as { eventId?: string })?.eventId;
		if (key) scheduleQuarantine('local_campaign_settlements', key, row);
	}
	return valid;
}

export type LocalLevelUpRecord = {
	readonly levelUpId: string;
	readonly uid: string;
	readonly ownerAccount: string;
	readonly cardId: number;
	readonly newLevel: number;
	readonly eventId: string;
};

export const getLocalLevelUpsByEvent = (eventId: string): Promise<LocalLevelUpRecord[]> =>
	idbGetByIndex<LocalLevelUpRecord>('local_level_ups', 'by_event_id', eventId);

export async function commitLocalCampaignSettlement(record: LocalCampaignSettlementRecord): Promise<LocalCampaignCommitResult> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(['local_campaign_settlements', 'local_campaign_first_clears', 'rune_ledger', 'local_card_progression', 'local_level_ups', LOCAL_CAMPAIGN_EITR_STORE], 'readwrite');
		const campaigns = tx.objectStore('local_campaign_settlements');
		const firstClear = tx.objectStore('local_campaign_first_clears');
		const firstClearRequest = firstClear.get(`${record.account}:${record.missionId}`);
		const eitrStore = tx.objectStore(LOCAL_CAMPAIGN_EITR_STORE);
		const eitrKey = localCampaignEitrKey(record.account, record.seasonId);
		const eitrRequest = record.campaignId === CAMPAIGN_ID && record.missionId === NORSE_FINALE_EITR.missionId
			? eitrStore.get(eitrKey)
			: undefined;
		const existing = campaigns.get(record.eventId);
		let alreadyApplied = false;
		let conflict = false;
		let eitrAwarded = 0;
		let effectiveRecord = record;
		existing.onsuccess = () => {
			if (existing.result) {
				if (existing.result.resultHash !== record.resultHash || existing.result.runtimeFingerprint !== record.runtimeFingerprint) { conflict = true; tx.abort(); return; }
				alreadyApplied = true;
				effectiveRecord = existing.result;
				return;
			}
			if (eitrRequest && eitrRequest.result === undefined) {
				eitrAwarded = NORSE_FINALE_EITR.amount;
				eitrStore.add({ balance: eitrAwarded, forgedCardId: null } satisfies LocalCampaignEitr, eitrKey);
			}
			const priorFirstClear = firstClearRequest.result !== undefined;
			const appliedRecord = priorFirstClear && record.firstClear ? { ...record, firstClear: false, runeAmount: 0, runeEntry: undefined } : record;
				effectiveRecord = appliedRecord;
				campaigns.put(appliedRecord);
				if (record.firstClear && !priorFirstClear) firstClear.put({ key: `${record.account}:${record.missionId}`, eventId: record.eventId });
				if (appliedRecord.runeEntry) tx.objectStore('rune_ledger').put(appliedRecord.runeEntry);
				for (const projection of appliedRecord.cardXp) {
					tx.objectStore('local_card_progression').put({ updateId: projection.updateId, uid: projection.uid, ownerAccount: projection.ownerAccount, cardId: projection.cardId, xp: projection.xpAfter, level: projection.levelAfter, eventId: appliedRecord.eventId, timestamp: appliedRecord.timestamp, sequence: `${appliedRecord.timestamp}:${appliedRecord.eventId}` });
					if (projection.levelUpId) tx.objectStore('local_level_ups').put({ levelUpId: projection.levelUpId, uid: projection.uid, ownerAccount: projection.ownerAccount, cardId: projection.cardId, newLevel: projection.levelAfter, eventId: appliedRecord.eventId });
				}
		};
		existing.onerror = () => reject(existing.error);
		tx.oncomplete = () => resolve({ status: alreadyApplied ? 'already_applied' : 'applied', record: effectiveRecord, eitrAwarded });
		tx.onerror = () => reject(tx.error ?? new Error('local campaign transaction error'));
		tx.onabort = () => conflict ? resolve({ status: 'conflict', record, eitrAwarded: 0 }) : reject(tx.error ?? new Error('local campaign transaction aborted'));
	});
}

export async function hasLocalCampaignFirstClear(account: string, missionId: string): Promise<boolean> {
	const rows = await idbGetByIndex<unknown>('local_campaign_settlements', 'by_account', account);
	const records = filterValidatedLocalCampaignSettlementRows(rows);
	return records.some(record => record.missionId === missionId && record.firstClear);
}

/** Returns one deterministic current snapshot per owner-bound card UID. */
export async function getLatestLocalCardProgressionByOwner(ownerAccount: string): Promise<LocalCardProgressionRecord[]> {
	const records = await getLocalCardProgressionByOwner(ownerAccount);
	const latest = new Map<string, LocalCardProgressionRecord>();
	for (const record of records) {
		const previous = latest.get(record.uid);
		if (!previous || record.timestamp > previous.timestamp ||
			(record.timestamp === previous.timestamp && record.sequence > previous.sequence)) {
			latest.set(record.uid, record);
		}
	}
	return [...latest.values()].sort((a, b) => a.uid.localeCompare(b.uid));
}

// ---------------------------------------------------------------------------
// Sync cursor API
// ---------------------------------------------------------------------------

export async function getSyncCursor(account: string): Promise<SyncCursor | undefined> {
	const raw = await idbGetRaw('sync_cursors', account);
	if (raw === undefined) return undefined;
	const parsed = parseSyncCursor(raw);
	if (!parsed) {
		scheduleQuarantine('sync_cursors', account, raw);
		return undefined;
	}
	return parsed;
}

export const putSyncCursor = (cursor: SyncCursor): Promise<void> =>
	idbPut('sync_cursors', cursor);

// ---------------------------------------------------------------------------
// Token Balances API
// ---------------------------------------------------------------------------
//
// RUNE is a ledger projection (credits − debits for the requested season), not
// a stored scalar. Legacy fields (VALKYRIE, SEASON_POINTS) still hydrate from
// the token_balances store; RUNE always derives from the local rune_ledger.

export async function getTokenBalance(username: string, seasonId: string): Promise<HiveTokenBalance> {
	const raw = await idbGetRaw('token_balances', username);
	const parsed = raw === undefined ? undefined : parseTokenBalance(raw);
	if (raw !== undefined && !parsed) scheduleQuarantine('token_balances', username, raw);
	const base = parsed ?? { ...DEFAULT_TOKEN_BALANCE, hiveUsername: username };
	const credits = await getRuneLedgerTotal({ seasonId, account: username, direction: 'credit' });
	const debits = await getRuneLedgerTotal({ seasonId, account: username, direction: 'debit' });
	return { ...base, RUNE: credits - debits };
}

// ---------------------------------------------------------------------------
// RUNE Ledger API
// ---------------------------------------------------------------------------

export async function getRuneLedgerEntry(entryId: string): Promise<RuneLedgerEntry | undefined> {
	const raw = await idbGetRaw('rune_ledger', entryId);
	if (raw === undefined) return undefined;
	const parsed = parseRuneLedgerEntry(raw);
	if (!parsed) {
		scheduleQuarantine('rune_ledger', entryId, raw);
		return undefined;
	}
	return parsed;
}

export const putRuneLedgerEntry = (entry: RuneLedgerEntry): Promise<void> =>
	idbPut('rune_ledger', entry);

export type LocalDailyLedgerCommitResult = { readonly appliedIds: readonly string[]; readonly alreadyAppliedIds: readonly string[]; readonly conflictingIds: readonly string[] };

function sameRuneLedgerEntry(a: RuneLedgerEntry, b: RuneLedgerEntry): boolean {
	return a.entryId === b.entryId && a.seasonId === b.seasonId && a.account === b.account && a.direction === b.direction
		&& a.sourceType === b.sourceType && a.sourceKey === b.sourceKey && a.amount === b.amount
		&& a.balanceBefore === b.balanceBefore && a.balanceAfter === b.balanceAfter;
}

export async function commitLocalDailyQuestLedger(entries: readonly RuneLedgerEntry[]): Promise<LocalDailyLedgerCommitResult> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(['rune_ledger'], 'readwrite');
		const store = tx.objectStore('rune_ledger');
		const existingIds: string[] = [];
		const missing: RuneLedgerEntry[] = [];
		const conflictingIds: string[] = [];
		let checked = 0;
		for (const entry of entries) {
			const request = store.get(entry.entryId);
			request.onsuccess = () => {
				if (request.result) {
					if (sameRuneLedgerEntry(request.result as RuneLedgerEntry, entry)) existingIds.push(entry.entryId);
					else conflictingIds.push(entry.entryId);
				} else missing.push(entry);
				checked++;
				if (checked === entries.length && missing.length > 0) {
					if (conflictingIds.length === 0) for (const candidate of missing) store.put(candidate);
				}
			};
			request.onerror = () => reject(request.error);
		}
		tx.oncomplete = () => resolve({ appliedIds: conflictingIds.length === 0 ? missing.map(entry => entry.entryId) : [], alreadyAppliedIds: existingIds, conflictingIds });
		tx.onerror = () => reject(tx.error);
	});
}

function filterValidatedRuneLedgerRows(rows: unknown[]): RuneLedgerEntry[] {
	const valid: RuneLedgerEntry[] = [];
	for (const row of rows) {
		const parsed = parseRuneLedgerEntry(row);
		if (parsed) {
			valid.push(parsed);
			continue;
		}
		const key = (row as { entryId?: string })?.entryId;
		if (key) scheduleQuarantine('rune_ledger', key, row);
	}
	return valid;
}

export async function getRuneLedgerEntries(query: RuneLedgerEntryQuery): Promise<RuneLedgerEntry[]> {
	const candidates = query.account
		? await idbGetByIndex<unknown>('rune_ledger', 'by_account', query.account)
		: query.sourceType
			? await idbGetByIndex<unknown>('rune_ledger', 'by_source_type', query.sourceType)
			: await idbGetAll<unknown>('rune_ledger');

	return filterValidatedRuneLedgerRows(candidates)
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

export async function getEitrLedgerEntry(entryId: string): Promise<EitrLedgerEntry | undefined> {
	const raw = await idbGetRaw('eitr_ledger', entryId);
	if (raw === undefined) return undefined;
	const parsed = parseEitrLedgerEntry(raw);
	if (!parsed) {
		scheduleQuarantine('eitr_ledger', entryId, raw);
		return undefined;
	}
	return parsed;
}

export const putEitrLedgerEntry = (entry: EitrLedgerEntry): Promise<void> =>
	idbPut('eitr_ledger', entry);

function filterValidatedEitrLedgerRows(rows: unknown[]): EitrLedgerEntry[] {
	const valid: EitrLedgerEntry[] = [];
	for (const row of rows) {
		const parsed = parseEitrLedgerEntry(row);
		if (parsed) {
			valid.push(parsed);
			continue;
		}
		const key = (row as { entryId?: string })?.entryId;
		if (key) scheduleQuarantine('eitr_ledger', key, row);
	}
	return valid;
}

export async function getEitrLedgerEntries(query: EitrLedgerEntryQuery): Promise<EitrLedgerEntry[]> {
	const candidates = query.account
		? await idbGetByIndex<unknown>('eitr_ledger', 'by_account', query.account)
		: query.sourceType
			? await idbGetByIndex<unknown>('eitr_ledger', 'by_source_type', query.sourceType)
			: await idbGetAll<unknown>('eitr_ledger');

	return filterValidatedEitrLedgerRows(candidates)
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
// Forge Commits API (ADR 0001 §3 commit-reveal forge)
// ---------------------------------------------------------------------------

export const getForgeCommit = (trxId: string): Promise<ForgeCommitRecord | undefined> =>
	idbGet<ForgeCommitRecord>('forge_commits', trxId);

export const putForgeCommit = (commit: ForgeCommitRecord): Promise<void> =>
	idbPut('forge_commits', commit);

export async function commitForgeMutation(
	mutation: ForgeMutation,
	toHiveCard: (card: Extract<ForgeMutation, { kind: 'mint' }>['card']) => HiveCardAsset,
): Promise<OpResult> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(['forge_commits', 'eitr_ledger', 'cards', 'supply_counters'], 'readwrite');
		const commits = tx.objectStore('forge_commits');
		const ledger = tx.objectStore('eitr_ledger');
		const cards = tx.objectStore('cards');
		const supply = tx.objectStore('supply_counters');
		const current = commits.get(mutation.commit.trxId);
		let result: OpResult = { status: 'ignored' };

		function finish(snapshot: Parameters<typeof prepareForgeWrite>[1]) {
			try {
				const decision = prepareForgeWrite(mutation, snapshot);
				if (decision.status === 'applied') {
					if (decision.entry) ledger.add(decision.entry);
					if (mutation.kind === 'mint') {
						cards.add(toHiveCard(mutation.card));
						for (const counter of mutation.supply) {
							supply.put({ rarity: `${counter.pool}:${counter.key}`, cap: counter.cap, minted: counter.minted });
						}
					}
					commits.put(mutation.commit);
				}
				result = decision.status === 'applied' ? { status: 'applied' } : decision;
			} catch (error) {
				tx.abort();
				reject(error);
			}
		}

		if (mutation.kind === 'mint') {
			const [rarity, card] = mutation.supply;
			const existingCard = cards.getKey(mutation.card.uid);
			const currentRarity = supply.get(`${rarity.pool}:${rarity.key}`);
			const currentCard = supply.get(`${card.pool}:${card.key}`);
			currentCard.onsuccess = () => finish({
				commit: current.result,
				cardExists: existingCard.result !== undefined,
				supply: [currentRarity.result, currentCard.result],
			});
		} else {
			const movement = ledger.getKey(mutation.movement.entryId);
			const account = ledger.index('by_account').getAll(mutation.movement.account);
			account.onsuccess = () => {
				const entries: EitrLedgerEntry[] = account.result;
				const balance = entries.reduce((total, entry) => entry.seasonId === mutation.movement.seasonId
					? total + (entry.direction === 'credit' ? entry.amount : -entry.amount)
					: total, 0);
				finish({ commit: current.result, movementExists: movement.result !== undefined, balance });
			};
		}
		tx.oncomplete = () => resolve(result);
		tx.onabort = () => reject(tx.error ?? new Error('Forge transaction aborted'));
	});
}

export async function getUnrevealedForgeCommitsBefore(deadlineBlock: number): Promise<ForgeCommitRecord[]> {
	const all = await idbGetAll<ForgeCommitRecord>('forge_commits');
	return all.filter(c => !c.revealed && c.commitBlock <= deadlineBlock);
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
	const raw = await idbGetRaw('elo_ratings', account);
	if (raw === undefined) {
		return { account, elo: DEFAULT_ELO_RATING, wins: 0, losses: 0, lastMatchBlock: 0 };
	}
	const parsed = parseEloRating(raw, account);
	if (!parsed) {
		scheduleQuarantine('elo_ratings', account, raw);
		return { account, elo: DEFAULT_ELO_RATING, wins: 0, losses: 0, lastMatchBlock: 0 };
	}
	return parsed;
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
	| 'abandoned'
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

export async function markCampaignRunWon(input: {
	readonly localRunId: string;
	readonly matchId: string;
	readonly matchSeed: string;
	readonly turnCount: number;
	readonly updatedAt?: number;
}): Promise<boolean> {
	const run = await getCampaignRun(input.localRunId);
	if (!run || run.status !== 'started') return false;
	await putCampaignRun({
		...run,
		status: 'won',
		matchId: input.matchId,
		matchSeed: input.matchSeed,
		turnCount: input.turnCount,
		updatedAt: input.updatedAt ?? Date.now(),
	});
	return true;
}

export async function markCampaignRunAbandoned(
	localRunId: string,
	updatedAt = Date.now(),
): Promise<boolean> {
	const run = await getCampaignRun(localRunId);
	if (!run || run.status !== 'started') return false;
	await putCampaignRun({ ...run, status: 'abandoned', updatedAt });
	return true;
}

/**
 * A hard reload destroys the in-memory match. Reconcile its durable draft on
 * the next boot so a stale `started` row cannot look like a live run forever.
 */
export async function abandonStartedCampaignRuns(account: string): Promise<number> {
	const runs = await getCampaignRunsByAccount(account);
	const started = runs.filter(run => run.status === 'started');
	await Promise.all(started.map(run => markCampaignRunAbandoned(run.localRunId)));
	return started.length;
}

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

export type PhaseMigrationRecord = { readonly migrationId: string; readonly projectionHash: string; readonly status: 'ready' | 'applied'; readonly localEconomyPromoted: false; readonly report: Extract<MigrationDecision, { status: 'ready' }> };
export type PhaseMigrationCommit = 'applied' | 'already_applied' | 'conflict';
export async function recordPhaseMigrationDryRun(report: MigrationDecision): Promise<PhaseMigrationCommit> {
	if (report.status !== 'ready') throw new Error(`cannot persist migration ${report.status}`);
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('phase_migrations', 'readwrite'); const store = tx.objectStore('phase_migrations');
		const get = store.get(report.migrationId);
		get.onsuccess = () => {
			if (get.result) { if (get.result.projectionHash !== report.projectionHash) { resolve('conflict'); tx.abort(); } else resolve('already_applied'); return; }
			store.put({ migrationId: report.migrationId, projectionHash: report.projectionHash, status: 'ready', localEconomyPromoted: false, report });
		};
		tx.oncomplete = () => resolve('applied'); tx.onerror = () => reject(tx.error);
	});
}

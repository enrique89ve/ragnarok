/**
 * pgStateAdapter.ts — StateAdapter backed by PostgreSQL
 */

import type { ProtocolRuntimeFingerprint } from '../../shared/protocolPhase';
import { assertProtocolRuntimeFingerprint } from '../../shared/protocolPhaseMigration';
import type {
	StateAdapter,
	CardAsset,
	GenesisRecord,
	MatchAnchorRecord,
	PackCommitRecord,
	SupplyRecord,
	RuneLedgerEntry,
	RuneLedgerEntryQuery,
	RuneLedgerTotalQuery,
	EitrLedgerEntry,
	EitrLedgerEntryQuery,
	EitrLedgerTotalQuery,
	ForgeCommitRecord,
	CampaignSubmissionRecord,
	CampaignProgressRecord,
	PackAsset,
	PackSupplyRecord,
	MarketListing,
	MarketOffer,
	DuatClaimRecord,
	EloRecord,
} from '../../shared/protocol-core/types';
import { db } from '../database';

export type PgQueryExecutor = <T = Record<string, unknown>>(
	text: string,
	params?: unknown[],
) => Promise<T[]>;

async function defaultQuery<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
	if (!db) throw new Error('PostgreSQL not configured');
	const result = await db.query(text, params);
	return result.rows as T[];
}

function supplyMapKey(key: string, pool: 'pack' | 'reward'): string {
	return `${pool}:${key}`;
}

function campaignProgressKey(account: string, campaignId: string, missionId: string): string {
	return `${account}:${campaignId}:${missionId}`;
}

function rewardClaimKey(account: string, rewardId: string): string {
	return `${account}:${rewardId}`;
}

function rowToCard(row: Record<string, unknown>): CardAsset {
	return {
		uid: String(row.uid),
		cardId: Number(row.card_id),
		owner: String(row.owner),
		rarity: String(row.rarity),
		level: Number(row.level ?? 1),
		xp: Number(row.xp ?? 0),
		edition: String(row.edition ?? 'alpha'),
		foil: row.foil != null ? String(row.foil) : undefined,
		mintSource: (row.mint_source ?? 'genesis') as CardAsset['mintSource'],
		mintTrxId: String(row.mint_trx_id ?? ''),
		mintBlockNum: Number(row.mint_block_num ?? 0),
		lastTransferBlock: Number(row.last_transfer_block ?? 0),
		originDna: row.origin_dna != null ? String(row.origin_dna) : undefined,
		instanceDna: row.instance_dna != null ? String(row.instance_dna) : undefined,
		parentInstanceDna: row.parent_instance_dna != null ? String(row.parent_instance_dna) : undefined,
		generation: row.generation != null ? Number(row.generation) : undefined,
		replicaCount: row.replica_count != null ? Number(row.replica_count) : undefined,
		mergedFrom: Array.isArray(row.merged_from) ? row.merged_from.map(String) : undefined,
		acquisition: row.acquisition != null ? row.acquisition as CardAsset['acquisition'] : undefined,
	};
}

function rowToPack(row: Record<string, unknown>): PackAsset {
	return {
		uid: String(row.uid),
		packType: String(row.pack_type),
		dna: String(row.dna),
		owner: String(row.owner),
		sealed: Boolean(row.sealed),
		mintTrxId: String(row.mint_trx_id ?? ''),
		mintBlockNum: Number(row.mint_block_num ?? 0),
		lastTransferBlock: Number(row.last_transfer_block ?? 0),
		cardCount: Number(row.card_count ?? 5),
		edition: String(row.edition ?? 'alpha'),
		acquisition: row.acquisition != null ? row.acquisition as PackAsset['acquisition'] : undefined,
	};
}

function rowToMatchAnchor(row: Record<string, unknown>): MatchAnchorRecord {
	return {
		matchId: String(row.match_id),
		playerA: String(row.player_a),
		playerB: String(row.player_b),
		pubkeyA: row.pubkey_a != null ? String(row.pubkey_a) : undefined,
		pubkeyB: row.pubkey_b != null ? String(row.pubkey_b) : undefined,
		deckHashA: row.deck_hash_a != null ? String(row.deck_hash_a) : undefined,
		deckHashB: row.deck_hash_b != null ? String(row.deck_hash_b) : undefined,
		engineHash: row.engine_hash != null ? String(row.engine_hash) : undefined,
		cardRegistryHash: row.card_registry_hash != null ? String(row.card_registry_hash) : undefined,
		dualAnchored: Boolean(row.dual_anchored),
		timestamp: Number(row.timestamp),
	};
}

function rowToPackCommit(row: Record<string, unknown>): PackCommitRecord {
	return {
		trxId: String(row.trx_id),
		account: String(row.account),
		packType: String(row.pack_type),
		quantity: Number(row.quantity),
		saltCommit: String(row.salt_commit),
		commitBlock: Number(row.commit_block),
		revealed: Boolean(row.revealed),
	};
}

function rowToForgeCommit(row: Record<string, unknown>): ForgeCommitRecord {
	return {
		trxId: String(row.trx_id),
		account: String(row.account),
		rarity: String(row.rarity),
		saltCommit: String(row.salt_commit),
		commitBlock: Number(row.commit_block),
		debitAmount: Number(row.debit_amount),
		revealed: Boolean(row.revealed),
		seasonId: row.season_id != null ? String(row.season_id) : undefined,
	};
}

function rowToRuneLedger(row: Record<string, unknown>): RuneLedgerEntry {
	return {
		entryId: String(row.entry_id),
		seasonId: String(row.season_id),
		account: String(row.account),
		direction: row.direction as RuneLedgerEntry['direction'],
		sourceType: row.source_type as RuneLedgerEntry['sourceType'],
		sourceKey: String(row.source_key),
		amount: Number(row.amount),
		balanceBefore: Number(row.balance_before),
		balanceAfter: Number(row.balance_after),
		trxId: String(row.trx_id ?? ''),
		blockNum: Number(row.block_num ?? 0),
		timestamp: Number(row.timestamp ?? 0),
	};
}

function rowToEitrLedger(row: Record<string, unknown>): EitrLedgerEntry {
	return {
		entryId: String(row.entry_id),
		seasonId: String(row.season_id),
		account: String(row.account),
		direction: row.direction as EitrLedgerEntry['direction'],
		sourceType: row.source_type as EitrLedgerEntry['sourceType'],
		sourceKey: String(row.source_key),
		amount: Number(row.amount),
		balanceBefore: Number(row.balance_before),
		balanceAfter: Number(row.balance_after),
		trxId: String(row.trx_id ?? ''),
		blockNum: Number(row.block_num ?? 0),
		timestamp: Number(row.timestamp ?? 0),
	};
}

function rowToListing(row: Record<string, unknown>): MarketListing {
	return {
		listingId: String(row.listing_id),
		nftUid: String(row.nft_uid),
		nftType: row.nft_type as MarketListing['nftType'],
		seller: String(row.seller),
		price: Number(row.price),
		currency: row.currency as MarketListing['currency'],
		listedBlock: Number(row.listed_block ?? 0),
		listedTrxId: String(row.listed_trx_id ?? ''),
		active: Boolean(row.active),
	};
}

function rowToOffer(row: Record<string, unknown>): MarketOffer {
	return {
		offerId: String(row.offer_id),
		nftUid: String(row.nft_uid),
		buyer: String(row.buyer),
		price: Number(row.price),
		currency: row.currency as MarketOffer['currency'],
		offeredBlock: Number(row.offered_block ?? 0),
		offeredTrxId: String(row.offered_trx_id ?? ''),
		status: row.status as MarketOffer['status'],
		paymentTrxId: row.payment_trx_id != null ? String(row.payment_trx_id) : undefined,
	};
}

function rowToCampaignSubmission(row: Record<string, unknown>): CampaignSubmissionRecord {
	return {
		submissionKey: String(row.submission_key),
		account: String(row.account),
		campaignId: String(row.campaign_id),
		missionId: String(row.mission_id),
		difficulty: row.difficulty as CampaignSubmissionRecord['difficulty'],
		nonce: Number(row.nonce),
		localRunId: String(row.local_run_id),
		localStartedAt: Number(row.local_started_at),
		rulesetHash: String(row.ruleset_hash),
		seed: String(row.seed),
		turnCount: Number(row.turn_count),
		stars: Number(row.stars),
		transcriptRoot: String(row.transcript_root),
		transcriptCid: row.transcript_cid != null ? String(row.transcript_cid) : undefined,
		finalStateHash: String(row.final_state_hash),
		status: row.status as CampaignSubmissionRecord['status'],
		rejectionReason: row.rejection_reason != null ? String(row.rejection_reason) : undefined,
		trxId: String(row.trx_id),
		blockNum: Number(row.block_num),
		timestamp: Number(row.timestamp),
	};
}

function rowToCampaignProgress(row: Record<string, unknown>): CampaignProgressRecord {
	return {
		account: String(row.account),
		campaignId: String(row.campaign_id),
		missionId: String(row.mission_id),
		bestDifficulty: row.best_difficulty as CampaignProgressRecord['bestDifficulty'],
		bestTurns: Number(row.best_turns),
		bestStars: Number(row.best_stars),
		completedAtBlock: Number(row.completed_at_block),
		completedTrxId: String(row.completed_trx_id),
		status: 'verified',
	};
}

function escapeLikePrefix(prefix: string): string {
	return prefix.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function buildRuneLedgerFilter(
	query: RuneLedgerEntryQuery | RuneLedgerTotalQuery,
	startIndex = 1,
): { clause: string; params: unknown[] } {
	const params: unknown[] = [query.seasonId];
	let clause = `season_id = $${startIndex}`;
	let index = startIndex + 1;
	if (query.direction !== undefined) {
		clause += ` AND direction = $${index}`;
		params.push(query.direction);
		index += 1;
	}
	if (query.sourceType !== undefined) {
		clause += ` AND source_type = $${index}`;
		params.push(query.sourceType);
		index += 1;
	}
	if (query.account !== undefined) {
		clause += ` AND account = $${index}`;
		params.push(query.account);
		index += 1;
	}
	if (query.sourceKeyPrefix !== undefined) {
		clause += ` AND source_key LIKE $${index} ESCAPE '\\'`;
		params.push(`${escapeLikePrefix(query.sourceKeyPrefix)}%`);
	}
	return { clause, params };
}

function buildEitrLedgerFilter(
	query: EitrLedgerEntryQuery | EitrLedgerTotalQuery,
	startIndex = 1,
): { clause: string; params: unknown[] } {
	const params: unknown[] = [query.seasonId];
	let clause = `season_id = $${startIndex}`;
	let index = startIndex + 1;
	if (query.direction !== undefined) {
		clause += ` AND direction = $${index}`;
		params.push(query.direction);
		index += 1;
	}
	if (query.sourceType !== undefined) {
		clause += ` AND source_type = $${index}`;
		params.push(query.sourceType);
		index += 1;
	}
	if (query.account !== undefined) {
		clause += ` AND account = $${index}`;
		params.push(query.account);
		index += 1;
	}
	if (query.sourceKeyPrefix !== undefined) {
		clause += ` AND source_key LIKE $${index} ESCAPE '\\'`;
		params.push(`${escapeLikePrefix(query.sourceKeyPrefix)}%`);
	}
	return { clause, params };
}

function parseRuntimeMetaValue(value: unknown): ProtocolRuntimeFingerprint {
	if (typeof value === 'string') {
		return JSON.parse(value) as ProtocolRuntimeFingerprint;
	}
	return value as ProtocolRuntimeFingerprint;
}

export async function verifyPgRuntimeFingerprint(
	executor: PgQueryExecutor,
	expectedFingerprint: ProtocolRuntimeFingerprint,
): Promise<void> {
	const rows = await executor<{ value_json: ProtocolRuntimeFingerprint }>(
		'SELECT value_json FROM runtime_meta WHERE key = $1',
		['runtime_fingerprint'],
	);
	if (rows[0]?.value_json) {
		assertProtocolRuntimeFingerprint(expectedFingerprint, parseRuntimeMetaValue(rows[0].value_json));
		return;
	}
	await executor(
		`INSERT INTO runtime_meta (key, value_json, updated_at) VALUES ($1, $2::jsonb, $3)
		 ON CONFLICT (key) DO NOTHING`,
		['runtime_fingerprint', JSON.stringify(expectedFingerprint), Date.now()],
	);
	const storedRows = await executor<{ value_json: unknown }>(
		'SELECT value_json FROM runtime_meta WHERE key = $1',
		['runtime_fingerprint'],
	);
	const stored = storedRows[0]?.value_json;
	if (stored !== undefined && stored !== null) {
		assertProtocolRuntimeFingerprint(expectedFingerprint, parseRuntimeMetaValue(stored));
	}
}

export function createPgStateAdapter(executor: PgQueryExecutor): StateAdapter {
	const _trxSiblings = new Map<string, unknown[]>();

	const ensurePlayer = async (username: string): Promise<void> => {
		await executor(
			`INSERT INTO players (username) VALUES ($1)
			 ON CONFLICT (username) DO NOTHING`,
			[username],
		);
	};

	return {
		async getGenesis() {
			const rows = await executor<{ value_text: string }>(
				'SELECT value_text FROM global_sync WHERE key = $1',
				['genesis'],
			);
			return rows[0]?.value_text ? JSON.parse(rows[0].value_text) as GenesisRecord : null;
		},
		async putGenesis(genesis) {
			await executor(
				`INSERT INTO global_sync (key, value_text) VALUES ($1, $2)
				 ON CONFLICT (key) DO UPDATE SET value_text = EXCLUDED.value_text`,
				['genesis', JSON.stringify(genesis)],
			);
		},

		async getCard(uid) {
			const rows = await executor<Record<string, unknown>>('SELECT * FROM cards WHERE uid = $1', [uid]);
			return rows[0] ? rowToCard(rows[0]) : null;
		},
		async putCard(card) {
			await ensurePlayer(card.owner);
			await executor(
				`INSERT INTO cards (
					uid, card_id, owner, rarity, level, xp, edition, foil, mint_source, mint_trx_id,
					mint_block_num, last_transfer_block, origin_dna, instance_dna, parent_instance_dna,
					generation, replica_count, merged_from, acquisition
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
					$11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb
				)
				ON CONFLICT (uid) DO UPDATE SET
					owner = EXCLUDED.owner,
					level = EXCLUDED.level,
					xp = EXCLUDED.xp,
					foil = EXCLUDED.foil,
					replica_count = EXCLUDED.replica_count,
					merged_from = EXCLUDED.merged_from,
					last_transfer_block = EXCLUDED.last_transfer_block,
					acquisition = EXCLUDED.acquisition`,
				[
					card.uid, card.cardId, card.owner, card.rarity, card.level, card.xp, card.edition, card.foil ?? null,
					card.mintSource, card.mintTrxId, card.mintBlockNum, card.lastTransferBlock,
					card.originDna ?? null, card.instanceDna ?? null, card.parentInstanceDna ?? null,
					card.generation ?? null, card.replicaCount ?? null, card.mergedFrom ?? null,
					card.acquisition ? JSON.stringify(card.acquisition) : null,
				],
			);
		},
		async deleteCard(uid) {
			await executor('DELETE FROM cards WHERE uid = $1', [uid]);
		},
		async getCardsByOwner(owner) {
			const rows = await executor<Record<string, unknown>>('SELECT * FROM cards WHERE owner = $1', [owner]);
			return rows.map(rowToCard);
		},

		async getSupply(key, pool) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM supply_counters WHERE key = $1 AND pool = $2',
				[supplyMapKey(key, pool), pool],
			);
			const row = rows[0];
			if (!row) return null;
			return {
				key,
				pool,
				cap: Number(row.cap),
				minted: Number(row.minted),
			};
		},
		async putSupply(record) {
			await executor(
				`INSERT INTO supply_counters (key, pool, cap, minted) VALUES ($1, $2, $3, $4)
				 ON CONFLICT (key) DO UPDATE SET cap = EXCLUDED.cap, minted = EXCLUDED.minted, pool = EXCLUDED.pool`,
				[supplyMapKey(record.key, record.pool), record.pool, record.cap, record.minted],
			);
		},

		async advanceNonce(account, nonce) {
			await ensurePlayer(account);
			const rows = await executor(
				`INSERT INTO players (username, nonce) VALUES ($1, $2)
				 ON CONFLICT (username) DO UPDATE SET nonce = $2 WHERE players.nonce < $2
				 RETURNING username`,
				[account, nonce],
			);
			return rows.length > 0;
		},

		async getElo(account): Promise<EloRecord> {
			const rows = await executor<{ elo: number; wins: number; losses: number }>(
				'SELECT elo, wins, losses FROM players WHERE username = $1',
				[account],
			);
			if (!rows[0]) return { account, elo: 1000, wins: 0, losses: 0 };
			return { account, elo: rows[0].elo, wins: rows[0].wins, losses: rows[0].losses };
		},
		async putElo(record) {
			await executor(
				`INSERT INTO players (username, elo, wins, losses) VALUES ($1, $2, $3, $4)
				 ON CONFLICT (username) DO UPDATE SET elo = $2, wins = $3, losses = $4`,
				[record.account, record.elo, record.wins, record.losses],
			);
		},

		async getTokenBalance(account, seasonId) {
			const rows = await executor<{ balance: string | number | null }>(
				`SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS balance
				 FROM rune_ledger WHERE account = $1 AND season_id = $2`,
				[account, seasonId],
			);
			return { account, RUNE: Number(rows[0]?.balance ?? 0) };
		},
		async getRuneLedgerEntry(entryId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM rune_ledger WHERE entry_id = $1',
				[entryId],
			);
			return rows[0] ? rowToRuneLedger(rows[0]) : null;
		},
		async putRuneLedgerEntry(entry) {
			await ensurePlayer(entry.account);
			await executor(
				`INSERT INTO rune_ledger (
					entry_id, season_id, account, direction, source_type, source_key, amount,
					balance_before, balance_after, trx_id, block_num, timestamp
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
				ON CONFLICT (entry_id) DO NOTHING`,
				[
					entry.entryId, entry.seasonId, entry.account, entry.direction, entry.sourceType, entry.sourceKey,
					entry.amount, entry.balanceBefore, entry.balanceAfter, entry.trxId, entry.blockNum, entry.timestamp,
				],
			);
		},
		async getRuneLedgerEntries(query) {
			const { clause, params } = buildRuneLedgerFilter(query);
			const rows = await executor<Record<string, unknown>>(
				`SELECT * FROM rune_ledger WHERE ${clause} ORDER BY block_num, entry_id`,
				params,
			);
			return rows.map(rowToRuneLedger);
		},
		async getRuneLedgerTotal(query) {
			const { clause, params } = buildRuneLedgerFilter(query);
			const rows = await executor<{ total: string | number | null }>(
				`SELECT COALESCE(SUM(amount), 0) AS total FROM rune_ledger WHERE ${clause}`,
				params,
			);
			return Number(rows[0]?.total ?? 0);
		},

		async getEitrLedgerEntry(entryId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM eitr_ledger WHERE entry_id = $1',
				[entryId],
			);
			return rows[0] ? rowToEitrLedger(rows[0]) : null;
		},
		async putEitrLedgerEntry(entry) {
			await ensurePlayer(entry.account);
			await executor(
				`INSERT INTO eitr_ledger (
					entry_id, season_id, account, direction, source_type, source_key, amount,
					balance_before, balance_after, trx_id, block_num, timestamp
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
				ON CONFLICT (entry_id) DO NOTHING`,
				[
					entry.entryId, entry.seasonId, entry.account, entry.direction, entry.sourceType, entry.sourceKey,
					entry.amount, entry.balanceBefore, entry.balanceAfter, entry.trxId, entry.blockNum, entry.timestamp,
				],
			);
		},
		async getEitrLedgerEntries(query) {
			const { clause, params } = buildEitrLedgerFilter(query);
			const rows = await executor<Record<string, unknown>>(
				`SELECT * FROM eitr_ledger WHERE ${clause} ORDER BY block_num, entry_id`,
				params,
			);
			return rows.map(rowToEitrLedger);
		},
		async getEitrLedgerTotal(query) {
			const { clause, params } = buildEitrLedgerFilter(query);
			const rows = await executor<{ total: string | number | null }>(
				`SELECT COALESCE(SUM(amount), 0) AS total FROM eitr_ledger WHERE ${clause}`,
				params,
			);
			return Number(rows[0]?.total ?? 0);
		},

		async getForgeCommit(trxId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM forge_commits WHERE trx_id = $1',
				[trxId],
			);
			return rows[0] ? rowToForgeCommit(rows[0]) : null;
		},
		async putForgeCommit(commit) {
			await ensurePlayer(commit.account);
			await executor(
				`INSERT INTO forge_commits (
					trx_id, account, rarity, salt_commit, commit_block, debit_amount, revealed, season_id
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
				ON CONFLICT (trx_id) DO UPDATE SET
					revealed = EXCLUDED.revealed,
					debit_amount = EXCLUDED.debit_amount`,
				[
					commit.trxId, commit.account, commit.rarity, commit.saltCommit,
					commit.commitBlock, commit.debitAmount, commit.revealed, commit.seasonId ?? null,
				],
			);
		},
		async getUnrevealedForgeCommitsBefore(deadlineBlock) {
			const rows = await executor<Record<string, unknown>>(
				`SELECT * FROM forge_commits
				 WHERE revealed = FALSE AND commit_block <= $1
				 ORDER BY commit_block, trx_id`,
				[deadlineBlock],
			);
			return rows.map(rowToForgeCommit);
		},

		async getMatchAnchor(matchId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM match_anchors WHERE match_id = $1',
				[matchId],
			);
			return rows[0] ? rowToMatchAnchor(rows[0]) : null;
		},
		async putMatchAnchor(anchor) {
			await Promise.all([ensurePlayer(anchor.playerA), ensurePlayer(anchor.playerB)]);
			await executor(
				`INSERT INTO match_anchors (
					match_id, player_a, player_b, pubkey_a, pubkey_b, deck_hash_a, deck_hash_b,
					engine_hash, card_registry_hash, dual_anchored, timestamp
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
				ON CONFLICT (match_id) DO UPDATE SET
					pubkey_a = EXCLUDED.pubkey_a,
					pubkey_b = EXCLUDED.pubkey_b,
					deck_hash_a = EXCLUDED.deck_hash_a,
					deck_hash_b = EXCLUDED.deck_hash_b,
					engine_hash = EXCLUDED.engine_hash,
					card_registry_hash = EXCLUDED.card_registry_hash,
					dual_anchored = EXCLUDED.dual_anchored,
					timestamp = EXCLUDED.timestamp`,
				[
					anchor.matchId, anchor.playerA, anchor.playerB, anchor.pubkeyA ?? null, anchor.pubkeyB ?? null,
					anchor.deckHashA ?? null, anchor.deckHashB ?? null, anchor.engineHash ?? null,
					anchor.cardRegistryHash ?? null, anchor.dualAnchored, anchor.timestamp,
				],
			);
		},

		async getPackCommit(trxId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM pack_commits WHERE trx_id = $1',
				[trxId],
			);
			return rows[0] ? rowToPackCommit(rows[0]) : null;
		},
		async putPackCommit(commit) {
			await ensurePlayer(commit.account);
			await executor(
				`INSERT INTO pack_commits (
					trx_id, account, pack_type, quantity, salt_commit, commit_block, revealed
				) VALUES ($1,$2,$3,$4,$5,$6,$7)
				ON CONFLICT (trx_id) DO UPDATE SET revealed = EXCLUDED.revealed`,
				[
					commit.trxId, commit.account, commit.packType, commit.quantity,
					commit.saltCommit, commit.commitBlock, commit.revealed,
				],
			);
		},
		async getUnrevealedCommitsBefore(deadlineBlock) {
			const rows = await executor<Record<string, unknown>>(
				`SELECT * FROM pack_commits
				 WHERE revealed = FALSE AND commit_block + 200 <= $1
				 ORDER BY commit_block, trx_id`,
				[deadlineBlock],
			);
			return rows.map(rowToPackCommit);
		},

		async hasRewardClaim(account, rewardId) {
			const rows = await executor(
				'SELECT claim_key FROM reward_claims WHERE claim_key = $1',
				[rewardClaimKey(account, rewardId)],
			);
			return rows.length > 0;
		},
		async putRewardClaim(account, rewardId, blockNum) {
			await ensurePlayer(account);
			await executor(
				`INSERT INTO reward_claims (claim_key, account, reward_id, claimed_at, block_num)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (claim_key) DO NOTHING`,
				[rewardClaimKey(account, rewardId), account, rewardId, Date.now(), blockNum],
			);
		},

		async advanceCampaignNonce(account, nonce) {
			await ensurePlayer(account);
			const rows = await executor(
				`INSERT INTO players (username, campaign_nonce) VALUES ($1, $2)
				 ON CONFLICT (username) DO UPDATE SET campaign_nonce = $2 WHERE players.campaign_nonce < $2
				 RETURNING username`,
				[account, nonce],
			);
			return rows.length > 0;
		},
		async getCampaignSubmission(submissionKey) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM campaign_submissions WHERE submission_key = $1',
				[submissionKey],
			);
			return rows[0] ? rowToCampaignSubmission(rows[0]) : null;
		},
		async putCampaignSubmission(submission) {
			await ensurePlayer(submission.account);
			await executor(
				`INSERT INTO campaign_submissions (
					submission_key, account, campaign_id, mission_id, difficulty, nonce, local_run_id,
					local_started_at, ruleset_hash, seed, turn_count, stars, transcript_root, transcript_cid,
					final_state_hash, status, rejection_reason, trx_id, block_num, timestamp
				) VALUES (
					$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
				)
				ON CONFLICT (submission_key) DO UPDATE SET status = EXCLUDED.status, rejection_reason = EXCLUDED.rejection_reason`,
				[
					submission.submissionKey, submission.account, submission.campaignId, submission.missionId,
					submission.difficulty, submission.nonce, submission.localRunId, submission.localStartedAt,
					submission.rulesetHash, submission.seed, submission.turnCount, submission.stars,
					submission.transcriptRoot, submission.transcriptCid ?? null, submission.finalStateHash,
					submission.status, submission.rejectionReason ?? null, submission.trxId,
					submission.blockNum, submission.timestamp,
				],
			);
		},
		async getCampaignProgress(account, campaignId, missionId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM campaign_progress WHERE progress_key = $1',
				[campaignProgressKey(account, campaignId, missionId)],
			);
			return rows[0] ? rowToCampaignProgress(rows[0]) : null;
		},
		async putCampaignProgress(progress) {
			await ensurePlayer(progress.account);
			await executor(
				`INSERT INTO campaign_progress (
					progress_key, account, campaign_id, mission_id, best_difficulty, best_turns, best_stars,
					completed_at_block, completed_trx_id, status
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
				ON CONFLICT (progress_key) DO UPDATE SET
					best_difficulty = EXCLUDED.best_difficulty,
					best_turns = EXCLUDED.best_turns,
					best_stars = EXCLUDED.best_stars,
					completed_at_block = EXCLUDED.completed_at_block,
					completed_trx_id = EXCLUDED.completed_trx_id`,
				[
					campaignProgressKey(progress.account, progress.campaignId, progress.missionId),
					progress.account, progress.campaignId, progress.missionId, progress.bestDifficulty,
					progress.bestTurns, progress.bestStars, progress.completedAtBlock, progress.completedTrxId,
					progress.status,
				],
			);
		},

		async isSlashed(account) {
			const rows = await executor('SELECT account FROM slashed_accounts WHERE account = $1', [account]);
			return rows.length > 0;
		},
		async slash(account, reason, blockNum) {
			await ensurePlayer(account);
			await executor(
				`INSERT INTO slashed_accounts (account, slashed_at, reason, block_num) VALUES ($1, $2, $3, $4)
				 ON CONFLICT (account) DO NOTHING`,
				[account, Date.now(), reason, blockNum],
			);
			await executor('UPDATE players SET slashed = TRUE WHERE username = $1', [account]);
		},

		async getQueueEntry(account) {
			const rows = await executor<{ timestamp: number | string }>(
				'SELECT timestamp FROM queue_entries WHERE account = $1',
				[account],
			);
			if (!rows[0]) return null;
			return { timestamp: Number(rows[0].timestamp) };
		},
		async putQueueEntry(account, data) {
			await ensurePlayer(account);
			await executor(
				`INSERT INTO queue_entries (account, mode, elo, peer_id, deck_hash, timestamp, block_num)
				 VALUES ($1,$2,$3,$4,$5,$6,$7)
				 ON CONFLICT (account) DO UPDATE SET
					mode = EXCLUDED.mode, elo = EXCLUDED.elo, peer_id = EXCLUDED.peer_id,
					deck_hash = EXCLUDED.deck_hash, timestamp = EXCLUDED.timestamp, block_num = EXCLUDED.block_num`,
				[account, data.mode, data.elo, data.peerId, data.deckHash, data.timestamp, data.blockNum],
			);
		},
		async deleteQueueEntry(account) {
			await executor('DELETE FROM queue_entries WHERE account = $1', [account]);
		},

		async getPack(uid) {
			const rows = await executor<Record<string, unknown>>('SELECT * FROM packs WHERE uid = $1', [uid]);
			return rows[0] ? rowToPack(rows[0]) : null;
		},
		async putPack(pack) {
			await ensurePlayer(pack.owner);
			await executor(
				`INSERT INTO packs (
					uid, pack_type, dna, owner, sealed, mint_trx_id, mint_block_num,
					last_transfer_block, card_count, edition, acquisition
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
				ON CONFLICT (uid) DO UPDATE SET
					owner = EXCLUDED.owner,
					sealed = EXCLUDED.sealed,
					last_transfer_block = EXCLUDED.last_transfer_block,
					acquisition = EXCLUDED.acquisition`,
				[
					pack.uid, pack.packType, pack.dna, pack.owner, pack.sealed, pack.mintTrxId,
					pack.mintBlockNum, pack.lastTransferBlock, pack.cardCount, pack.edition,
					pack.acquisition ? JSON.stringify(pack.acquisition) : null,
				],
			);
		},
		async deletePack(uid) {
			await executor('DELETE FROM packs WHERE uid = $1', [uid]);
		},
		async getPacksByOwner(owner) {
			const rows = await executor<Record<string, unknown>>('SELECT * FROM packs WHERE owner = $1', [owner]);
			return rows.map(rowToPack);
		},
		async getPackSupply(packType) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM pack_supply WHERE pack_type = $1',
				[packType],
			);
			const row = rows[0];
			if (!row) return null;
			return {
				packType,
				cap: Number(row.cap),
				minted: Number(row.minted),
				burned: Number(row.burned),
			};
		},
		async putPackSupply(record) {
			await executor(
				`INSERT INTO pack_supply (pack_type, cap, minted, burned) VALUES ($1,$2,$3,$4)
				 ON CONFLICT (pack_type) DO UPDATE SET cap = EXCLUDED.cap, minted = EXCLUDED.minted, burned = EXCLUDED.burned`,
				[record.packType, record.cap, record.minted, record.burned],
			);
		},

		async getCompanionTransfer(trxId) {
			const siblings = _trxSiblings.get(trxId);
			if (!siblings) return null;
			for (const op of siblings) {
				const arr = op as [string, Record<string, string>];
				if (arr[0] === 'transfer') {
					return {
						from: arr[1].from,
						to: arr[1].to,
						amount: arr[1].amount,
						memo: arr[1].memo || '',
					};
				}
			}
			return null;
		},
		setTrxSiblings(trxId, ops) {
			_trxSiblings.set(trxId, ops);
		},

		async getDuatClaim(account) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM duat_claims WHERE account = $1',
				[account],
			);
			if (!rows[0]) return null;
			return {
				account: String(rows[0].account),
				duatRaw: Number(rows[0].duat_raw),
				packsEarned: Number(rows[0].packs_earned),
				blockNum: Number(rows[0].block_num),
				trxId: String(rows[0].trx_id),
			} satisfies DuatClaimRecord;
		},
		async putDuatClaim(claim) {
			await ensurePlayer(claim.account);
			await executor(
				`INSERT INTO duat_claims (account, duat_raw, packs_earned, trx_id, block_num)
				 VALUES ($1,$2,$3,$4,$5)
				 ON CONFLICT (account) DO UPDATE SET
					duat_raw = EXCLUDED.duat_raw,
					packs_earned = EXCLUDED.packs_earned,
					trx_id = EXCLUDED.trx_id,
					block_num = EXCLUDED.block_num`,
				[claim.account, claim.duatRaw, claim.packsEarned, claim.trxId, claim.blockNum],
			);
		},

		async getListing(listingId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM market_listings WHERE listing_id = $1',
				[listingId],
			);
			return rows[0] ? rowToListing(rows[0]) : null;
		},
		async getListingByNft(nftUid) {
			const rows = await executor<Record<string, unknown>>(
				`SELECT * FROM market_listings WHERE nft_uid = $1 AND active = TRUE
				 ORDER BY listed_block DESC LIMIT 1`,
				[nftUid],
			);
			return rows[0] ? rowToListing(rows[0]) : null;
		},
		async putListing(listing) {
			await ensurePlayer(listing.seller);
			await executor(
				`INSERT INTO market_listings (
					listing_id, nft_uid, nft_type, seller, price, currency, listed_block, listed_trx_id, active
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
				ON CONFLICT (listing_id) DO UPDATE SET
					price = EXCLUDED.price,
					active = EXCLUDED.active,
					listed_block = EXCLUDED.listed_block,
					listed_trx_id = EXCLUDED.listed_trx_id`,
				[
					listing.listingId, listing.nftUid, listing.nftType, listing.seller, listing.price,
					listing.currency, listing.listedBlock, listing.listedTrxId, listing.active,
				],
			);
		},
		async deleteListing(listingId) {
			await executor('DELETE FROM market_listings WHERE listing_id = $1', [listingId]);
		},
		async getOffer(offerId) {
			const rows = await executor<Record<string, unknown>>(
				'SELECT * FROM market_offers WHERE offer_id = $1',
				[offerId],
			);
			return rows[0] ? rowToOffer(rows[0]) : null;
		},
		async getOffersByNft(nftUid) {
			const rows = await executor<Record<string, unknown>>(
				`SELECT * FROM market_offers WHERE nft_uid = $1 AND status = 'pending' ORDER BY offered_block`,
				[nftUid],
			);
			return rows.map(rowToOffer);
		},
		async putOffer(offer) {
			await ensurePlayer(offer.buyer);
			await executor(
				`INSERT INTO market_offers (
					offer_id, nft_uid, buyer, price, currency, offered_block, offered_trx_id, status, payment_trx_id
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
				ON CONFLICT (offer_id) DO UPDATE SET
					status = EXCLUDED.status,
					payment_trx_id = EXCLUDED.payment_trx_id`,
				[
					offer.offerId, offer.nftUid, offer.buyer, offer.price, offer.currency,
					offer.offeredBlock, offer.offeredTrxId, offer.status, offer.paymentTrxId ?? null,
				],
			);
		},
	};
}

export const pgStateAdapter: StateAdapter = createPgStateAdapter(defaultQuery);
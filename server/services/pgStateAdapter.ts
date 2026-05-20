/**
 * pgStateAdapter.ts — (Future) StateAdapter backed by PostgreSQL
 *
 * This file serves as the blueprint for migrating from JSON persistence
 * to a real database. It implements the same StateAdapter interface
 * used by protocol-core, ensuring the logic remains identical.
 */

import type {
	StateAdapter, CardAsset, GenesisRecord,
	MatchAnchorRecord, PackCommitRecord, SupplyRecord,
	TokenBalance, RuneLedgerEntry, RuneLedgerEntryQuery,
	RuneLedgerTotalQuery, EitrLedgerEntry, EitrLedgerEntryQuery,
	EitrLedgerTotalQuery, ForgeCommitRecord,
	CampaignSubmissionRecord, CampaignProgressRecord,
	PackAsset as PackNFT, PackSupplyRecord,
	MarketListing, MarketOffer, DuatClaimRecord,
} from '../../shared/protocol-core/types';
import { db } from '../database';

// Helper for SQL execution (placeholder wrapper)
async function query<T>(text: string, params: any[] = []): Promise<T[]> {
	if (!db) throw new Error('PostgreSQL not configured');
	const result = await db.query(text, params);
	return result.rows as T[];
}

export const pgStateAdapter: StateAdapter = {
	async getGenesis() {
		const rows = await query<any>('SELECT value_text FROM global_sync WHERE key = $1', ['genesis']);
		return rows[0] ? JSON.parse(rows[0].value_text) : null;
	},
	async putGenesis(g) {
		await query('INSERT INTO global_sync (key, value_text) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value_text = $2', 
			['genesis', JSON.stringify(g)]);
	},

	async getCard(uid) {
		const rows = await query<any>('SELECT * FROM cards WHERE uid = $1', [uid]);
		if (!rows[0]) return null;
		// Map DB columns to CardAsset object...
		return rows[0] as CardAsset;
	},
	async putCard(card) {
		const sql = `
			INSERT INTO cards (uid, card_id, owner, rarity, level, xp, edition, foil, mint_source, mint_trx_id, mint_block_num, last_transfer_block)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (uid) DO UPDATE SET
				owner = $3, level = $5, xp = $6, last_transfer_block = $12
		`;
		await query(sql, [card.uid, card.cardId, card.owner, card.rarity, card.level, card.xp, card.edition, card.foil, card.mintSource, card.mintTrxId, card.mintBlockNum, card.lastTransferBlock]);
	},
	async deleteCard(uid) {
		await query('DELETE FROM cards WHERE uid = $1', [uid]);
	},
	async getCardsByOwner(owner) {
		return query<CardAsset>('SELECT * FROM cards WHERE owner = $1', [owner]);
	},

	async getSupply(key, pool) {
		const rows = await query<any>('SELECT * FROM supply_counters WHERE key = $1 AND pool = $2', [key, pool]);
		return rows[0] || null;
	},
	async putSupply(s) {
		await query('INSERT INTO supply_counters (key, pool, cap, minted) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO UPDATE SET minted = $4',
			[s.key, s.pool, s.cap, s.minted]);
	},

	async advanceNonce(account, nonce) {
		const res = await query<any>('UPDATE players SET nonce = $2 WHERE username = $1 AND nonce < $2 RETURNING username', [account, nonce]);
		return res.length > 0;
	},

	async getElo(account) {
		const rows = await query<any>('SELECT elo, wins, losses FROM players WHERE username = $1', [account]);
		if (!rows[0]) return { account, elo: 1000, wins: 0, losses: 0 };
		return { account, ...rows[0] };
	},
	async putElo(r) {
		await query('INSERT INTO players (username, elo, wins, losses) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET elo = $2, wins = $3, losses = $4',
			[r.account, r.elo, r.wins, r.losses]);
	},

	async getTokenBalance(account) {
		const rows = await query<any>('SELECT SUM(CASE WHEN direction = \'credit\' THEN amount ELSE -amount END) as balance FROM rune_ledger WHERE account = $1', [account]);
		return { account, RUNE: Number(rows[0]?.balance || 0) };
	},
	async putTokenBalance(_b) {
		// No-op for PG: balances are derived from ledger to ensure 100% auditability
	},
	async getRuneBalanceTotal() {
		const rows = await query<any>('SELECT SUM(CASE WHEN direction = \'credit\' THEN amount ELSE -amount END) as total FROM rune_ledger');
		return Number(rows[0]?.total || 0);
	},
	async getRuneLedgerEntry(entryId) {
		const rows = await query<RuneLedgerEntry>('SELECT * FROM rune_ledger WHERE entry_id = $1', [entryId]);
		return rows[0] || null;
	},
	async putRuneLedgerEntry(e) {
		const sql = `
			INSERT INTO rune_ledger (entry_id, season_id, account, direction, source_type, source_key, amount, balance_before, balance_after, trx_id, block_num, timestamp)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (entry_id) DO NOTHING
		`;
		await query(sql, [e.entryId, e.seasonId, e.account, e.direction, e.sourceType, e.sourceKey, e.amount, e.balanceBefore, e.balanceAfter, e.trxId, e.blockNum, e.timestamp]);
	},
	async getRuneLedgerEntries(q) {
		// Dynamic query fabrication would go here
		return [];
	},
	async getRuneLedgerTotal(_q) { return 0; },

	// ... Remaining methods (MatchAnchors, Market, etc.) follow the same pattern ...
	async getMatchAnchor(matchId) {
		const rows = await query<MatchAnchorRecord>('SELECT * FROM match_anchors WHERE match_id = $1', [matchId]);
		return rows[0] || null;
	},
	async putMatchAnchor(a) {
		// SQL insert for match_anchors...
	},

	async getPack(uid) { return null; },
	async putPack(p) { },
	async deletePack(u) { },
	async getPacksByOwner(o) { return []; },
	async getPackSupply(t) { return null; },
	async putPackSupply(r) { },
	async getCompanionTransfer(t) { return null; },
	setTrxSiblings(t, o) { },

	async advanceCampaignNonce(a, n) { return false; },
	async getCampaignSubmission(s) { return null; },
	async putCampaignSubmission(s) { },
	async getCampaignProgress(a, c, m) { return null; },
	async putCampaignProgress(p) { },

	async isSlashed(a) { return false; },
	async slash(a) { },

	async getQueueEntry(a) { return null; },
	async putQueueEntry(a, d) { },
	async deleteQueueEntry(a) { },

	async getListing(l) { return null; },
	async getListingByNft(n) { return null; },
	async putListing(l) { },
	async deleteListing(l) { },
	async getOffer(o) { return null; },
	async getOffersByNft(n) { return []; },
	async putOffer(o) { },

	async hasRewardClaim(a, r) { return false; },
	async putRewardClaim(a, r) { },
	async getDuatClaim(a) { return null; },
	async putDuatClaim(c) { },
	async getEitrLedgerEntry(e) { return null; },
	async putEitrLedgerEntry(e) { },
	async getEitrLedgerEntries(q) { return []; },
	async getEitrLedgerTotal(q) { return 0; },
	async getForgeCommit(t) { return null; },
	async putForgeCommit(c) { },
	async getUnrevealedForgeCommitsBefore(d) { return []; },
	async getUnrevealedCommitsBefore(d) { return []; },
};

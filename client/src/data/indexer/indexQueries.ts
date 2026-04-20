/**
 * Index Query API — Local IndexedDB queries over the cached index
 *
 * All queries run against locally cached data. Zero API calls.
 * Data freshness depends on last sync (typically <60s stale).
 *
 * See docs/DECENTRALIZED_INDEXER_DESIGN.md
 */

import type { LeaderboardEntry } from '../../../../shared/indexer-types';
import { ELO_K_FACTOR, ELO_FLOOR } from '../../../../shared/protocol-core/types';
import {
	getLeaderboard, getOpsByPlayerAction, getOpsByPlayer,
	getSupplyCounter, getSyncMeta, applyOptimisticElo,
} from './indexDB';

// ============================================================
// Leaderboard Queries
// ============================================================

export async function getTop100(): Promise<LeaderboardEntry[]> {
	const all = await getLeaderboard();
	return all.slice(0, 100);
}

export async function getPlayerRank(username: string): Promise<LeaderboardEntry | null> {
	const all = await getLeaderboard();
	return all.find(e => e.username === username) || null;
}

// ============================================================
// Match History
// ============================================================

export interface MatchRecord {
	trxId: string;
	blockNum: number;
	timestamp: number;
	opponent: string;
	won: boolean;
	eloAfter?: number;
}

export async function getMatchHistory(username: string): Promise<MatchRecord[]> {
	const ops = await getOpsByPlayerAction(username, 'match_result');

	const asCounterparty = await getOpsByPlayer(username).then(all =>
		all.filter(op => op.action === 'match_result' && op.counterparty === username)
	);

	const seen = new Set<string>();
	const matches: MatchRecord[] = [];

	for (const op of ops) {
		seen.add(op.trxId);
		matches.push({
			trxId: op.trxId,
			blockNum: op.blockNum,
			timestamp: op.timestamp,
			opponent: op.counterparty || 'unknown',
			won: op.derived?.winner === username,
			eloAfter: op.derived?.eloAfter,
		});
	}

	for (const op of asCounterparty) {
		if (seen.has(op.trxId)) continue;
		seen.add(op.trxId);
		matches.push({
			trxId: op.trxId,
			blockNum: op.blockNum,
			timestamp: op.timestamp,
			opponent: op.player,
			won: op.derived?.winner === username,
			eloAfter: undefined,
		});
	}

	return matches.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================
// Card Ownership (from index)
// ============================================================

export interface CardOwnership {
	cardUid: string;
	cardId?: number;
	lastAction: string;
	lastTrxId: string;
	blockNum: number;
}

export async function getPlayerCards(username: string): Promise<CardOwnership[]> {
	const transferOps = await getOpsByPlayerAction(username, 'card_transfer');
	const mintOps = await getOpsByPlayerAction(username, 'mint_batch');
	const rewardOps = await getOpsByPlayerAction(username, 'reward_claim');

	const allOps = [...transferOps, ...mintOps, ...rewardOps]
		.filter(op => op.derived?.cardUid)
		.sort((a, b) => b.blockNum - a.blockNum);

	const seen = new Set<string>();
	const cards: CardOwnership[] = [];
	for (const op of allOps) {
		const uid = op.derived!.cardUid!;
		if (seen.has(uid)) continue;
		seen.add(uid);
		cards.push({
			cardUid: uid,
			cardId: op.derived?.cardId,
			lastAction: op.action,
			lastTrxId: op.trxId,
			blockNum: op.blockNum,
		});
	}

	return cards;
}

// ============================================================
// Supply Queries
// ============================================================

export async function getCardSupply(rarity: string): Promise<{ cap: number; minted: number } | null> {
	const counter = await getSupplyCounter(rarity);
	if (!counter) return null;
	return { cap: counter.cap, minted: counter.minted };
}

export async function getAllSupplyCounters(): Promise<Record<string, { cap: number; minted: number }>> {
	const rarities = ['common', 'rare', 'epic', 'mythic'];
	const result: Record<string, { cap: number; minted: number }> = {};
	for (const rarity of rarities) {
		const counter = await getSupplyCounter(rarity);
		if (counter) {
			result[rarity] = { cap: counter.cap, minted: counter.minted };
		}
	}
	return result;
}

// ============================================================
// Player Profile (aggregated from index)
// ============================================================

export interface PlayerProfile {
	username: string;
	elo: number;
	rank: number;
	wins: number;
	losses: number;
	totalMatches: number;
	cardsOwned: number;
	lastActive: number;
}

export async function getPlayerProfile(username: string): Promise<PlayerProfile | null> {
	const leaderboardEntry = await getPlayerRank(username);
	const matches = await getMatchHistory(username);
	const cards = await getPlayerCards(username);

	if (!leaderboardEntry && matches.length === 0) return null;

	return {
		username,
		elo: leaderboardEntry?.elo ?? 1000,
		rank: leaderboardEntry?.rank ?? 9999,
		wins: leaderboardEntry?.wins ?? matches.filter(m => m.won).length,
		losses: leaderboardEntry?.losses ?? matches.filter(m => !m.won).length,
		totalMatches: matches.length,
		cardsOwned: cards.length,
		lastActive: matches[0]?.timestamp ?? 0,
	};
}

// ============================================================
// Optimistic Updates (after own broadcasts)
// ============================================================

export async function applyOptimisticMatchResult(
	username: string,
	opponent: string,
	won: boolean,
): Promise<void> {
	const myEntry = await getPlayerRank(username);
	const oppEntry = await getPlayerRank(opponent);

	const myElo = myEntry?.elo ?? 1000;
	const oppElo = oppEntry?.elo ?? 1000;

	const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
	const delta = Math.round(ELO_K_FACTOR * ((won ? 1 : 0) - expected));
	const newElo = Math.max(ELO_FLOOR, myElo + delta);

	await applyOptimisticElo(
		username,
		newElo,
		won ? 1 : 0,
		won ? 0 : 1,
	);

	const oppNewElo = Math.max(ELO_FLOOR, oppElo - delta);
	await applyOptimisticElo(
		opponent,
		oppNewElo,
		won ? 0 : 1,
		won ? 1 : 0,
	);
}

// ============================================================
// Sync Status
// ============================================================

export interface IndexStatus {
	lastBlock: number;
	lastSyncAt: number;
	totalOps: number;
	healthStatus: string;
}

export async function getIndexStatus(): Promise<IndexStatus> {
	const lastBlock = await getSyncMeta('lastBlock') as number || 0;
	const lastSyncAt = await getSyncMeta('lastSyncAt') as number || 0;
	const totalOps = await getSyncMeta('totalOps') as number || 0;
	const health = await getSyncMeta('healthStatus') as string || 'offline';

	return { lastBlock, lastSyncAt, totalOps, healthStatus: health };
}

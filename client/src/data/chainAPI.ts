/**
 * chainAPI.ts — Client-side fetch wrapper for /api/chain/* endpoints.
 *
 * These endpoints query the server-side chain indexer for global state
 * that the per-account client reader can't provide: leaderboard,
 * opponent ELO, deck verification, cross-account queries.
 */

const API_BASE = import.meta.env.VITE_API_URL || (window.location.origin);

export interface PlayerRecord {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	lastMatchAt: number;
}

export interface MatchRecord {
	matchId: string;
	winner: string;
	loser: string;
	winnerEloBefore: number;
	winnerEloAfter: number;
	loserEloBefore: number;
	loserEloAfter: number;
	timestamp: number;
}

export interface CardRecord {
	uid: string;
	cardId: number;
	owner: string;
	rarity: string;
	level: number;
	xp: number;
}

export interface DeckVerification {
	verified: boolean;
	owned: number[];
	missing: number[];
	totalOwned: number;
}

const FETCH_TIMEOUT_MS = 10_000;

async function fetchJSON<T>(path: string, init?: globalThis.RequestInit): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(`${API_BASE}${path}`, {
			headers: { 'Content-Type': 'application/json' },
			...init,
			signal: controller.signal,
		});
		if (!res.ok) throw new Error(`Chain API ${path}: ${res.status}`);
		return res.json() as Promise<T>;
	} finally {
		clearTimeout(timer);
	}
}

export async function fetchLeaderboard(limit = 100, offset = 0): Promise<{ players: PlayerRecord[]; total: number }> {
	const data = await fetchJSON<{ players: PlayerRecord[]; total: number }>(
		`/api/chain/leaderboard?limit=${limit}&offset=${offset}`
	);
	return data;
}

export async function fetchPlayerProfile(username: string): Promise<{ player: PlayerRecord; matches: MatchRecord[]; indexed: boolean }> {
	return fetchJSON(`/api/chain/player/${encodeURIComponent(username)}`);
}

export async function fetchPlayerElo(username: string): Promise<{ elo: number; confidence: string }> {
	const data = await fetchJSON<{ elo: number; confidence: string }>(
		`/api/chain/player/${encodeURIComponent(username)}/elo`
	);
	return data;
}

export async function fetchPlayerCards(username: string): Promise<CardRecord[]> {
	const data = await fetchJSON<{ cards: CardRecord[] }>(
		`/api/chain/player/${encodeURIComponent(username)}/cards`
	);
	return data.cards;
}

export async function verifyDeck(username: string, cardIds: number[]): Promise<DeckVerification> {
	const data = await fetchJSON<DeckVerification>('/api/chain/verify-deck', {
		method: 'POST',
		body: JSON.stringify({ username, cardIds }),
	});
	return data;
}

export async function registerAccount(username: string): Promise<void> {
	await fetchJSON('/api/chain/register', {
		method: 'POST',
		body: JSON.stringify({ username }),
	}).catch((err) => {
		if (import.meta.env.DEV) console.warn('[chainAPI] registerAccount failed:', err);
	});
}

export async function fetchChainStatus(): Promise<{
	totalPlayers: number;
	totalCards: number;
	totalMatches: number;
	knownAccounts: number;
	lastSyncedAt: number;
}> {
	return fetchJSON('/api/chain/status');
}

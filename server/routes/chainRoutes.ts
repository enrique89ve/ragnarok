/**
 * chainRoutes.ts — REST endpoints for global chain-derived state.
 *
 * Backed by the server-side chain indexer (chainState.ts + chainIndexer.ts).
 * Provides leaderboard, ELO lookup, card ownership, deck verification,
 * and match history — features that require cross-account global state
 * the client-side per-account reader can't provide.
 */

import { Router, Request, Response } from 'express';
import {
	getPlayer,
	getOrCreatePlayer,
	getLeaderboard,
	getCardsByOwner,
	getMatchHistory,
	registerAccount,
	isAccountKnown,
	getStats,
	getKnownAccounts,
} from '../services/chainState';
import { syncAccountNow } from '../services/chainIndexer';
import { isValidHiveUsername } from '../services/hiveAuth';

const MAX_KNOWN_ACCOUNTS = 10_000;
const MAX_CARD_IDS = 100;

const router = Router();

// ---------------------------------------------------------------------------
// GET /leaderboard — global ELO rankings
// ---------------------------------------------------------------------------

router.get('/leaderboard', (req: Request, res: Response) => {
	const limit = Math.min(Math.max(parseInt(req.query.limit as string ?? '100', 10) || 100, 1), 500);
	const offset = Math.max(parseInt(req.query.offset as string ?? '0', 10) || 0, 0);

	const result = getLeaderboard(limit, offset);
	res.json({
		success: true,
		players: result.players,
		total: result.total,
		limit,
		offset,
	});
});

// ---------------------------------------------------------------------------
// GET /player/:username — full player profile
// ---------------------------------------------------------------------------

router.get('/player/:username', async (req: Request, res: Response) => {
	try {
		const { username } = req.params;
		if (!username || !isValidHiveUsername(username)) {
			res.status(400).json({ success: false, error: 'Invalid username' });
			return;
		}

		if (!isAccountKnown(username)) {
			await syncAccountNow(username);
		}

		const player = getPlayer(username) ?? { username, elo: 1000, wins: 0, losses: 0, lastMatchAt: 0 }; // DEFAULT_ELO_RATING
		const matches = getMatchHistory(username, 20);

		res.json({
			success: true,
			player,
			matches,
			indexed: isAccountKnown(username),
		});
	} catch (err) {
		console.error('[chainRoutes] /player/:username error:', err);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// ---------------------------------------------------------------------------
// GET /player/:username/elo — lightweight ELO-only (for matchmaking)
// ---------------------------------------------------------------------------

router.get('/player/:username/elo', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ success: false, error: 'Invalid username' });
		return;
	}

	const player = getPlayer(username);
	const indexed = isAccountKnown(username);

	// Register for future indexing even on read
	if (!indexed) registerAccount(username);

	res.json({
		success: true,
		username,
		elo: player?.elo ?? 1000,
		wins: player?.wins ?? 0,
		losses: player?.losses ?? 0,
		confidence: indexed && player ? 'indexed' : 'default',
	});
});

// ---------------------------------------------------------------------------
// GET /player/:username/cards — NFTs owned by player
// ---------------------------------------------------------------------------

router.get('/player/:username/cards', async (req: Request, res: Response) => {
	try {
		const { username } = req.params;
		if (!username || !isValidHiveUsername(username)) {
			res.status(400).json({ success: false, error: 'Invalid username' });
			return;
		}

		if (!isAccountKnown(username)) {
			await syncAccountNow(username);
		}

		const cards = getCardsByOwner(username);
		res.json({
			success: true,
			username,
			cards,
			total: cards.length,
		});
	} catch (err) {
		console.error('[chainRoutes] /player/:username/cards error:', err);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// ---------------------------------------------------------------------------
// GET /player/:username/matches — match history
// ---------------------------------------------------------------------------

router.get('/player/:username/matches', (req: Request, res: Response) => {
	const { username } = req.params;
	const limit = Math.min(Math.max(parseInt(req.query.limit as string ?? '20', 10) || 20, 1), 100);

	const matches = getMatchHistory(username, limit);
	res.json({
		success: true,
		username,
		matches,
		total: matches.length,
	});
});

// ---------------------------------------------------------------------------
// POST /verify-deck — check if player owns cards with given template IDs
// ---------------------------------------------------------------------------

router.post('/verify-deck', async (req: Request, res: Response) => {
	try {
		const { username, cardIds } = req.body as { username?: string; cardIds?: number[] };

		if (!username || !isValidHiveUsername(username)) {
			res.status(400).json({ success: false, error: 'Valid username required' });
			return;
		}
		if (!Array.isArray(cardIds) || cardIds.length === 0 || cardIds.length > MAX_CARD_IDS) {
			res.status(400).json({ success: false, error: `cardIds[] required (max ${MAX_CARD_IDS})` });
			return;
		}
		if (!cardIds.every(id => typeof id === 'number' && Number.isFinite(id))) {
			res.status(400).json({ success: false, error: 'All cardIds must be finite numbers' });
			return;
		}

		if (!isAccountKnown(username)) {
			await syncAccountNow(username);
		}

		const ownedCards = getCardsByOwner(username);

		// Build a count map: cardId → number of owned copies
		const ownedCounts = new Map<number, number>();
		for (const c of ownedCards) {
			ownedCounts.set(c.cardId, (ownedCounts.get(c.cardId) ?? 0) + 1);
		}

		// Track requested counts to detect multi-copy violations
		const requestedCounts = new Map<number, number>();
		for (const id of cardIds) {
			requestedCounts.set(id, (requestedCounts.get(id) ?? 0) + 1);
		}

		const owned: number[] = [];
		const missing: number[] = [];
		for (const [id, requested] of requestedCounts) {
			const available = ownedCounts.get(id) ?? 0;
			if (available >= requested) {
				owned.push(id);
			} else {
				missing.push(id);
			}
		}

		res.json({
			success: true,
			verified: missing.length === 0,
			owned,
			missing,
			totalOwned: ownedCards.length,
		});
	} catch (err) {
		console.error('[chainRoutes] /verify-deck error:', err);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// ---------------------------------------------------------------------------
// POST /register — register an account for indexing
// ---------------------------------------------------------------------------

router.post('/register', (req: Request, res: Response) => {
	const { username } = req.body as { username?: string };
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ success: false, error: 'Invalid username' });
		return;
	}

	if (getKnownAccounts().length >= MAX_KNOWN_ACCOUNTS) {
		res.status(503).json({ success: false, error: 'Account registry full' });
		return;
	}

	const isNew = registerAccount(username);
	getOrCreatePlayer(username);

	res.json({ success: true, registered: isNew, username });
});

// ---------------------------------------------------------------------------
// GET /status — indexer health
// ---------------------------------------------------------------------------

router.get('/status', (_req: Request, res: Response) => {
	const stats = getStats();
	res.json({ success: true, ...stats });
});

export default router;

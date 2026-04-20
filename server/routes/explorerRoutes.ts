/**
 * explorerRoutes.ts — Public NFT Explorer REST API.
 *
 * NFTLox-compatible endpoint structure for browsing Ragnarok NFTs,
 * player profiles, marketplace listings, and protocol statistics.
 * All data is derived from chain replay (chainState.ts).
 *
 * Endpoints:
 *   GET /health          — sync-aware health check
 *   GET /status          — indexer sync progress and protocol info
 *   GET /stats           — aggregate protocol statistics
 *
 *   GET /nfts            — paginated NFT list with rarity filter
 *   GET /nfts/:uid       — single NFT by UID
 *
 *   GET /users/:username             — player profile (ELO, wins, losses)
 *   GET /users/:username/nfts        — player's NFT collection
 *   GET /users/:username/nfts/count  — NFT count breakdown by rarity
 *   GET /users/:username/matches     — match history
 *   GET /users/:username/tokens      — RUNE token balance
 *
 *   GET /marketplace/listings        — active marketplace listings
 *   GET /marketplace/listings/:id    — single listing
 *   GET /marketplace/offers/:nftUid  — offers on a specific NFT
 *
 *   GET /leaderboard     — global ELO rankings
 *   GET /supply          — per-rarity supply counters
 */

import { Router, Request, Response } from 'express';
import {
	getPlayer,
	getOrCreatePlayer,
	getLeaderboard,
	getCardsByOwner,
	getMatchHistory,
	getStats,
	getExplorerStats,
	getNftByUid,
	getNftsByRarity,
	getUserNftCounts,
	getActiveListings,
	getMarketListing,
	getOffersByNft,
	getListingsBySeller,
	getOffersByBuyer,
	getAllSupplyCounters,
	getTokenBalance,
	getAllTokenBalances,
	getGenesisState,
	getBlockCursor,
	isAccountKnown,
	registerAccount,
} from '../services/chainState';
import { isValidHiveUsername } from '../services/hiveAuth';

const router = Router();

function clampInt(val: string | undefined, def: number, min: number, max: number): number {
	const n = parseInt(val as string, 10);
	if (!Number.isFinite(n)) return def;
	return Math.min(Math.max(n, min), max);
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

router.get('/health', (_req: Request, res: Response) => {
	const stats = getStats();
	const secondsSinceUpdate = stats.lastSyncedAt
		? Math.floor((Date.now() - stats.lastSyncedAt) / 1000)
		: -1;
	const inSync = secondsSinceUpdate >= 0 && secondsSinceUpdate < 120;
	const status = inSync ? 'healthy' : 'degraded';

	res.status(inSync ? 200 : 503).json({
		status,
		db: 'ok',
		sync: inSync ? 'active' : 'stale',
		inSync,
		lastBlock: stats.lastIrreversibleBlockProcessed,
		secondsSinceUpdate,
	});
});

router.get('/status', (_req: Request, res: Response) => {
	const genesis = getGenesisState();
	res.json({
		protocolVersion: '1.2.0',
		protocolId: 'ragnarok-cards',
		genesisBlock: genesis?.sealBlock ?? null,
		sealed: genesis?.sealed ?? false,
		lastBlock: getBlockCursor(),
		inSync: true,
	});
});

router.get('/stats', (_req: Request, res: Response) => {
	const stats = getExplorerStats();
	res.json(stats);
});

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------

router.get('/nfts', (req: Request, res: Response) => {
	const limit = clampInt(req.query.limit as string, 50, 1, 200);
	const offset = clampInt(req.query.offset as string, 0, 0, 100000);
	const rarity = req.query.rarity as string | undefined;

	if (rarity) {
		const result = getNftsByRarity(rarity, limit, offset);
		res.json({ nfts: result.nfts, total: result.total, limit, offset });
	} else {
		const result = getNftsByRarity('', limit, offset);
		res.json({ nfts: result.nfts, total: result.total, limit, offset });
	}
});

router.get('/nfts/:uid', (req: Request, res: Response) => {
	const nft = getNftByUid(req.params.uid);
	if (!nft) {
		res.status(404).json({ error: 'NFT not found' });
		return;
	}
	res.json(nft);
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

router.get('/users/:username', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}

	if (!isAccountKnown(username)) registerAccount(username);

	const player = getPlayer(username) ?? { username, elo: 1000, wins: 0, losses: 0, lastMatchAt: 0 };
	const nftCounts = getUserNftCounts(username);
	const balance = getTokenBalance(username);

	res.json({
		username,
		elo: player.elo,
		wins: player.wins,
		losses: player.losses,
		lastMatchAt: player.lastMatchAt,
		nftCount: nftCounts.total,
		nftsByRarity: nftCounts.byRarity,
		runeBalance: balance?.RUNE ?? 0,
		indexed: isAccountKnown(username),
	});
});

router.get('/users/:username/nfts', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}

	const limit = clampInt(req.query.limit as string, 50, 1, 200);
	const offset = clampInt(req.query.offset as string, 0, 0, 100000);
	const rarity = req.query.rarity as string | undefined;

	let cards = getCardsByOwner(username);
	if (rarity) cards = cards.filter(c => c.rarity === rarity);

	const total = cards.length;
	const paginated = cards.slice(offset, offset + limit);

	res.json({ username, nfts: paginated, total, limit, offset });
});

router.get('/users/:username/nfts/count', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}

	const counts = getUserNftCounts(username);
	res.json({ username, ...counts });
});

router.get('/users/:username/matches', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}

	const limit = clampInt(req.query.limit as string, 20, 1, 100);
	const matches = getMatchHistory(username, limit);
	res.json({ username, matches, total: matches.length });
});

router.get('/users/:username/tokens', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}

	const balance = getTokenBalance(username);
	res.json({ username, RUNE: balance?.RUNE ?? 0 });
});

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

router.get('/marketplace/listings', (req: Request, res: Response) => {
	const sort = (req.query.sort as string) || 'recent';
	const currency = req.query.currency as 'HIVE' | 'HBD' | undefined;
	const limit = clampInt(req.query.limit as string, 50, 1, 200);
	const offset = clampInt(req.query.offset as string, 0, 0, 100000);

	const validSorts = ['price_asc', 'price_desc', 'recent'] as const;
	const sortKey = validSorts.includes(sort as typeof validSorts[number])
		? sort as typeof validSorts[number]
		: 'recent';

	const result = getActiveListings(sortKey, currency, limit, offset);
	res.json({ listings: result.listings, total: result.total, limit, offset });
});

router.get('/marketplace/listings/:id', (req: Request, res: Response) => {
	const listing = getMarketListing(req.params.id);
	if (!listing) {
		res.status(404).json({ error: 'Listing not found' });
		return;
	}
	res.json(listing);
});

router.get('/marketplace/offers/:nftUid', (req: Request, res: Response) => {
	const offers = getOffersByNft(req.params.nftUid);
	res.json({ nftUid: req.params.nftUid, offers, total: offers.length });
});

router.get('/marketplace/user/:username/listings', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}
	const listings = getListingsBySeller(username);
	res.json({ username, listings, total: listings.length });
});

router.get('/marketplace/user/:username/offers', (req: Request, res: Response) => {
	const { username } = req.params;
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ error: 'Invalid username' });
		return;
	}
	const offers = getOffersByBuyer(username);
	res.json({ username, offers, total: offers.length });
});

// ---------------------------------------------------------------------------
// Leaderboard & Supply
// ---------------------------------------------------------------------------

router.get('/leaderboard', (req: Request, res: Response) => {
	const limit = clampInt(req.query.limit as string, 50, 1, 200);
	const offset = clampInt(req.query.offset as string, 0, 0, 100000);

	const result = getLeaderboard(limit, offset);
	res.json({ players: result.players, total: result.total, limit, offset });
});

router.get('/supply', (_req: Request, res: Response) => {
	const counters = getAllSupplyCounters();
	res.json({ supply: counters });
});

router.get('/token-balances', (req: Request, res: Response) => {
	const limit = clampInt(req.query.limit as string, 50, 1, 200);
	const offset = clampInt(req.query.offset as string, 0, 0, 100000);

	const result = getAllTokenBalances(limit, offset);
	res.json({ balances: result.balances, total: result.total, limit, offset });
});

export default router;

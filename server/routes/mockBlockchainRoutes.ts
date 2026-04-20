/**
 * mockBlockchainRoutes.ts
 *
 * In-memory mock of the Hive blockchain for local/test mode.
 * Simulates all operations that will eventually go on-chain:
 *   - NFT minting (genesis distribution simulation)
 *   - Ownership tracking
 *   - Match result recording
 *   - Card XP/level progression
 *   - Player ELO stats
 *   - Ownership transfers
 *
 * DATA_LAYER_MODE = 'test' → client hits these endpoints instead of real Hive.
 * Switch to DATA_LAYER_MODE = 'hive' when ready for the real chain.
 *
 * All data is in-memory (resets on server restart).
 * Use POST /api/mock-blockchain/dump to export state as JSON for review.
 * Use POST /api/mock-blockchain/reset to wipe state between test runs.
 */

import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import type {
	NFTMetadata,
	PackagedMatchResult,
	CardXPReward,
} from '../../client/src/data/blockchain/types';

// ---------------------------------------------------------------------------
// Hashing helpers (mirrors client hashUtils.ts, using Node crypto)
// ---------------------------------------------------------------------------

function sortKeys(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return (obj as unknown[]).map(sortKeys);
	if (typeof obj === 'object') {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
			sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return obj;
}

function sha256(data: string): string {
	return createHash('sha256').update(data).digest('hex');
}

function hashObject(obj: unknown): string {
	return sha256(JSON.stringify(sortKeys(obj)));
}

const router = Router();

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

interface OwnershipRecord {
	uid: string;
	cardId: number;
	ownerId: string;
	mintNumber: number;
	maxSupply: number;
	edition: string;
	foil: string;
	mintedAt: number;
	mintedBy: string;
}

interface MutableCardRecord {
	uid: string;
	xp: number;
	level: number;
	lastUpdateBlock: number;
}

interface PlayerStats {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	totalMatches: number;
}

interface MockBlockchainState {
	nfts: Map<string, NFTMetadata>;
	ownership: Map<string, OwnershipRecord>;
	mutableState: Map<string, MutableCardRecord>;
	matchResults: Map<string, PackagedMatchResult>;
	playerStats: Map<string, PlayerStats>;
	supplyCounters: Map<number, number>;
	blockCounter: number;
}

const state: MockBlockchainState = {
	nfts: new Map(),
	ownership: new Map(),
	mutableState: new Map(),
	matchResults: new Map(),
	playerStats: new Map(),
	supplyCounters: new Map(),
	blockCounter: 1000000,
};

function nextBlock(): number {
	return ++state.blockCounter;
}

function fakeTrxId(prefix: string): string {
	return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(36).substr(2, 8)}`;
}

function getOrCreateStats(username: string): PlayerStats {
	if (!state.playerStats.has(username)) {
		state.playerStats.set(username, {
			username,
			elo: 1000,
			wins: 0,
			losses: 0,
			totalMatches: 0,
		});
	}
	return state.playerStats.get(username)!;
}

// ---------------------------------------------------------------------------
// POST /mint — batch-mint NFTs into a player's collection
// ---------------------------------------------------------------------------
// Body: { username: string, cards: Array<{ cardDef: CardDefinition, mintInfo: MintInfo }> }
// Returns: { minted: NFTMetadata[], trxId: string, blockNum: number }

interface MintCardInput {
	cardId: number;
	name: string;
	type: string;
	rarity: string;
	heroClass?: string;
	attack?: number;
	health?: number;
	manaCost?: number;
	keywords?: string[];
	description?: string;
	edition?: 'alpha' | 'beta' | 'promo';
	foil?: 'standard' | 'gold';
	maxSupply?: number;
	race?: string;
	set?: string;
	flavorText?: string;
	collectible?: boolean;
}

router.post('/mint', async (req: Request, res: Response) => {
	const { username, cards } = req.body as {
		username: string;
		cards: MintCardInput[];
	};

	if (!username || !Array.isArray(cards) || cards.length === 0) {
		res.status(400).json({ error: 'username and cards[] required' });
		return;
	}

	const blockNum = nextBlock();
	const trxId = fakeTrxId('mint');
	const minted: NFTMetadata[] = [];

	for (const card of cards) {
		const currentSupply = state.supplyCounters.get(card.cardId) ?? 0;
		const maxSupply = card.maxSupply ?? 1000;

		if (currentSupply >= maxSupply) {
			continue; // skip — supply cap reached
		}

		const mintNumber = currentSupply + 1;
		state.supplyCounters.set(card.cardId, mintNumber);

		const uid = `nft_${card.cardId}_${mintNumber}_${blockNum}`;
		const edition = card.edition ?? 'alpha';
		const foil = card.foil ?? 'standard';

		// Build metadata (hash stubbed as sha256 would need crypto — use fake hash for mock)
		const metaWithoutHash: Omit<NFTMetadata, 'hash'> = {
			uid,
			cardId: card.cardId,
			templateVersion: 2,
			name: card.name,
			type: card.type,
			rarity: card.rarity,
			heroClass: card.heroClass ?? 'neutral',
			stats: {
				attack: card.attack,
				health: card.health,
				manaCost: card.manaCost,
			},
			keywords: card.keywords ?? [],
			description: card.description ?? '',
			edition,
			foil,
			mintNumber,
			maxSupply,
			mintedAt: blockNum,
			mintedBy: 'ragnarok',
			image: '',
			externalUrl: `https://ragnarok.cards/card/${card.cardId}`,
			race: card.race ?? 'none',
			set: card.set ?? 'core',
			flavorText: card.flavorText ?? '',
			collectible: card.collectible !== false,
			collection: { name: 'Ragnarok Cards', family: 'Genesis' },
			attributes: [
				{ trait_type: 'Rarity', value: card.rarity },
				{ trait_type: 'Type', value: card.type },
				{ trait_type: 'Class', value: card.heroClass ?? 'neutral' },
				{ trait_type: 'Edition', value: edition },
			],
		};
		// Use the same canonical SHA-256 as the client's hashNFTMetadata()
		const hash = hashObject(metaWithoutHash);
		const metadata: NFTMetadata = { ...metaWithoutHash, hash };

		state.nfts.set(uid, metadata);
		state.ownership.set(uid, {
			uid,
			cardId: card.cardId,
			ownerId: username,
			mintNumber,
			maxSupply,
			edition,
			foil,
			mintedAt: blockNum,
			mintedBy: 'ragnarok',
		});
		state.mutableState.set(uid, {
			uid,
			xp: 0,
			level: 1,
			lastUpdateBlock: blockNum,
		});

		minted.push(metadata);
	}

	res.json({ minted, count: minted.length, trxId, blockNum });
});

// ---------------------------------------------------------------------------
// GET /collection/:username — get all NFTs owned by a player
// ---------------------------------------------------------------------------

router.get('/collection/:username', (req: Request, res: Response) => {
	const { username } = req.params;
	const owned: Array<NFTMetadata & { xp: number; level: number }> = [];

	for (const [uid, ownerRec] of state.ownership.entries()) {
		if (ownerRec.ownerId !== username) continue;

		const meta = state.nfts.get(uid);
		if (!meta) continue;

		const mutable = state.mutableState.get(uid) ?? { xp: 0, level: 1, lastUpdateBlock: 0 };
		owned.push({ ...meta, xp: mutable.xp, level: mutable.level });
	}

	res.json({ username, cards: owned, total: owned.length });
});

// ---------------------------------------------------------------------------
// GET /nft/:uid — single NFT details
// ---------------------------------------------------------------------------

router.get('/nft/:uid', (req: Request, res: Response) => {
	const { uid } = req.params;
	const meta = state.nfts.get(uid);
	if (!meta) {
		res.status(404).json({ error: 'NFT not found' });
		return;
	}
	const owner = state.ownership.get(uid);
	const mutable = state.mutableState.get(uid);
	res.json({ ...meta, owner: owner?.ownerId, xp: mutable?.xp ?? 0, level: mutable?.level ?? 1 });
});

// ---------------------------------------------------------------------------
// GET /supply/:cardId — how many of this card have been minted
// ---------------------------------------------------------------------------

router.get('/supply/:cardId', (req: Request, res: Response): void => {
	const cardId = parseInt(req.params.cardId, 10);
	if (Number.isNaN(cardId)) { res.status(400).json({ error: 'Invalid cardId' }); return; }
	const minted = state.supplyCounters.get(cardId) ?? 0;
	res.json({ cardId, minted });
});

// ---------------------------------------------------------------------------
// POST /match-result — record a completed match
// ---------------------------------------------------------------------------
// Body: PackagedMatchResult

router.post('/match-result', (req: Request, res: Response) => {
	const result = req.body as PackagedMatchResult;

	if (!result?.matchId || !result?.winner?.username) {
		res.status(400).json({ error: 'Invalid match result payload' });
		return;
	}

	if (state.matchResults.has(result.matchId)) {
		res.status(409).json({ error: 'Match already recorded', matchId: result.matchId });
		return;
	}

	state.matchResults.set(result.matchId, result);

	// Update ELO
	const winnerStats = getOrCreateStats(result.winner.username);
	winnerStats.elo = result.eloChanges.winner.after;
	winnerStats.wins += 1;
	winnerStats.totalMatches += 1;

	const loserStats = getOrCreateStats(result.loser.username);
	loserStats.elo = result.eloChanges.loser.after;
	loserStats.losses += 1;
	loserStats.totalMatches += 1;

	const blockNum = nextBlock();
	const trxId = fakeTrxId('match');

	res.json({
		ok: true,
		matchId: result.matchId,
		trxId,
		blockNum,
		eloUpdate: {
			winner: { username: result.winner.username, elo: winnerStats.elo },
			loser: { username: result.loser.username, elo: loserStats.elo },
		},
	});
});

// ---------------------------------------------------------------------------
// POST /xp-update — update card XP/level after a match
// ---------------------------------------------------------------------------
// Body: CardXPReward

router.post('/xp-update', (req: Request, res: Response) => {
	const reward = req.body as CardXPReward;

	if (!reward?.cardUid) {
		res.status(400).json({ error: 'cardUid required' });
		return;
	}

	const blockNum = nextBlock();
	const existing = state.mutableState.get(reward.cardUid);

	if (!existing) {
		// Card not in mock DB — create placeholder
		state.mutableState.set(reward.cardUid, {
			uid: reward.cardUid,
			xp: reward.xpAfter,
			level: reward.levelAfter,
			lastUpdateBlock: blockNum,
		});
	} else {
		existing.xp = reward.xpAfter;
		existing.level = reward.levelAfter;
		existing.lastUpdateBlock = blockNum;
	}

	const trxId = fakeTrxId('xp');
	res.json({ ok: true, uid: reward.cardUid, xp: reward.xpAfter, level: reward.levelAfter, trxId, blockNum });
});

// ---------------------------------------------------------------------------
// POST /transfer — transfer ownership of an NFT
// ---------------------------------------------------------------------------
// Body: { uid: string, fromUsername: string, toUsername: string }

router.post('/transfer', (req: Request, res: Response) => {
	const { uid, fromUsername, toUsername } = req.body as {
		uid: string;
		fromUsername: string;
		toUsername: string;
	};

	if (!uid || !fromUsername || !toUsername) {
		res.status(400).json({ error: 'uid, fromUsername, toUsername required' });
		return;
	}

	const ownerRecord = state.ownership.get(uid);
	if (!ownerRecord) {
		res.status(404).json({ error: 'NFT not found' });
		return;
	}

	if (ownerRecord.ownerId !== fromUsername) {
		res.status(403).json({ error: 'Not the current owner', currentOwner: ownerRecord.ownerId });
		return;
	}

	const blockNum = nextBlock();
	ownerRecord.ownerId = toUsername;

	const mutable = state.mutableState.get(uid);
	if (mutable) {
		mutable.lastUpdateBlock = blockNum;
	}

	const trxId = fakeTrxId('transfer');
	res.json({ ok: true, uid, from: fromUsername, to: toUsername, trxId, blockNum });
});

// ---------------------------------------------------------------------------
// GET /stats/:username — player ELO and match stats
// ---------------------------------------------------------------------------

router.get('/stats/:username', (req: Request, res: Response) => {
	const { username } = req.params;
	const stats = state.playerStats.get(username) ?? {
		username,
		elo: 1000,
		wins: 0,
		losses: 0,
		totalMatches: 0,
	};
	res.json(stats);
});

// ---------------------------------------------------------------------------
// GET /match-history/:username — recent matches for a player
// ---------------------------------------------------------------------------

router.get('/match-history/:username', (req: Request, res: Response) => {
	const { username } = req.params;
	const limit = Math.min(Math.max(parseInt(req.query.limit as string ?? '20', 10) || 20, 1), 100);

	const matches: PackagedMatchResult[] = [];
	for (const result of state.matchResults.values()) {
		if (result.winner.username === username || result.loser.username === username) {
			matches.push(result);
		}
	}

	matches.sort((a, b) => b.timestamp - a.timestamp);
	res.json({ username, matches: matches.slice(0, limit), total: matches.length });
});

// ---------------------------------------------------------------------------
// POST /reset — wipe all state (for testing)
// ---------------------------------------------------------------------------

router.post('/reset', (_req: Request, res: Response) => {
	state.nfts.clear();
	state.ownership.clear();
	state.mutableState.clear();
	state.matchResults.clear();
	state.playerStats.clear();
	state.supplyCounters.clear();
	state.blockCounter = 1000000;
	res.json({ ok: true, message: 'Mock blockchain state wiped' });
});

// ---------------------------------------------------------------------------
// GET /dump — export full state as JSON (debug)
// ---------------------------------------------------------------------------

router.get('/dump', (_req: Request, res: Response) => {
	res.json({
		blockCounter: state.blockCounter,
		nfts: Object.fromEntries(state.nfts),
		ownership: Object.fromEntries(state.ownership),
		mutableState: Object.fromEntries(state.mutableState),
		matchResults: Object.fromEntries(state.matchResults),
		playerStats: Object.fromEntries(state.playerStats),
		supplyCounters: Object.fromEntries(state.supplyCounters),
	});
});

// ---------------------------------------------------------------------------
// GET /status — quick health check
// ---------------------------------------------------------------------------

router.get('/status', (_req: Request, res: Response) => {
	res.json({
		mode: 'mock',
		blockCounter: state.blockCounter,
		counts: {
			nfts: state.nfts.size,
			owners: state.ownership.size,
			matchResults: state.matchResults.size,
			players: state.playerStats.size,
		},
	});
});

export default router;

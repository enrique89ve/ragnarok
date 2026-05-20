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
	getRuneAccountSummary,
	getEitrAccountSummary,
	registerAccount,
	isAccountKnown,
	getStats,
	getKnownAccountCount,
} from '../services/chainState';
import { syncAccountNow } from '../services/indexerManager';
import { isValidHiveUsername } from '../services/hiveAuth';
import { createValidationMiddleware } from '../middleware/validation';
import { z } from 'zod';
import {
	deleteByMatchId,
	enqueue,
	fetchByMatchId,
	getWitnessPubkey,
	sweepExpired,
} from '../services/matchPendingQueue';
import { getBlockCursor } from '../services/chainState';
import { TESTNET_RUNE_SEASON_ID } from '../../shared/protocol-core/types';
import {
	buildPlayerCollection,
} from '../../shared/protocol-core/playerCollection';
import {
	parseDeckCardClaims,
	toDeckClaimsFromLegacyCardIds,
	verifyDeckClaims,
	type DeckCardClaim,
	type DeckRejection,
	type VerifiedDeckCard,
} from '../../shared/protocol-core/deckVerification';
import runeRoutes from './runeRoutes';
import eitrRoutes from './eitrRoutes';
import { getRagnarokServerRuntimeConfig } from '../services/runtimeConfig';
import { getQaFullCatalogCardsForServerRuntime } from '../services/qaFullCatalogEntitlement';

const MAX_KNOWN_ACCOUNTS = 10_000;
const MAX_CARD_IDS = 100;
const SEASON_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

const router = Router();

type DeckVerificationRequest =
	| { status: 'valid'; version: 'legacy'; username: string; cardIds: number[] }
	| { status: 'valid'; version: 2; username: string; claims: readonly DeckCardClaim[]; parseRejections: readonly DeckRejection[] }
	| { status: 'invalid'; code: number; error: string };

type SeasonIdValidation =
	| { status: 'valid'; value: string }
	| { status: 'invalid'; code: number; error: string };

function hasAccountRegistryCapacity(username: string): boolean {
	return isAccountKnown(username) || getKnownAccountCount() < MAX_KNOWN_ACCOUNTS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getSingleQueryValue(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
	return undefined;
}

function validateSeasonId(value: unknown): SeasonIdValidation {
	const raw = getSingleQueryValue(value) ?? TESTNET_RUNE_SEASON_ID;
	if (!SEASON_ID_RE.test(raw)) {
		return { status: 'invalid', code: 400, error: 'Invalid seasonId' };
	}
	return { status: 'valid', value: raw };
}

const DeckVerificationSchema = z.discriminatedUnion('version', [
	z.object({
		version: z.literal('legacy').default('legacy'),
		username: z.string().refine(isValidHiveUsername),
		cardIds: z.array(z.number()).min(1).max(MAX_CARD_IDS),
	}),
	z.object({
		version: z.literal(2),
		username: z.string().refine(isValidHiveUsername),
		claims: z.array(z.any()).optional(), // Detailed parsing happens in parseDeckCardClaims
		protocolVersion: z.literal(2),
	}),
	z.object({
		version: z.literal('starter-shortcut'),
		username: z.string().refine(isValidHiveUsername),
		heroClass: z.string(),
	}),
]);

type DeckVerificationBody = z.infer<typeof DeckVerificationSchema>;

function buildCollectionForOwner(username: string) {
	const ownedCards = getCardsByOwner(username);
	const runtimeConfig = getRagnarokServerRuntimeConfig();
	return {
		ownedCards,
		collection: buildPlayerCollection({
			nftCards: ownedCards.map(card => ({
				nftUid: card.uid,
				cardId: card.cardId,
				owner: card.owner,
				xp: card.xp,
				level: card.level,
			})),
			qaFullCatalogCards: getQaFullCatalogCardsForServerRuntime(runtimeConfig),
		}),
	};
}

function cardIdsFromVerifiedCards(cards: readonly VerifiedDeckCard[]): number[] {
	return [...new Set(cards.map(card => card.cardId))];
}

function legacyMissingCardIds(
	cardIds: readonly number[],
	rejections: readonly DeckRejection[],
): number[] {
	const missing = new Set<number>();
	for (const rejection of rejections) {
		if (rejection.cardId !== undefined) {
			missing.add(rejection.cardId);
			continue;
		}
		missing.add(cardIds[rejection.slotIndex] ?? -1);
	}
	return [...missing].filter(cardId => cardId > 0);
}

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

		if (!hasAccountRegistryCapacity(username)) {
			res.status(503).json({ success: false, error: 'Account registry full' });
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

	// Register for future indexing even on read, bounded to protect RAM.
	if (!indexed && hasAccountRegistryCapacity(username)) registerAccount(username);

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
// GET /player/:username/rune — RUNE balance and ledger summary
// ---------------------------------------------------------------------------

router.get('/player/:username/rune', async (req: Request, res: Response) => {
	try {
		const { username } = req.params;
		if (!username || !isValidHiveUsername(username)) {
			res.status(400).json({ success: false, error: 'Invalid username' });
			return;
		}

		const seasonId = validateSeasonId(req.query.seasonId);
		if (seasonId.status === 'invalid') {
			res.status(seasonId.code).json({ success: false, error: seasonId.error });
			return;
		}

		if (!hasAccountRegistryCapacity(username)) {
			res.status(503).json({ success: false, error: 'Account registry full' });
			return;
		}

		if (!isAccountKnown(username)) {
			await syncAccountNow(username);
		}

		const summary = getRuneAccountSummary(username, seasonId.value);
		res.json({
			success: true,
			username,
			seasonId: seasonId.value,
			runeBalance: summary.runeBalance,
			credits: summary.credits,
			debits: summary.debits,
			drift: summary.drift,
			lastBlock: summary.lastBlock,
			indexed: summary.indexed,
		});
	} catch (err) {
		console.error('[chainRoutes] /player/:username/rune error:', err);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// ---------------------------------------------------------------------------
// GET /player/:username/eitr — Eitr balance and ledger summary (ADR 0001)
// ---------------------------------------------------------------------------

router.get('/player/:username/eitr', async (req: Request, res: Response) => {
	try {
		const { username } = req.params;
		if (!username || !isValidHiveUsername(username)) {
			res.status(400).json({ success: false, error: 'Invalid username' });
			return;
		}

		const seasonId = validateSeasonId(req.query.seasonId);
		if (seasonId.status === 'invalid') {
			res.status(seasonId.code).json({ success: false, error: seasonId.error });
			return;
		}

		if (!hasAccountRegistryCapacity(username)) {
			res.status(503).json({ success: false, error: 'Account registry full' });
			return;
		}

		if (!isAccountKnown(username)) {
			await syncAccountNow(username);
		}

		const summary = getEitrAccountSummary(username, seasonId.value);
		res.json({
			success: true,
			username,
			seasonId: seasonId.value,
			eitrBalance: summary.eitrBalance,
			credits: summary.credits,
			debits: summary.debits,
			lastBlock: summary.lastBlock,
			indexed: summary.indexed,
		});
	} catch (err) {
		console.error('[chainRoutes] /player/:username/eitr error:', err);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
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

		if (!hasAccountRegistryCapacity(username)) {
			res.status(503).json({ success: false, error: 'Account registry full' });
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
	if (!username || !isValidHiveUsername(username)) {
		res.status(400).json({ success: false, error: 'Invalid username' });
		return;
	}

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
router.post('/verify-deck', createValidationMiddleware(DeckVerificationSchema), async (req: Request, res: Response) => {
	try {
		const body = req.body as DeckVerificationBody;
		const { username } = body;

		if (!hasAccountRegistryCapacity(username)) {
			res.status(503).json({ success: false, error: 'Account registry full' });
			return;
		}

		if (!isAccountKnown(username)) {
			await syncAccountNow(username);
		}

		// Shortcut: Predefined Starter Decks
		if (body.version === 'starter-shortcut') {
			const { isStarterHeroClass } = await import('../../shared/schemas/starterEntitlement');
			if (!isStarterHeroClass(body.heroClass)) {
				res.status(400).json({ success: false, error: 'Invalid starter hero class' });
				return;
			}
			res.json({
				success: true,
				verified: true,
				version: 'starter-shortcut',
				heroClass: body.heroClass,
				totalOwned: 45, // Universal starters
			});
			return;
		}

		const { ownedCards, collection } = buildCollectionForOwner(username);

		if (body.version === 2) {
			const parsed = parseDeckCardClaims(body.claims);
			if (parsed.status === 'rejected' && parsed.rejections.length > 0) {
				res.json({
					success: true,
					protocolVersion: 2,
					verified: false,
					verifiedCards: [],
					rejections: parsed.rejections,
					totalOwned: collection.length,
				});
				return;
			}

			const decision = verifyDeckClaims({
				claims: parsed.claims,
				collection,
			});

			res.json({
				success: true,
				protocolVersion: 2,
				verified: decision.status === 'verified',
				verifiedCards: decision.cards,
				rejections: decision.status === 'rejected' ? decision.rejections : [],
				totalOwned: collection.length,
			});
			return;
		}

		// Legacy version
		const parsed = toDeckClaimsFromLegacyCardIds(body.cardIds);
		const decision = parsed.status === 'parsed'
			? verifyDeckClaims({ claims: parsed.claims, collection })
			: { status: 'rejected' as const, cards: [], rejections: parsed.rejections };
		const rejections = decision.status === 'rejected' ? decision.rejections : [];
		const owned = cardIdsFromVerifiedCards(decision.cards);
		const missing = legacyMissingCardIds(body.cardIds, rejections);

		res.json({
			success: true,
			verified: decision.status === 'verified',
			owned,
			missing,
			totalOwned: ownedCards.length,
			protocolVersion: 1,
			rejections,
		});
	} catch (err) {
		console.error('[chainRoutes] /verify-deck error:', err);
		res.status(500).json({ success: false, error: 'Internal server error' });
	}
});

// ---------------------------------------------------------------------------
// POST /register — register an account for indexing
// ---------------------------------------------------------------------------

const RegisterRequestSchema = z.object({
	username: z.string().refine(isValidHiveUsername),
});

router.post('/register', createValidationMiddleware(RegisterRequestSchema), (req: Request, res: Response) => {
	const { username } = req.body as z.infer<typeof RegisterRequestSchema>;

	if (getKnownAccountCount() >= MAX_KNOWN_ACCOUNTS) {
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

// ---------------------------------------------------------------------------
// /match/pending — server pending queue for offline-opponent envelopes
// (ADR 0004 §Decision.3, issue 05). Witness-signs the deposit timestamp,
// holds for 100 blocks (~5 min). Server never opens the inner envelope —
// it's opaque JSONB. Per DECISIONS.md §D4, signing uses the Hive Posting
// key configured in env vars.
// ---------------------------------------------------------------------------

const MATCH_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

interface MatchPendingBody {
	matchId?: unknown;
	envelope?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

router.post('/match/pending', async (req: Request, res: Response) => {
	const body = req.body as MatchPendingBody;
	if (typeof body?.matchId !== 'string' || !MATCH_ID_RE.test(body.matchId)) {
		res.status(400).json({ success: false, error: 'Invalid matchId' });
		return;
	}
	if (!isPlainObject(body.envelope)) {
		res.status(400).json({ success: false, error: 'envelope must be a JSON object' });
		return;
	}
	// Pre-emptive sweep: free TTL'd rows before insertion. Cheap; the queue
	// is tiny in steady state.
	const head = Math.max(getBlockCursor(), 1);
	await sweepExpired(head);
	try {
		const record = await enqueue(body.matchId, body.envelope, head);
		res.json({
			success: true,
			queuedAt: record.queuedAt,
			ttlBlocks: record.expiresAt - record.queuedAt,
			witnessSig: record.witnessSig,
		});
	} catch (err) {
		res.status(503).json({
			success: false,
			error: `Witness signing unavailable: ${err instanceof Error ? err.message : 'unknown'}`,
		});
	}
});

router.get('/match/pending/:matchId', async (req: Request, res: Response) => {
	const { matchId } = req.params;
	if (!MATCH_ID_RE.test(matchId)) {
		res.status(400).json({ success: false, error: 'Invalid matchId' });
		return;
	}
	await sweepExpired(Math.max(getBlockCursor(), 1));
	const record = await fetchByMatchId(matchId);
	if (!record) {
		res.status(404).json({ success: false, error: 'No pending envelope for this matchId' });
		return;
	}
	res.json({
		success: true,
		matchId: record.matchId,
		envelope: record.envelope,
		queuedAt: record.queuedAt,
		expiresAt: record.expiresAt,
		witnessSig: record.witnessSig,
	});
});

router.delete('/match/pending/:matchId', async (req: Request, res: Response) => {
	const { matchId } = req.params;
	if (!MATCH_ID_RE.test(matchId)) {
		res.status(400).json({ success: false, error: 'Invalid matchId' });
		return;
	}
	const result = await deleteByMatchId(matchId);
	res.json({ success: true, cleared: result.cleared });
});

router.get('/match/witness-pubkey', async (_req: Request, res: Response) => {
	try {
		const witness = await getWitnessPubkey();
		res.set('Cache-Control', 'public, max-age=3600');
		res.json({ success: true, account: witness.account, pubkey: witness.pubkey });
	} catch (err) {
		res.status(503).json({
			success: false,
			error: `Witness signing unavailable: ${err instanceof Error ? err.message : 'unknown'}`,
		});
	}
});

// RUNE read model — balances, ledger trace, caps, and drift.
// Mounted under /api/chain so chain-derived reads have one public namespace.
router.use('/rune', runeRoutes);
router.use('/eitr', eitrRoutes);

export default router;

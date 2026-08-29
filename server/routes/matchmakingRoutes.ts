import { Router, Request, Response, type NextFunction } from 'express';
import { randomBytes } from 'node:crypto';
import type { HiveAuthenticatedRequest } from '../middleware/hiveAuth';
import { getPlayer, registerAccount } from '../services/chainState';
import { buildServerSignedChallenge } from '../services/p2pChallengeSigner';
import { buildP2PMatchTicket } from '../services/p2pMatchTicketSigner';
import { getP2PMatchPeerView, type P2PActiveMatch } from '../services/p2pMatchmakingView';
import { verifyHiveAuth } from '../services/hiveAuth';
import {
	createP2PQueueToken,
	hashP2PQueueToken,
	p2pQueueTokenMatches,
} from '../services/p2pQueueToken';
import { hasStarterCeremonyClaim } from '../services/starterClaimRegistry';
import {
	CHALLENGE_STALE_THRESHOLD_MS,
	isSafePeerId,
	normalizeHiveUsername,
	resolveP2PTransportRole,
	type P2PMatchTicket,
	type ServerSignedChallenge,
} from '../../shared/p2pAvailability';
import {
	buildMatchAcceptanceMessage,
	MATCH_OFFER_PROTOCOL,
	MATCH_OFFER_TTL_MS,
	readMatchAcceptanceProof,
	type MatchAcceptanceProof,
	type MatchOffer,
} from '../../shared/p2pMatchAcceptance';
import { getHiveWebSessionUsername } from '../services/hiveWebSession';
import { log } from '../static';
import {
	clearP2PActiveMatches,
	getP2PActiveMatchById,
	getP2PActiveMatchCount,
	getP2PActiveMatchIdForPeer,
	hasP2PActiveMatchPeer,
	registerP2PActiveMatch,
	releaseP2PActiveMatchPeer,
	removeP2PActiveMatch,
	sweepP2PActiveMatches,
} from '../services/p2pActiveMatchRegistry';

const router = Router();

// Matchmaking state changes independently of browser navigation. Prevent
// conditional HTTP caching from turning a status poll into a bodyless 304.
router.use((_req, res, next) => {
	delete _req.headers['if-none-match'];
	delete _req.headers['if-modified-since'];
	res.set({
		'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
		Pragma: 'no-cache',
		Expires: '0',
	});
	next();
});

type QueuedPlayer = {
	readonly peerId: string;
	readonly username?: string;
	readonly elo: number;
	readonly timestamp: number;
	readonly queueTokenHash: string;
};

type MatchChallenges = {
	readonly playerAChallenge: ServerSignedChallenge;
	readonly playerBChallenge: ServerSignedChallenge;
};

type PendingMatchOffer = {
	readonly offerA: MatchOffer;
	readonly offerB: MatchOffer;
	readonly playerA: QueuedPlayer;
	readonly playerB: QueuedPlayer;
	acceptanceA?: MatchAcceptanceProof;
	acceptanceB?: MatchAcceptanceProof;
};

type ExistingQueueResponse = {
	readonly statusCode: number;
	readonly body: Record<string, unknown>;
};

type QueuePlayerCreation = {
	readonly player: QueuedPlayer;
	readonly queueToken: string;
};

type MatchCreationResult =
	| {
		readonly ok: true;
		readonly matchId: string;
		readonly opponent: QueuedPlayer;
		readonly peerView: NonNullable<ReturnType<typeof getP2PMatchPeerView>>;
	}
	| {
		readonly ok: false;
		readonly statusCode: number;
		readonly error: string;
	};

type MatchOfferCreationResult =
	| {
			readonly ok: true;
			readonly pendingOffer: PendingMatchOffer;
		}
	| {
			readonly ok: false;
			readonly statusCode: number;
			readonly error: string;
		};

type QueueJoinResult =
	| { readonly status: 'queued'; readonly position: number; readonly elo: number; readonly queueToken: string }
	| { readonly status: 'offered'; readonly offer: MatchOffer; readonly queueToken: string }
	| { readonly status: 'failed'; readonly statusCode: number; readonly error: string };
type SharedQueueStarterClaimAccess =
	| { readonly ok: true }
	| { readonly ok: false; readonly statusCode: 403; readonly error: 'starter claim required' };

const matchmakingQueue: QueuedPlayer[] = [];
const pendingMatchOffers = new Map<string, PendingMatchOffer>();
const pendingOfferIdsByPeerId = new Map<string, string>();

const QUEUE_STALE_MS = 5 * 60 * 1000; // 5 minutes

function pendingOfferForPeer(peerId: string): PendingMatchOffer | null {
	const offerId = pendingOfferIdsByPeerId.get(peerId);
	return offerId ? pendingMatchOffers.get(offerId) ?? null : null;
}

function offerForPeer(pending: PendingMatchOffer, peerId: string): MatchOffer | null {
	if (pending.playerA.peerId === peerId) return pending.offerA;
	if (pending.playerB.peerId === peerId) return pending.offerB;
	return null;
}

function acceptanceForPeer(pending: PendingMatchOffer, peerId: string): MatchAcceptanceProof | undefined {
	if (pending.playerA.peerId === peerId) return pending.acceptanceA;
	if (pending.playerB.peerId === peerId) return pending.acceptanceB;
	return undefined;
}

function deletePendingMatchOffer(offerId: string): void {
	const pending = pendingMatchOffers.get(offerId);
	if (!pending) return;
	pendingMatchOffers.delete(offerId);
	pendingOfferIdsByPeerId.delete(pending.playerA.peerId);
	pendingOfferIdsByPeerId.delete(pending.playerB.peerId);
}

function readQueueToken(req: Request): string | null {
	const value = req.headers['x-p2p-queue-token'];
	if (Array.isArray(value)) return typeof value[0] === 'string' && value[0].length > 0 ? value[0] : null;
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function hasValidQueueToken(req: Request, expectedHash: string): boolean {
	const token = readQueueToken(req);
	return p2pQueueTokenMatches(expectedHash, token);
}

function removeQueuedPeer(peerId: string): void {
	const index = matchmakingQueue.findIndex(player => player.peerId === peerId);
	if (index !== -1) matchmakingQueue.splice(index, 1);
}

function describeUnknownError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function validateQueuePeerId(req: Request, res: Response, next: NextFunction): void {
	const { peerId } = req.body;
	if (!peerId || typeof peerId !== 'string' || !isSafePeerId(peerId)) {
		res.status(400).json({ success: false, error: 'peerId required' });
		return;
	}
	next();
}

function saveQueue(): void {
	// Secured matchmaking queue tokens are process-local bearer secrets. Do not
	// persist or restore queue state across restarts; stale disk entries would
	// either be unrecoverable by clients or weaken the token ownership model.
}

function removeStaleQueueEntries() {
	const now = Date.now();
	const before = matchmakingQueue.length;
	const freshQueue = matchmakingQueue.filter(player => now - player.timestamp <= QUEUE_STALE_MS);
	matchmakingQueue.splice(0, matchmakingQueue.length, ...freshQueue);
	if (matchmakingQueue.length < before) {
		log(`Removed ${before - matchmakingQueue.length} stale queue entries`, 'Matchmaking');
		saveQueue();
	}
	sweepP2PActiveMatches(now);
	for (const [offerId, pending] of pendingMatchOffers.entries()) {
		if (pending.offerA.expiresAt <= now) deletePendingMatchOffer(offerId);
	}
}

function buildMatchChallenges(
	playerA: QueuedPlayer,
	playerB: QueuedPlayer,
	options: { now: number; expiresAt: number },
): MatchChallenges | null {
	if (!playerA.username || !playerB.username) return null;

	return {
		playerAChallenge: buildServerSignedChallenge({
			from: normalizeHiveUsername(playerA.username),
			to: normalizeHiveUsername(playerB.username),
			peerId: playerA.peerId,
			timestamp: options.now,
			expiresAt: options.expiresAt,
		}),
		playerBChallenge: buildServerSignedChallenge({
			from: normalizeHiveUsername(playerB.username),
			to: normalizeHiveUsername(playerA.username),
			peerId: playerB.peerId,
			timestamp: options.now,
			expiresAt: options.expiresAt,
		}),
	};
}

// Clean stale entries every 60 seconds.
const staleQueueCleanupTimer = setInterval(removeStaleQueueEntries, 60_000);
staleQueueCleanupTimer.unref?.();

export function getP2PMatchmakingStats(): {
	readonly queueLength: number;
	readonly activeMatches: number;
	readonly queuedPlayersWithUsername: number;
	readonly oldestQueuedMs: number | null;
} {
	removeStaleQueueEntries();
	const now = Date.now();
	const oldestTimestamp = matchmakingQueue.reduce<number | null>(
		(oldest, player) => oldest === null ? player.timestamp : Math.min(oldest, player.timestamp),
		null,
	);
	return {
		queueLength: matchmakingQueue.length,
		activeMatches: getP2PActiveMatchCount(),
		queuedPlayersWithUsername: matchmakingQueue.filter(player => typeof player.username === 'string').length,
		oldestQueuedMs: oldestTimestamp === null ? null : Math.max(0, now - oldestTimestamp),
	};
}

export function clearP2PMatchmakingStateForTests(): void {
	matchmakingQueue.splice(0, matchmakingQueue.length);
	pendingMatchOffers.clear();
	pendingOfferIdsByPeerId.clear();
	clearP2PActiveMatches();
}

function findBestEloMatch(newPlayer: QueuedPlayer): QueuedPlayer | null {
	if (matchmakingQueue.length === 0) return null;

	const now = Date.now();
	const waitMs = now - newPlayer.timestamp;

	// Expand ELO range the longer you wait: ±200 initially, ±500 after 30s, anyone after 60s
	let maxEloDiff = 200;
	if (waitMs > 60_000) maxEloDiff = Infinity;
	else if (waitMs > 30_000) maxEloDiff = 500;

	const best = matchmakingQueue.reduce(
		(current, candidate, index) => {
			if (candidate.peerId === newPlayer.peerId) return current;
			const diff = Math.abs(candidate.elo - newPlayer.elo);
			if (diff > maxEloDiff || diff >= current.diff) return current;
			return { index, diff };
		},
		{ index: -1, diff: Infinity },
	);

	// If no ELO match found, check if anyone in the queue has waited 60s+ (match anyone)
	if (best.index === -1) {
		const fallbackIndex = matchmakingQueue.findIndex(candidate => (
			candidate.peerId !== newPlayer.peerId && now - candidate.timestamp > 60_000
		));
		if (fallbackIndex !== -1) return matchmakingQueue.splice(fallbackIndex, 1)[0];
		return null;
	}

	return matchmakingQueue.splice(best.index, 1)[0];
}

function isSharedServerNetworkEnvironment(): boolean {
	return process.env.VITE_NETWORK_STAGE === 'testnet' || process.env.VITE_NETWORK_STAGE === 'mainnet';
}

function requireMatchmakingSession(req: Request, res: Response, next: NextFunction): void {
	const username = getHiveWebSessionUsername(req);
	if (username) {
		(req as HiveAuthenticatedRequest).hiveUsername = username;
		next();
		return;
	}
	if (isSharedServerNetworkEnvironment()) {
		res.status(401).json({ success: false, error: 'Hive web session required for shared-network matchmaking' });
		return;
	}
	next();
}

export function resolveQueueUsername(input: {
	readonly authenticatedUsername: unknown;
	readonly providedUsername: unknown;
}): string | undefined {
	if (typeof input.authenticatedUsername === 'string') {
		return normalizeHiveUsername(input.authenticatedUsername);
	}
	if (typeof input.providedUsername === 'string') {
		return normalizeHiveUsername(input.providedUsername);
	}
	return undefined;
}

export async function resolveSharedQueueStarterClaim(input: {
	readonly sharedNetwork: boolean;
	readonly account: string | undefined;
}): Promise<SharedQueueStarterClaimAccess> {
	if (!input.sharedNetwork || await hasStarterCeremonyClaim(input.account)) return { ok: true };
	return { ok: false, statusCode: 403, error: 'starter claim required' };
}

function resolveQueueElo(queueUsername: string | undefined): number {
	if (!queueUsername) return 1000;
	try {
		registerAccount(queueUsername);
		return getPlayer(queueUsername)?.elo ?? 1000;
	} catch {
		return 1000;
	}
}

function createQueuedPlayer(input: {
	readonly peerId: string;
	readonly username: string | undefined;
}): QueuePlayerCreation {
	const queueToken = createP2PQueueToken();
	return {
		queueToken,
		player: {
			peerId: input.peerId,
			username: input.username,
			elo: resolveQueueElo(input.username),
			timestamp: Date.now(),
			queueTokenHash: hashP2PQueueToken(queueToken),
		},
	};
}

async function canQueuedPlayerUseSharedP2P(player: Pick<QueuedPlayer, 'username'>): Promise<boolean> {
	if (!isSharedServerNetworkEnvironment()) return true;
	return hasStarterCeremonyClaim(player.username);
}

async function getExistingQueueResponse(req: Request, peerId: string): Promise<ExistingQueueResponse | null> {
	const pendingResponse = pendingOfferResponse(req, peerId, { expired: 'clear' });
	if (pendingResponse) return pendingResponse;

	const activeResponse = await getActiveMatchStatusResponse(req, peerId);
	if (activeResponse) return activeResponse;

	const existingIndex = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (existingIndex === -1) return null;
	if (!hasValidQueueToken(req, matchmakingQueue[existingIndex].queueTokenHash)) {
		return {
			statusCode: 403,
			body: { success: false, error: 'queue token required' },
		};
	}
	if (!await canQueuedPlayerUseSharedP2P(matchmakingQueue[existingIndex])) {
		matchmakingQueue.splice(existingIndex, 1);
		saveQueue();
		return {
			statusCode: 403,
			body: { success: false, error: 'starter claim required' },
		};
	}
	return {
		statusCode: 200,
		body: { success: true, status: 'queued', position: existingIndex + 1 },
	};
}

async function getActiveMatchStatusResponse(req: Request, peerId: string): Promise<ExistingQueueResponse | null> {
	const matchId = getP2PActiveMatchIdForPeer(peerId);
	if (!matchId) return null;
	const match = getP2PActiveMatchById(matchId);
	if (!match) return null;
	const peerView = getP2PMatchPeerView(match, peerId);
	if (!peerView) {
		return null;
	}
	if (!hasValidQueueToken(req, peerView.queueTokenHash)) {
		return {
			statusCode: 403,
			body: { success: false, error: 'queue token required' },
		};
	}
	if (!await canQueuedPlayerUseSharedP2P({ username: peerView.username })) {
		removeP2PActiveMatch(matchId);
		return {
			statusCode: 403,
			body: { success: false, error: 'starter claim required' },
		};
	}
	return {
		statusCode: 200,
		body: {
			success: true,
			status: 'ready',
			matchId,
			opponentPeerId: peerView.opponentPeerId,
			isHost: peerView.isHost,
			matchTicket: peerView.matchTicket,
			...(peerView.matchChallenge ? { matchChallenge: peerView.matchChallenge } : {}),
			...(peerView.opponentMatchChallenge ? { opponentMatchChallenge: peerView.opponentMatchChallenge } : {}),
		},
	};
}

function getActiveMatchLeaveResponse(req: Request, peerId: string): ExistingQueueResponse | null {
	const matchId = getP2PActiveMatchIdForPeer(peerId);
	if (!matchId) return null;
	const match = getP2PActiveMatchById(matchId);
	if (!match) return null;
	const peerView = getP2PMatchPeerView(match, peerId);
	if (!peerView) {
		return null;
	}
	if (!hasValidQueueToken(req, peerView.queueTokenHash)) {
		return {
			statusCode: 403,
			body: { success: false, error: 'queue token required' },
		};
	}
	releaseP2PActiveMatchPeer(peerId);
	const otherStillMapped = match.player1 === peerId
		? hasP2PActiveMatchPeer(match.player2, matchId)
		: hasP2PActiveMatchPeer(match.player1, matchId);
	if (!otherStillMapped) {
		removeP2PActiveMatch(matchId);
	}
	return {
		statusCode: 200,
		body: { success: true },
	};
}

function tryBuildMatchChallenges(
	opponent: QueuedPlayer,
	newPlayer: QueuedPlayer,
	now: number,
): { readonly ok: true; readonly value: MatchChallenges | null } | { readonly ok: false; readonly error: string } {
	try {
		return {
			ok: true,
			value: buildMatchChallenges(opponent, newPlayer, {
				now,
				expiresAt: now + CHALLENGE_STALE_THRESHOLD_MS,
			}),
		};
	} catch (error) {
		log(`Challenge signing unavailable for matched pair: ${describeUnknownError(error)}`, 'Matchmaking');
		return { ok: false, error: 'P2P challenge signing unavailable' };
	}
}

function tryBuildMatchTickets(
	opponent: QueuedPlayer,
	newPlayer: QueuedPlayer,
	matchId: string,
	now: number,
): { readonly ok: true; readonly player1MatchTicket: P2PMatchTicket; readonly player2MatchTicket: P2PMatchTicket } | { readonly ok: false; readonly error: string } {
	try {
		return {
			ok: true,
				player1MatchTicket: buildP2PMatchTicket({
					roomId: matchId,
					peerId: opponent.peerId,
					scope: 'matchmaking',
					role: resolveP2PTransportRole(opponent.peerId, newPlayer.peerId),
				account: opponent.username,
				now,
			}),
				player2MatchTicket: buildP2PMatchTicket({
					roomId: matchId,
					peerId: newPlayer.peerId,
					scope: 'matchmaking',
					role: resolveP2PTransportRole(newPlayer.peerId, opponent.peerId),
				account: newPlayer.username,
				now,
			}),
		};
	} catch (error) {
		log(`Match ticket signing unavailable for matched pair: ${describeUnknownError(error)}`, 'Matchmaking');
		return { ok: false, error: 'P2P match ticket signing unavailable' };
	}
}

function createPendingMatchOffer(
	opponent: QueuedPlayer,
	newPlayer: QueuedPlayer,
): MatchOfferCreationResult {
	const now = Date.now();
	removeQueuedPeer(newPlayer.peerId);
	saveQueue();

	const matchId = `${opponent.peerId}-${newPlayer.peerId}`;
	const offerId = `offer_${Date.now()}_${randomBytes(9).toString('hex')}`;
	const expiresAt = now + MATCH_OFFER_TTL_MS;
	const serverNonce = randomBytes(18).toString('base64url');
	const offerA: MatchOffer = {
		protocol: MATCH_OFFER_PROTOCOL,
		offerId,
		matchId,
		player: {
			peerId: opponent.peerId,
			...(opponent.username ? { username: opponent.username } : {}),
			elo: opponent.elo,
		},
		opponent: {
			peerId: newPlayer.peerId,
			...(newPlayer.username ? { username: newPlayer.username } : {}),
			elo: newPlayer.elo,
		},
		createdAt: now,
		expiresAt,
		serverNonce,
	};
	const offerB: MatchOffer = {
		...offerA,
		player: offerA.opponent,
		opponent: offerA.player,
	};
	const pendingOffer: PendingMatchOffer = {
		offerA,
		offerB,
		playerA: opponent,
		playerB: newPlayer,
	};
	pendingMatchOffers.set(offerId, pendingOffer);
	pendingOfferIdsByPeerId.set(opponent.peerId, offerId);
	pendingOfferIdsByPeerId.set(newPlayer.peerId, offerId);
	return { ok: true, pendingOffer };
}

function commitPendingMatch(pending: PendingMatchOffer): MatchCreationResult {
	const now = Date.now();
	const matchChallenges = tryBuildMatchChallenges(pending.playerA, pending.playerB, now);
	if (!matchChallenges.ok) return { ok: false, statusCode: 503, error: matchChallenges.error };
	const matchTickets = tryBuildMatchTickets(pending.playerA, pending.playerB, pending.offerA.matchId, now);
	if (!matchTickets.ok) return { ok: false, statusCode: 503, error: matchTickets.error };

	const activeMatch: P2PActiveMatch = {
		offerId: pending.offerA.offerId,
		player1: pending.playerA.peerId,
		player2: pending.playerB.peerId,
		...(pending.playerA.username ? { player1Username: pending.playerA.username } : {}),
		...(pending.playerB.username ? { player2Username: pending.playerB.username } : {}),
		createdAt: now,
		player1MatchChallenge: matchChallenges.value?.playerAChallenge ?? null,
		player2MatchChallenge: matchChallenges.value?.playerBChallenge ?? null,
		player1MatchTicket: matchTickets.player1MatchTicket,
		player2MatchTicket: matchTickets.player2MatchTicket,
		player1QueueTokenHash: pending.playerA.queueTokenHash,
		player2QueueTokenHash: pending.playerB.queueTokenHash,
	};
	registerP2PActiveMatch(pending.offerA.matchId, activeMatch);
	deletePendingMatchOffer(pending.offerA.offerId);
	const peerView = getP2PMatchPeerView(activeMatch, pending.playerB.peerId);
	if (!peerView) return { ok: false, statusCode: 500, error: 'P2P match peer view unavailable' };
	return { ok: true, matchId: pending.offerA.matchId, opponent: pending.playerA, peerView };
}

function acceptanceMatchesOffer(
	proof: MatchAcceptanceProof,
	offer: MatchOffer,
	player: QueuedPlayer,
): boolean {
	if (proof.offerId !== offer.offerId || proof.matchId !== offer.matchId) return false;
	if (proof.peerId !== player.peerId || proof.opponentPeerId !== offer.opponent.peerId) return false;
	if (proof.serverNonce !== offer.serverNonce || proof.expiresAt !== offer.expiresAt) return false;
	if (player.username && proof.account !== player.username) return false;
	if (offer.opponent.username && proof.opponentAccount !== offer.opponent.username) return false;
	return true;
}

async function verifyMatchAcceptance(
	pending: PendingMatchOffer,
	proof: MatchAcceptanceProof,
	): Promise<{ readonly ok: true } | { readonly ok: false; readonly statusCode: number; readonly error: string }> {
	const now = Date.now();
	if (pending.offerA.expiresAt <= now) {
		deletePendingMatchOffer(pending.offerA.offerId);
		return { ok: false, statusCode: 410, error: 'match offer expired' };
	}
	const isPlayerA = proof.peerId === pending.playerA.peerId;
	const player = isPlayerA ? pending.playerA : pending.playerB;
	const offer = isPlayerA ? pending.offerA : pending.offerB;
	if (!acceptanceMatchesOffer(proof, offer, player)) {
		return { ok: false, statusCode: 409, error: 'match acceptance does not match the offer' };
	}
	if (isSharedServerNetworkEnvironment() && (!proof.account || !proof.hiveSig)) {
		return { ok: false, statusCode: 401, error: 'Hive match acceptance signature required' };
	}
	if (!proof.hiveSig) return { ok: true };
	if (!proof.account) return { ok: false, statusCode: 401, error: 'Hive account required for match acceptance' };
	const { hiveSig, ...acceptancePayload } = proof;
	const auth = await verifyHiveAuth(
		proof.account,
		buildMatchAcceptanceMessage(acceptancePayload),
		hiveSig,
	);
	return auth.valid
		? { ok: true }
		: { ok: false, statusCode: 401, error: 'Invalid Hive match acceptance signature' };
}

function acceptanceMessage(proof: MatchAcceptanceProof): string {
	const { hiveSig: _hiveSig, ...payload } = proof;
	return buildMatchAcceptanceMessage(payload);
}

function pendingOfferResponse(
	req: Request,
	peerId: string,
	options: { readonly expired: 'not_queued' | 'clear' } = { expired: 'not_queued' },
): ExistingQueueResponse | null {
	const pending = pendingOfferForPeer(peerId);
	if (!pending) return null;
	const offer = offerForPeer(pending, peerId);
	const player = pending.playerA.peerId === peerId ? pending.playerA : pending.playerB;
	if (!offer) return null;
	if (!hasValidQueueToken(req, player.queueTokenHash)) {
		return { statusCode: 403, body: { success: false, error: 'queue token required' } };
	}
	if (offer.expiresAt <= Date.now()) {
		deletePendingMatchOffer(offer.offerId);
		return options.expired === 'clear'
			? null
			: { statusCode: 200, body: { success: true, status: 'not_queued' } };
	}
	const accepted = acceptanceForPeer(pending, peerId) !== undefined;
	return {
		statusCode: 200,
		body: {
			success: true,
			status: accepted ? 'waiting_opponent' : 'offered',
			offer,
			...(accepted ? { accepted: true } : {}),
		},
	};
}

async function findStarterEligibleEloMatch(newPlayer: QueuedPlayer): Promise<QueuedPlayer | null> {
	const opponent = findBestEloMatch(newPlayer);
	if (!opponent) return null;
	if (await canQueuedPlayerUseSharedP2P(opponent)) return opponent;
	saveQueue();
	return findStarterEligibleEloMatch(newPlayer);
}

async function queueNewPlayer(newPlayer: QueuedPlayer, queueToken: string): Promise<QueueJoinResult> {
	matchmakingQueue.push(newPlayer);
	if (matchmakingQueue.length >= 2) {
		const opponent = await findStarterEligibleEloMatch(newPlayer);
		if (opponent) {
			const pending = createPendingMatchOffer(opponent, newPlayer);
			if (!pending.ok) return { status: 'failed', statusCode: pending.statusCode, error: pending.error };
			return { status: 'offered', offer: pending.pendingOffer.offerB, queueToken };
		}
	}
	saveQueue();
	return { status: 'queued', position: matchmakingQueue.length, elo: newPlayer.elo, queueToken };
}

router.post('/queue', validateQueuePeerId, requireMatchmakingSession, async (req: Request, res: Response) => {
	const { peerId, username } = req.body;

	removeStaleQueueEntries();

	const queueUsername = resolveQueueUsername({
		authenticatedUsername: Reflect.get(req, 'hiveUsername'),
		providedUsername: username,
	});
	const starterClaimAccess = await resolveSharedQueueStarterClaim({
		sharedNetwork: isSharedServerNetworkEnvironment(),
		account: queueUsername,
	});
	if (!starterClaimAccess.ok) {
		return res.status(starterClaimAccess.statusCode).json({ success: false, error: starterClaimAccess.error });
	}

	const existingResponse = await getExistingQueueResponse(req, peerId);
	if (existingResponse) {
		return res.status(existingResponse.statusCode).json(existingResponse.body);
	}

	const { player: newPlayer, queueToken } = createQueuedPlayer({
		peerId,
		username: queueUsername,
	});
	const result = await queueNewPlayer(newPlayer, queueToken);
	if (result.status === 'failed') {
		return res.status(result.statusCode).json({ success: false, error: result.error });
	}
	if (result.status === 'queued') {
		return res.json({
			success: true,
			status: 'queued',
			position: result.position,
			elo: result.elo,
			queueToken: result.queueToken,
		});
	}
	return res.json({
		success: true,
		status: 'offered',
		offer: result.offer,
		queueToken: result.queueToken,
	});
});

router.post('/accept', validateQueuePeerId, requireMatchmakingSession, async (req: Request, res: Response) => {
	const { peerId } = req.body;
	const offerId = typeof req.body?.offerId === 'string' ? req.body.offerId : '';
	const proof = readMatchAcceptanceProof(req.body?.acceptance);
	if (!offerId || !proof) {
		return res.status(400).json({ success: false, error: 'offerId and valid match acceptance required' });
	}
	const sessionUsername = Reflect.get(req, 'hiveUsername');
	if (isSharedServerNetworkEnvironment() && (
		typeof sessionUsername !== 'string'
		|| !proof.account
		|| normalizeHiveUsername(sessionUsername) !== normalizeHiveUsername(proof.account)
	)) {
		return res.status(403).json({ success: false, error: 'Match acceptance account does not match the Hive web session' });
	}
	// Accept is retry-safe after the commit. This is important when the first
	// response is lost: the client re-sends the cached proof and must not open
	// Keychain again just because the pending offer has already been consumed.
	const activeMatchId = getP2PActiveMatchIdForPeer(peerId);
	const activeMatch = activeMatchId ? getP2PActiveMatchById(activeMatchId) : undefined;
	if (activeMatch && proof.offerId === activeMatch.offerId && proof.matchId === activeMatchId) {
		const activeResponse = await getActiveMatchStatusResponse(req, peerId);
		if (activeResponse) return res.status(activeResponse.statusCode).json(activeResponse.body);
	}
	const pending = pendingMatchOffers.get(offerId);
	if (!pending || !offerForPeer(pending, peerId)) {
		return res.status(404).json({ success: false, error: 'match offer not found' });
	}
	const player = pending.playerA.peerId === peerId ? pending.playerA : pending.playerB;
	if (!hasValidQueueToken(req, player.queueTokenHash)) {
		return res.status(403).json({ success: false, error: 'queue token required' });
	}
	const verification = await verifyMatchAcceptance(pending, proof);
	if (!verification.ok) return res.status(verification.statusCode).json({ success: false, error: verification.error });

	const previous = acceptanceForPeer(pending, peerId);
	if (previous) {
		if (acceptanceMessage(previous) !== acceptanceMessage(proof) || previous.hiveSig !== proof.hiveSig) {
			return res.status(409).json({ success: false, error: 'match acceptance already recorded with different proof' });
		}
	} else if (pending.playerA.peerId === peerId) {
		pending.acceptanceA = proof;
	} else {
		pending.acceptanceB = proof;
	}

	if (!pending.acceptanceA || !pending.acceptanceB) {
		return res.json({ success: true, status: 'waiting_opponent', offer: offerForPeer(pending, peerId), accepted: true });
	}

	const committed = commitPendingMatch(pending);
	if (!committed.ok) return res.status(committed.statusCode).json({ success: false, error: committed.error });
	const readyResponse = await getActiveMatchStatusResponse(req, peerId);
	if (!readyResponse) return res.status(500).json({ success: false, error: 'Committed match could not be read' });
	return res.status(readyResponse.statusCode).json(readyResponse.body);
});

function clearPendingOfferForPeer(req: Request, peerId: string): ExistingQueueResponse | null {
	const pending = pendingOfferForPeer(peerId);
	if (!pending) return null;
	const player = pending.playerA.peerId === peerId ? pending.playerA : pending.playerB;
	if (!hasValidQueueToken(req, player.queueTokenHash)) {
		return { statusCode: 403, body: { success: false, error: 'queue token required' } };
	}
	const requestedOfferId = typeof req.body?.offerId === 'string' ? req.body.offerId : null;
	if (requestedOfferId && requestedOfferId !== pending.offerA.offerId) {
		return { statusCode: 404, body: { success: false, error: 'match offer not found' } };
	}
	deletePendingMatchOffer(pending.offerA.offerId);
	return { statusCode: 200, body: { success: true } };
}

router.post('/decline', validateQueuePeerId, requireMatchmakingSession, (req: Request, res: Response) => {
	const result = clearPendingOfferForPeer(req, req.body.peerId);
	if (result) return res.status(result.statusCode).json(result.body);
	return res.json({ success: true });
});

router.post('/leave', requireMatchmakingSession, (req: Request, res: Response) => {
	const { peerId } = req.body;

	if (!peerId || typeof peerId !== 'string' || !isSafePeerId(peerId)) {
		return res.status(400).json({ success: false, error: 'peerId required' });
	}

	const index = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (index !== -1) {
		if (!hasValidQueueToken(req, matchmakingQueue[index].queueTokenHash)) {
			return res.status(403).json({ success: false, error: 'queue token required' });
		}
		matchmakingQueue.splice(index, 1);
		saveQueue();
	}

	const pendingOfferLeaveResponse = clearPendingOfferForPeer(req, peerId);
	if (pendingOfferLeaveResponse) {
		return res.status(pendingOfferLeaveResponse.statusCode).json(pendingOfferLeaveResponse.body);
	}

	const activeMatchLeaveResponse = getActiveMatchLeaveResponse(req, peerId);
	if (activeMatchLeaveResponse) {
		return res.status(activeMatchLeaveResponse.statusCode).json(activeMatchLeaveResponse.body);
	}

	return res.json({ success: true });
});

router.get('/status/:peerId', requireMatchmakingSession, async (req: Request, res: Response) => {
	const { peerId } = req.params;
	if (!isSafePeerId(peerId)) {
		return res.status(400).json({ success: false, error: 'invalid peerId' });
	}

	const queuePosition = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (queuePosition !== -1) {
		if (!hasValidQueueToken(req, matchmakingQueue[queuePosition].queueTokenHash)) {
			return res.status(403).json({ success: false, error: 'queue token required' });
		}
		if (!await canQueuedPlayerUseSharedP2P(matchmakingQueue[queuePosition])) {
			matchmakingQueue.splice(queuePosition, 1);
			saveQueue();
			return res.status(403).json({ success: false, error: 'starter claim required' });
		}
		return res.json({
			success: true,
			status: 'queued',
			position: queuePosition + 1,
			totalInQueue: matchmakingQueue.length,
		});
	}

	removeStaleQueueEntries();
	const pendingResponse = pendingOfferResponse(req, peerId);
	if (pendingResponse) {
		return res.status(pendingResponse.statusCode).json(pendingResponse.body);
	}

	const matchedResponse = await getActiveMatchStatusResponse(req, peerId);
	if (matchedResponse) {
		return res.status(matchedResponse.statusCode).json(matchedResponse.body);
	}

	return res.json({ success: true, status: 'not_queued' });
});

router.get('/stats', (req: Request, res: Response) => {
	res.json({
		success: true,
		queueLength: matchmakingQueue.length,
		activeMatches: getP2PActiveMatchCount(),
	});
});

export default router;

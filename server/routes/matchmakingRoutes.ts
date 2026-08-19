import { Router, Request, Response, type NextFunction } from 'express';
import {
	requireHiveBodyAuth,
	requireHiveBodyAuthIfUsernamePresent,
} from '../middleware/hiveAuth';
import { getPlayer, registerAccount } from '../services/chainState';
import { buildServerSignedChallenge } from '../services/p2pChallengeSigner';
import { buildP2PMatchTicket } from '../services/p2pMatchTicketSigner';
import { getP2PMatchPeerView, type P2PActiveMatch } from '../services/p2pMatchmakingView';
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
	type P2PMatchTicket,
	type ServerSignedChallenge,
} from '../../shared/p2pAvailability';
import { buildP2PQueueAuthMessage } from '../../shared/p2pMatchmakingAuth';
import { log } from '../static';

const router = Router();

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

type QueueJoinResult =
	| { readonly status: 'queued'; readonly position: number; readonly elo: number; readonly queueToken: string }
	| { readonly status: 'matched'; readonly match: Extract<MatchCreationResult, { readonly ok: true }>; readonly queueToken: string }
	| { readonly status: 'failed'; readonly statusCode: number; readonly error: string };

type SharedQueueStarterClaimAccess =
	| { readonly ok: true }
	| { readonly ok: false; readonly statusCode: 403; readonly error: 'starter claim required' };

const matchmakingQueue: QueuedPlayer[] = [];
const activeMatches = new Map<string, P2PActiveMatch>();
const activeMatchIdsByPeerId = new Map<string, string>();

const QUEUE_STALE_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVE_MATCH_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

function restoreQueuedPeer(player: QueuedPlayer): void {
	if (matchmakingQueue.some(candidate => candidate.peerId === player.peerId)) return;
	matchmakingQueue.push(player);
}

function rollbackFailedMatchmakingPair(opponent: QueuedPlayer, newPlayer: QueuedPlayer): void {
	removeQueuedPeer(newPlayer.peerId);
	restoreQueuedPeer(opponent);
	saveQueue();
}

function removeActiveMatch(matchId: string): void {
	const match = activeMatches.get(matchId);
	if (match) {
		activeMatchIdsByPeerId.delete(match.player1);
		activeMatchIdsByPeerId.delete(match.player2);
	}
	activeMatches.delete(matchId);
}

function describeUnknownError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function readQueueStarterClaimed(value: unknown): boolean {
	return value === true;
}

function buildQueueAuthMessage(req: Request, username: string, timestamp: number): string {
	const peerId = typeof req.body?.peerId === 'string' ? req.body.peerId : '';
	return buildP2PQueueAuthMessage({
		username,
		peerId,
		starterClaimed: readQueueStarterClaimed(req.body?.starterClaimed),
		timestamp,
	});
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
	activeMatches.forEach((match, matchId) => {
		if (now - match.createdAt > ACTIVE_MATCH_TTL_MS) {
			removeActiveMatch(matchId);
		}
	});
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
		activeMatches: activeMatches.size,
		queuedPlayersWithUsername: matchmakingQueue.filter(player => typeof player.username === 'string').length,
		oldestQueuedMs: oldestTimestamp === null ? null : Math.max(0, now - oldestTimestamp),
	};
}

export function clearP2PMatchmakingStateForTests(): void {
	matchmakingQueue.splice(0, matchmakingQueue.length);
	activeMatches.clear();
	activeMatchIdsByPeerId.clear();
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

const queueAuth = requireHiveBodyAuthIfUsernamePresent({
	usernameField: 'username',
	buildMessage: buildQueueAuthMessage,
});

const sharedNetworkQueueAuth = requireHiveBodyAuth({
	usernameField: 'username',
	buildMessage: buildQueueAuthMessage,
	missingUsernameMessage: 'Hive username required for shared-network matchmaking',
	usernameErrorStatus: 401,
});

function isSharedServerNetworkEnvironment(): boolean {
	return process.env.VITE_NETWORK_STAGE === 'testnet' || process.env.VITE_NETWORK_STAGE === 'mainnet';
}

function requireQueueAuthForRuntime(req: Request, res: Response, next: NextFunction): void {
	if (isSharedServerNetworkEnvironment()) {
		void sharedNetworkQueueAuth(req, res, next);
		return;
	}
	void queueAuth(req, res, next);
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
	const matchId = activeMatchIdsByPeerId.get(peerId);
	if (!matchId) return null;
	const match = activeMatches.get(matchId);
	if (!match) {
		activeMatchIdsByPeerId.delete(peerId);
		return null;
	}
	const peerView = getP2PMatchPeerView(match, peerId);
	if (!peerView) {
		activeMatchIdsByPeerId.delete(peerId);
		return null;
	}
	if (!hasValidQueueToken(req, peerView.queueTokenHash)) {
		return {
			statusCode: 403,
			body: { success: false, error: 'queue token required' },
		};
	}
	if (!await canQueuedPlayerUseSharedP2P({ username: peerView.username })) {
		removeActiveMatch(matchId);
		return {
			statusCode: 403,
			body: { success: false, error: 'starter claim required' },
		};
	}
	return {
		statusCode: 200,
		body: {
			success: true,
			status: 'matched',
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
	const matchId = activeMatchIdsByPeerId.get(peerId);
	if (!matchId) return null;
	const match = activeMatches.get(matchId);
	if (!match) {
		activeMatchIdsByPeerId.delete(peerId);
		return null;
	}
	const peerView = getP2PMatchPeerView(match, peerId);
	if (!peerView) {
		activeMatchIdsByPeerId.delete(peerId);
		return null;
	}
	if (!hasValidQueueToken(req, peerView.queueTokenHash)) {
		return {
			statusCode: 403,
			body: { success: false, error: 'queue token required' },
		};
	}
	activeMatchIdsByPeerId.delete(peerId);
	const otherStillMapped = match.player1 === peerId
		? activeMatchIdsByPeerId.get(match.player2) === matchId
		: activeMatchIdsByPeerId.get(match.player1) === matchId;
	if (!otherStillMapped) {
		removeActiveMatch(matchId);
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
				account: opponent.username,
				now,
			}),
			player2MatchTicket: buildP2PMatchTicket({
				roomId: matchId,
				peerId: newPlayer.peerId,
				account: newPlayer.username,
				now,
			}),
		};
	} catch (error) {
		log(`Match ticket signing unavailable for matched pair: ${describeUnknownError(error)}`, 'Matchmaking');
		return { ok: false, error: 'P2P match ticket signing unavailable' };
	}
}

function registerActiveMatch(matchId: string, activeMatch: P2PActiveMatch): void {
	activeMatches.set(matchId, activeMatch);
	activeMatchIdsByPeerId.set(activeMatch.player1, matchId);
	activeMatchIdsByPeerId.set(activeMatch.player2, matchId);
	const activeMatchExpiryTimer = setTimeout(() => {
		removeActiveMatch(matchId);
	}, ACTIVE_MATCH_TTL_MS);
	activeMatchExpiryTimer.unref?.();
}

function createActiveMatch(
	opponent: QueuedPlayer,
	newPlayer: QueuedPlayer,
): MatchCreationResult {
	const now = Date.now();
	const matchChallenges = tryBuildMatchChallenges(opponent, newPlayer, now);
	if (!matchChallenges.ok) {
		rollbackFailedMatchmakingPair(opponent, newPlayer);
		return { ok: false, statusCode: 503, error: matchChallenges.error };
	}

	removeQueuedPeer(newPlayer.peerId);
	saveQueue();

	const matchId = `${opponent.peerId}-${newPlayer.peerId}`;
	const matchTickets = tryBuildMatchTickets(opponent, newPlayer, matchId, now);
	if (!matchTickets.ok) {
		rollbackFailedMatchmakingPair(opponent, newPlayer);
		return { ok: false, statusCode: 503, error: matchTickets.error };
	}

	const activeMatch: P2PActiveMatch = {
		player1: opponent.peerId,
		player2: newPlayer.peerId,
		...(opponent.username ? { player1Username: opponent.username } : {}),
		...(newPlayer.username ? { player2Username: newPlayer.username } : {}),
		createdAt: Date.now(),
		player1MatchChallenge: matchChallenges.value?.playerAChallenge ?? null,
		player2MatchChallenge: matchChallenges.value?.playerBChallenge ?? null,
		player1MatchTicket: matchTickets.player1MatchTicket,
		player2MatchTicket: matchTickets.player2MatchTicket,
		player1QueueTokenHash: opponent.queueTokenHash,
		player2QueueTokenHash: newPlayer.queueTokenHash,
	};
	registerActiveMatch(matchId, activeMatch);

	const peerView = getP2PMatchPeerView(activeMatch, newPlayer.peerId);
	if (!peerView) {
		return { ok: false, statusCode: 500, error: 'P2P match peer view unavailable' };
	}
	return { ok: true, matchId, opponent, peerView };
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
			const match = createActiveMatch(opponent, newPlayer);
			if (!match.ok) return { status: 'failed', statusCode: match.statusCode, error: match.error };
			return { status: 'matched', match, queueToken };
		}
	}
	saveQueue();
	return { status: 'queued', position: matchmakingQueue.length, elo: newPlayer.elo, queueToken };
}

router.post('/queue', validateQueuePeerId, requireQueueAuthForRuntime, async (req: Request, res: Response) => {
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
		status: 'matched',
		matchId: result.match.matchId,
		opponentPeerId: result.match.peerView.opponentPeerId,
		opponentElo: result.match.opponent.elo,
		opponentUsername: result.match.opponent.username,
		isHost: result.match.peerView.isHost,
		matchTicket: result.match.peerView.matchTicket,
		queueToken: result.queueToken,
		...(result.match.peerView.matchChallenge ? { matchChallenge: result.match.peerView.matchChallenge } : {}),
		...(result.match.peerView.opponentMatchChallenge ? { opponentMatchChallenge: result.match.peerView.opponentMatchChallenge } : {}),
	});
});

router.post('/leave', (req: Request, res: Response) => {
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

	const activeMatchLeaveResponse = getActiveMatchLeaveResponse(req, peerId);
	if (activeMatchLeaveResponse) {
		return res.status(activeMatchLeaveResponse.statusCode).json(activeMatchLeaveResponse.body);
	}

	return res.json({ success: true });
});

router.get('/status/:peerId', async (req: Request, res: Response) => {
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
		activeMatches: activeMatches.size,
	});
});

export default router;

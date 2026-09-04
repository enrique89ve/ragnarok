import { Router, Request, Response, type NextFunction } from 'express';
import { createHash, randomBytes } from 'node:crypto';
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
	isValidAvailabilityHiveUsername,
	normalizeHiveUsername,
	resolveP2PTransportRole,
	type P2PMatchTicket,
	type ServerSignedChallenge,
} from '../../shared/p2pAvailability';
import {
	buildMatchAcceptanceMessage,
	buildMatchAcceptanceV2Message,
	MATCH_OFFER_PROTOCOL,
	MATCH_OFFER_TTL_MS,
	readMatchAcceptanceProof,
	type MatchAcceptanceProof,
	type MatchOffer,
} from '../../shared/p2pMatchAcceptance';
import { getHiveWebSessionUsername, issueHiveWebSession } from '../services/hiveWebSession';
import { log } from '../static';
import {
	MATCHMAKING_DELEGATION_PROTOCOL,
	MATCHMAKING_DELEGATION_TTL_MS,
	buildMatchmakingDelegationMessage,
	isCurrentMatchmakingDelegation,
	readMatchmakingDelegationProof,
	type MatchmakingDelegationChallenge,
	type MatchmakingDelegationProof,
} from '../../shared/p2pMatchDelegation';
import { verifyP2PSessionSignature } from '../../shared/p2pSessionSignature';
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
	readonly delegation?: MatchmakingDelegationProof;
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

type SearchIntentBinding = {
	readonly peerId: string;
	readonly account: string | undefined;
	readonly delegationFingerprint: string | null;
};

type SearchIntentRecord = SearchIntentBinding & {
	readonly queueToken: string;
	readonly createdAt: number;
};

type SearchIntentOperation = SearchIntentBinding & {
	readonly promise: Promise<ExistingQueueResponse>;
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

function queueJoinResultResponse(result: QueueJoinResult): ExistingQueueResponse {
	if (result.status === 'failed') {
		return {
			statusCode: result.statusCode,
			body: { success: false, error: result.error },
		};
	}
	if (result.status === 'queued') {
		return {
			statusCode: 200,
			body: {
				success: true,
				status: 'queued',
				position: result.position,
				elo: result.elo,
				queueToken: result.queueToken,
			},
		};
	}
	return {
		statusCode: 200,
		body: {
			success: true,
			status: 'offered',
			offer: result.offer,
			queueToken: result.queueToken,
		},
	};
}
type SharedQueueStarterClaimAccess =
	| { readonly ok: true }
	| { readonly ok: false; readonly statusCode: 403; readonly error: 'starter claim required' };

const matchmakingQueue: QueuedPlayer[] = [];
const pendingMatchOffers = new Map<string, PendingMatchOffer>();
const pendingOfferIdsByPeerId = new Map<string, string>();
const delegationChallenges = new Map<string, MatchmakingDelegationChallenge>();
const delegationProofFingerprints = new Map<string, string>();
const searchIntentRecords = new Map<string, SearchIntentRecord>();
const searchIntentOperations = new Map<string, SearchIntentOperation>();

const QUEUE_STALE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_DELEGATION_CHALLENGES = 10_000;
const MAX_SEARCH_INTENT_RECORDS = 10_000;

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

function hasValidQueueToken(req: Request, expectedHash: string, tokenOverride?: string): boolean {
	const token = tokenOverride ?? readQueueToken(req);
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

function isSafeSearchIntentId(value: unknown): value is string {
	return typeof value === 'string'
		&& value.length >= 1
		&& value.length <= 128
		&& /^[A-Za-z0-9_-]+$/.test(value);
}

function sameSearchIntentBinding(left: SearchIntentBinding, right: SearchIntentBinding): boolean {
	return left.peerId === right.peerId
		&& left.account === right.account
		&& left.delegationFingerprint === right.delegationFingerprint;
}

function searchIntentConflictResponse(): ExistingQueueResponse {
	return {
		statusCode: 409,
		body: { success: false, error: 'Search intent was already used with different matchmaking identity' },
	};
}

function rememberSearchIntent(searchIntentId: string, input: SearchIntentRecord): void {
	if (searchIntentRecords.size >= MAX_SEARCH_INTENT_RECORDS && !searchIntentRecords.has(searchIntentId)) {
		const oldestId = searchIntentRecords.keys().next().value;
		if (typeof oldestId === 'string') searchIntentRecords.delete(oldestId);
	}
	searchIntentRecords.set(searchIntentId, input);
}

function clearSearchIntentForPeer(peerId: string): void {
	for (const [searchIntentId, record] of searchIntentRecords.entries()) {
		if (record.peerId === peerId) searchIntentRecords.delete(searchIntentId);
	}
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
	for (const [delegationId, challenge] of delegationChallenges.entries()) {
		if (challenge.expiresAt <= now) {
			delegationChallenges.delete(delegationId);
			delegationProofFingerprints.delete(delegationId);
		}
	}
	for (const [searchIntentId, record] of searchIntentRecords.entries()) {
		if (now - record.createdAt > QUEUE_STALE_MS) searchIntentRecords.delete(searchIntentId);
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
	delegationChallenges.clear();
	delegationProofFingerprints.clear();
	searchIntentRecords.clear();
	searchIntentOperations.clear();
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

function isSafeHash(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

function readDelegationChallengeBody(value: unknown): {
	readonly account: string;
	readonly peerId: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
} | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const body = value as Record<string, unknown>;
	const account = typeof body.account === 'string' ? normalizeHiveUsername(body.account) : '';
	if (!isValidAvailabilityHiveUsername(account) || typeof body.peerId !== 'string' || !isSafePeerId(body.peerId)) return null;
	if (!isSafeHash(body.rulesetHash) || !isSafeHash(body.engineHash)) return null;
	return { account, peerId: body.peerId, rulesetHash: body.rulesetHash, engineHash: body.engineHash };
}

function createDelegationChallenge(input: {
	readonly account: string;
	readonly peerId: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
}): MatchmakingDelegationChallenge {
	removeStaleQueueEntries();
	if (delegationChallenges.size >= MAX_DELEGATION_CHALLENGES) {
		const oldest = delegationChallenges.keys().next().value;
		if (typeof oldest === 'string') delegationChallenges.delete(oldest);
	}
	const issuedAt = Date.now();
	const challenge: MatchmakingDelegationChallenge = {
		protocol: MATCHMAKING_DELEGATION_PROTOCOL,
		delegationId: `delegation_${issuedAt}_${randomBytes(9).toString('hex')}`,
		account: input.account,
		peerId: input.peerId,
		rulesetHash: input.rulesetHash,
		engineHash: input.engineHash,
		serverNonce: randomBytes(18).toString('base64url'),
		issuedAt,
		expiresAt: issuedAt + MATCHMAKING_DELEGATION_TTL_MS,
	};
	delegationChallenges.set(challenge.delegationId, challenge);
	return challenge;
}

async function verifyQueueDelegation(proof: MatchmakingDelegationProof): Promise<string | null> {
	const challenge = delegationChallenges.get(proof.delegationId);
	if (!challenge) return 'matchmaking delegation challenge not found or already expired';
	if (challenge.expiresAt <= Date.now()) {
		delegationChallenges.delete(proof.delegationId);
		return 'matchmaking delegation expired';
	}
	const matchesChallenge = challenge.account === proof.account
		&& challenge.peerId === proof.peerId
		&& challenge.rulesetHash === proof.rulesetHash
		&& challenge.engineHash === proof.engineHash
		&& challenge.serverNonce === proof.serverNonce
		&& challenge.issuedAt === proof.issuedAt
		&& challenge.expiresAt === proof.expiresAt;
	if (!matchesChallenge) return 'matchmaking delegation does not match its challenge';
	// The Hive signature covers only the delegation payload. Never include the
	// signature itself in the signed bytes.
	const { hiveSig, ...delegationPayload } = proof;
	const auth = await verifyHiveAuth(
		proof.account,
		buildMatchmakingDelegationMessage(delegationPayload),
		hiveSig,
	);
	if (!auth.valid) return 'Invalid Hive matchmaking delegation signature';
	return null;
}

function verifyMatchAcceptanceV2(proof: MatchAcceptanceProof, player: QueuedPlayer): boolean {
	if (proof.protocol !== 'ragnarok-match-accept-v2' || !player.delegation) return false;
	if (!isCurrentMatchmakingDelegation(player.delegation)) return false;
	if (proof.delegationId !== player.delegation.delegationId || proof.account !== player.delegation.account) return false;
	if (proof.ephemeralPubkey !== player.delegation.ephemeralPubkey) return false;
	if (proof.rulesetHash !== player.delegation.rulesetHash || proof.engineHash !== player.delegation.engineHash) return false;
	const { sessionSig: _sessionSig, ...payload } = proof;
	return verifyP2PSessionSignature({
		bytes: new TextEncoder().encode(buildMatchAcceptanceV2Message(payload)),
		signature: proof.sessionSig,
		publicKey: proof.ephemeralPubkey,
	});
}

function requireMatchmakingSession(req: Request, res: Response, next: NextFunction): void {
	const username = getHiveWebSessionUsername(req);
	if (username) {
		(req as HiveAuthenticatedRequest).hiveUsername = username;
		next();
		return;
	}
	if (!isSharedServerNetworkEnvironment() || readMatchmakingDelegationProof(req.body?.delegation)) {
		next();
		return;
	}
	// A V2 Accept proof is already bound to the Hive delegation stored with the
	// queued player. This lets a client finish Accept if the HttpOnly cookie was
	// lost between Find and the offer without opening Keychain again.
	if (readMatchAcceptanceProof(req.body?.acceptance)?.protocol === 'ragnarok-match-accept-v2') {
		next();
		return;
	}
	res.status(401).json({ success: false, error: 'Hive web session required for shared-network matchmaking' });
	return;
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
	readonly delegation?: MatchmakingDelegationProof;
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
			...(input.delegation ? { delegation: input.delegation } : {}),
		},
	};
}

async function canQueuedPlayerUseSharedP2P(player: Pick<QueuedPlayer, 'username'>): Promise<boolean> {
	if (!isSharedServerNetworkEnvironment()) return true;
	return hasStarterCeremonyClaim(player.username);
}

async function getExistingQueueResponse(req: Request, peerId: string, queueTokenOverride?: string): Promise<ExistingQueueResponse | null> {
	const pendingResponse = pendingOfferResponse(req, peerId, { expired: 'clear' }, queueTokenOverride);
	if (pendingResponse) return pendingResponse;

	const activeResponse = await getActiveMatchStatusResponse(req, peerId, queueTokenOverride);
	if (activeResponse) return activeResponse;

	const existingIndex = matchmakingQueue.findIndex(p => p.peerId === peerId);
	if (existingIndex === -1) return null;
	if (!hasValidQueueToken(req, matchmakingQueue[existingIndex].queueTokenHash, queueTokenOverride)) {
		return {
			statusCode: 403,
			body: { success: false, error: 'queue token required' },
		};
	}
	if (!await canQueuedPlayerUseSharedP2P(matchmakingQueue[existingIndex])) {
		matchmakingQueue.splice(existingIndex, 1);
		clearSearchIntentForPeer(peerId);
		saveQueue();
		return {
			statusCode: 403,
			body: { success: false, error: 'starter claim required' },
		};
	}
	return {
		statusCode: 200,
		body: {
			success: true,
			status: 'queued',
			position: existingIndex + 1,
			...(queueTokenOverride ? { queueToken: queueTokenOverride } : {}),
		},
	};
}

async function getActiveMatchStatusResponse(req: Request, peerId: string, queueTokenOverride?: string): Promise<ExistingQueueResponse | null> {
	const matchId = getP2PActiveMatchIdForPeer(peerId);
	if (!matchId) return null;
	const match = getP2PActiveMatchById(matchId);
	if (!match) return null;
	const peerView = getP2PMatchPeerView(match, peerId);
	if (!peerView) {
		return null;
	}
	if (!hasValidQueueToken(req, peerView.queueTokenHash, queueTokenOverride)) {
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
			...(queueTokenOverride ? { queueToken: queueTokenOverride } : {}),
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
	clearSearchIntentForPeer(peerId);
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
		...(pending.acceptanceA ? { player1Acceptance: pending.acceptanceA } : {}),
		...(pending.acceptanceB ? { player2Acceptance: pending.acceptanceB } : {}),
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
	if (proof.protocol === 'ragnarok-match-accept-v2') {
		return verifyMatchAcceptanceV2(proof, player)
			? { ok: true }
			: { ok: false, statusCode: 401, error: 'Invalid local match acceptance signature' };
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
	if (proof.protocol === 'ragnarok-match-accept-v2') {
		const { sessionSig: _sessionSig, ...payload } = proof;
		return buildMatchAcceptanceV2Message(payload);
	}
	const { hiveSig: _hiveSig, ...payload } = proof;
	return buildMatchAcceptanceMessage(payload);
}

function pendingOfferResponse(
	req: Request,
	peerId: string,
	options: { readonly expired: 'not_queued' | 'clear' } = { expired: 'not_queued' },
	queueTokenOverride?: string,
): ExistingQueueResponse | null {
	const pending = pendingOfferForPeer(peerId);
	if (!pending) return null;
	const offer = offerForPeer(pending, peerId);
	const player = pending.playerA.peerId === peerId ? pending.playerA : pending.playerB;
	if (!offer) return null;
	if (!hasValidQueueToken(req, player.queueTokenHash, queueTokenOverride)) {
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
			...(queueTokenOverride ? { queueToken: queueTokenOverride } : {}),
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

router.post('/delegation-challenge', (req: Request, res: Response) => {
	const body = readDelegationChallengeBody(req.body);
	if (!body) {
		return res.status(400).json({ success: false, error: 'account, peerId, rulesetHash and engineHash are required' });
	}
	return res.json({ success: true, challenge: createDelegationChallenge(body) });
});

router.post('/queue', validateQueuePeerId, requireMatchmakingSession, async (req: Request, res: Response) => {
	const { peerId, username } = req.body;
	const rawSearchIntentId = req.body?.searchIntentId;
	if (rawSearchIntentId !== undefined && !isSafeSearchIntentId(rawSearchIntentId)) {
		return res.status(400).json({ success: false, error: 'Invalid search intent id' });
	}
	const searchIntentId = rawSearchIntentId as string | undefined;

	removeStaleQueueEntries();
	const rawDelegation = readMatchmakingDelegationProof(req.body?.delegation);
	const delegationFingerprint = rawDelegation
		? createHash('sha256').update(`${buildMatchmakingDelegationMessage(rawDelegation)}|${rawDelegation.hiveSig}`, 'utf8').digest('hex')
		: null;
	if (req.body?.delegation !== undefined && !rawDelegation) {
		return res.status(400).json({ success: false, error: 'Invalid matchmaking delegation proof' });
	}
	// Keep the already-authenticated session-only request as a rolling-deploy
	// compatibility path. The current client always sends a delegation; this
	// branch can be removed once all deployed clients speak V2.
	if (isSharedServerNetworkEnvironment() && !rawDelegation && !getHiveWebSessionUsername(req)) {
		return res.status(401).json({ success: false, error: 'Hive matchmaking delegation required' });
	}
	if (rawDelegation) {
		if (rawDelegation.peerId !== peerId) {
			return res.status(403).json({ success: false, error: 'Matchmaking delegation peer mismatch' });
		}
		const delegationError = await verifyQueueDelegation(rawDelegation);
		if (delegationError) return res.status(401).json({ success: false, error: delegationError });
		const previousFingerprint = delegationProofFingerprints.get(rawDelegation.delegationId);
		if (previousFingerprint && previousFingerprint !== delegationFingerprint) {
			return res.status(409).json({ success: false, error: 'Matchmaking delegation was already used with different proof' });
		}
		const sessionUsername = getHiveWebSessionUsername(req);
		if (sessionUsername && normalizeHiveUsername(sessionUsername) !== rawDelegation.account) {
			return res.status(403).json({ success: false, error: 'Matchmaking delegation account does not match the Hive web session' });
		}
		(req as HiveAuthenticatedRequest).hiveUsername = rawDelegation.account;
		if (!sessionUsername) issueHiveWebSession(res, rawDelegation.account);
	}

	const queueUsername = resolveQueueUsername({
		authenticatedUsername: Reflect.get(req, 'hiveUsername'),
		providedUsername: username,
	});
	const searchIntentBinding: SearchIntentBinding = {
		peerId,
		account: queueUsername,
		delegationFingerprint,
	};

	if (searchIntentId) {
		const recordedIntent = searchIntentRecords.get(searchIntentId);
		if (recordedIntent) {
			if (!sameSearchIntentBinding(recordedIntent, searchIntentBinding)) {
				const conflict = searchIntentConflictResponse();
				return res.status(conflict.statusCode).json(conflict.body);
			}
			const existingResponse = await getExistingQueueResponse(req, peerId, recordedIntent.queueToken);
			if (existingResponse) return res.status(existingResponse.statusCode).json(existingResponse.body);
			searchIntentRecords.delete(searchIntentId);
		}

		const pendingOperation = searchIntentOperations.get(searchIntentId);
		if (pendingOperation) {
			if (!sameSearchIntentBinding(pendingOperation, searchIntentBinding)) {
				const conflict = searchIntentConflictResponse();
				return res.status(conflict.statusCode).json(conflict.body);
			}
			const pendingResponse = await pendingOperation.promise;
			return res.status(pendingResponse.statusCode).json(pendingResponse.body);
		}
	}

	const starterClaimAccess = await resolveSharedQueueStarterClaim({
		sharedNetwork: isSharedServerNetworkEnvironment(),
		account: queueUsername,
	});
	if (!starterClaimAccess.ok) {
		return res.status(starterClaimAccess.statusCode).json({ success: false, error: starterClaimAccess.error });
	}

	const executeQueueOperation = async (): Promise<ExistingQueueResponse> => {
		const existingResponse = await getExistingQueueResponse(req, peerId);
		if (existingResponse) return existingResponse;

		const { player: newPlayer, queueToken } = createQueuedPlayer({
			peerId,
			username: queueUsername,
			delegation: rawDelegation ?? undefined,
		});
		const result = await queueNewPlayer(newPlayer, queueToken);
		if (rawDelegation && delegationFingerprint) delegationProofFingerprints.set(rawDelegation.delegationId, delegationFingerprint);
		return queueJoinResultResponse(result);
	};

	if (!searchIntentId) {
		const outcome = await executeQueueOperation();
		return res.status(outcome.statusCode).json(outcome.body);
	}

	// Set the promise before starting the async work. Two identical POSTs can
	// therefore share one queue insertion even when both requests arrive before
	// the first response is available.
	const operationPromise = Promise.resolve().then(executeQueueOperation);
	const operation: SearchIntentOperation = { ...searchIntentBinding, promise: operationPromise };
	searchIntentOperations.set(searchIntentId, operation);
	try {
		const outcome = await operationPromise;
		if (outcome.statusCode < 400) {
			const queueToken = typeof outcome.body.queueToken === 'string'
				? outcome.body.queueToken
				: readQueueToken(req);
			if (queueToken) {
				rememberSearchIntent(searchIntentId, {
					...searchIntentBinding,
					queueToken,
					createdAt: Date.now(),
				});
			}
		}
		return res.status(outcome.statusCode).json(outcome.body);
	} finally {
		if (searchIntentOperations.get(searchIntentId)?.promise === operationPromise) {
			searchIntentOperations.delete(searchIntentId);
		}
	}
});

router.post('/accept', validateQueuePeerId, requireMatchmakingSession, async (req: Request, res: Response) => {
	const { peerId } = req.body;
	const offerId = typeof req.body?.offerId === 'string' ? req.body.offerId : '';
	const proof = readMatchAcceptanceProof(req.body?.acceptance);
	if (!offerId || !proof) {
		return res.status(400).json({ success: false, error: 'offerId and valid match acceptance required' });
	}
	const sessionUsername = Reflect.get(req, 'hiveUsername');
	if (isSharedServerNetworkEnvironment() && proof.protocol !== 'ragnarok-match-accept-v2' && (
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
		const recordedAcceptance = activeMatch.player1 === peerId
			? activeMatch.player1Acceptance
			: activeMatch.player2Acceptance;
		const sameSignature = recordedAcceptance && recordedAcceptance.protocol === 'ragnarok-match-accept-v2' && proof.protocol === 'ragnarok-match-accept-v2'
			? recordedAcceptance.sessionSig === proof.sessionSig
			: recordedAcceptance?.hiveSig === proof.hiveSig;
		if (!recordedAcceptance || acceptanceMessage(recordedAcceptance) !== acceptanceMessage(proof) || !sameSignature) {
			return res.status(409).json({ success: false, error: 'match acceptance proof does not match the committed match' });
		}
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
		const sameSignature = previous.protocol === 'ragnarok-match-accept-v2' && proof.protocol === 'ragnarok-match-accept-v2'
			? previous.sessionSig === proof.sessionSig
			: previous.hiveSig === proof.hiveSig;
		if (acceptanceMessage(previous) !== acceptanceMessage(proof) || !sameSignature) {
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
	clearSearchIntentForPeer(peerId);
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
		clearSearchIntentForPeer(peerId);
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
			clearSearchIntentForPeer(peerId);
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

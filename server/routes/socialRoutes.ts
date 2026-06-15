import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'crypto';
import {
	isTimestampFresh,
	isValidHiveUsername,
	verifyHiveAuth,
} from '../services/hiveAuth';
import { hasAcceptedWarbandRelation } from '../services/warbandRelations';
import { buildServerSignedChallenge } from '../services/p2pChallengeSigner';
import { buildP2PMatchTicket } from '../services/p2pMatchTicketSigner';
import { consumeWindowRateLimit, type RateLimitBucket } from '../services/p2pRateLimit';
import { hasStarterCeremonyClaim } from '../services/starterClaimRegistry';
import { log } from '../static';
import {
	requireHiveHeaderAuth,
	type HiveAuthenticatedRequest,
} from '../middleware/hiveAuth';
import {
	CHALLENGE_RATE_LIMIT_MAX_ACCEPTED,
	CHALLENGE_RATE_LIMIT_WINDOW_MS,
	CHALLENGE_STALE_THRESHOLD_MS,
	MAX_PEER_ID_LENGTH,
	PRESENCE_RATE_LIMIT_MAX_ACCEPTED,
	PRESENCE_RATE_LIMIT_WINDOW_MS,
	isSafePeerId,
	normalizeHiveUsername,
	parsePresenceHeartbeatBody,
	type ChallengeRejectReason,
	type P2PAvailabilityState,
	type ServerSignedChallenge,
} from '../../shared/p2pAvailability';

const router = Router();

type PresenceRecord = { peerId?: string; lastSeen: number; availability: P2PAvailabilityState };
type PresenceStatus = { online: boolean; peerId?: string; lastSeen?: number; availability?: P2PAvailabilityState; canReceiveChallenge?: boolean };
type ChallengeRequestBody = {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
};
type ChallengeAvailability =
	| { readonly ok: true; readonly targetPresence: PresenceRecord }
	| { readonly ok: false; readonly status: number; readonly reason: ChallengeRejectReason; readonly retryAfterMs?: number };
type DirectChallengePair =
	| {
		readonly ok: true;
		readonly challenge: ServerSignedChallenge;
		readonly opponentMatchChallenge: ServerSignedChallenge;
	}
	| { readonly ok: false };

const presenceMap = new Map<string, PresenceRecord>();
const challenges = new Map<string, ServerSignedChallenge[]>();
const presenceRateLimit: RateLimitBucket = new Map();
const challengeRateLimit: RateLimitBucket = new Map();

const PRESENCE_STALE_THRESHOLD_MS = 180_000;
const MAX_FRIENDS_LIST = 200;
const CHALLENGE_BODY_KEYS = new Set(['from', 'to', 'peerId']);
const SOCIAL_HEARTBEAT_ACTION = 'friend-heartbeat';
const SOCIAL_CHALLENGE_ACTION = 'friend-challenge';
const SOCIAL_CHALLENGES_ACTION = 'friend-challenges';
const SOCIAL_SESSION_ACTION = 'friend-session';
const SOCIAL_SESSION_COOKIE_NAME = 'ragnarok-friend-session';
const SOCIAL_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const socialSessions = new Map<string, { username: string; expiresAt: number; lastSeenAt: number }>();

type SocialSessionMessageBody = {
	readonly username: string;
	readonly timestamp: number;
	readonly signature: string;
};

function createFriendSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

function pruneExpiredSessions(now: number): void {
	for (const [token, session] of socialSessions.entries()) {
		if (session.expiresAt <= now) {
			socialSessions.delete(token);
		}
	}
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
	if (!cookieHeader) return null;
	for (const rawPart of cookieHeader.split(';')) {
		const part = rawPart.trim();
		const separator = part.indexOf('=');
		if (separator <= 0) continue;
		if (part.slice(0, separator) !== name) continue;
		return part.slice(separator + 1);
	}
	return null;
}

function readFriendSessionRequest(req: Request): FriendSessionRequest | null {
	const cookieToken = getCookieValue(req.headers.cookie, SOCIAL_SESSION_COOKIE_NAME);
	if (!cookieToken) return null;
	const now = Date.now();
	pruneExpiredSessions(now);
	const record = socialSessions.get(cookieToken);
	if (!record) return null;
	if (record.expiresAt <= now) {
		socialSessions.delete(cookieToken);
		return null;
	}
	record.lastSeenAt = now;
	record.expiresAt = Math.max(record.expiresAt, now + SOCIAL_SESSION_TTL_MS);
	return { username: record.username };
}

function writeFriendSessionCookie() {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/api/friends',
		maxAge: SOCIAL_SESSION_TTL_MS,
	};
}

function readSessionLoginBody(value: unknown): SocialSessionMessageBody | null {
	if (!isRecord(value)) return null;
	if (typeof value.username !== 'string') return null;
	if (typeof value.signature !== 'string') return null;
	const timestamp = value.timestamp;
	if (typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp) || timestamp <= 0) return null;
	return {
		username: value.username,
		timestamp,
		signature: value.signature,
	};
}

type FriendSessionRequest = {
	readonly username: string;
};

function buildMessageFromSessionBody(body: SocialSessionMessageBody): string {
	const normalized = body.username.trim().toLowerCase();
	return `ragnarok-${SOCIAL_SESSION_ACTION}:${normalized}:${body.timestamp}`;
}

function createRequireFriendAuth(
	buildMessage: (req: Request, username: string, timestamp: number) => string,
) {
	const headerAuth = requireHiveHeaderAuth({
		buildMessage,
	});

	return async (req: Request, res: Response, next: () => void): Promise<void> => {
		const requestSession = readFriendSessionRequest(req);
		if (requestSession) {
			const authenticatedReq: HiveAuthenticatedRequest = req;
			authenticatedReq.hiveUsername = requestSession.username;
			next();
			return;
		}

		await Promise.resolve(headerAuth(req, res, next));
	};
}

const requireFriendHeartbeatAuth = createRequireFriendAuth(
	(_req, username, timestamp) => `ragnarok-${SOCIAL_HEARTBEAT_ACTION}:${username}:${timestamp}`,
);

const requireFriendChallengeAuth = createRequireFriendAuth(
	(_req, username, timestamp) => `ragnarok-${SOCIAL_CHALLENGE_ACTION}:${username}:${timestamp}`,
);

const requireFriendChallengesAuth = createRequireFriendAuth(
	(_req, username, timestamp) => `ragnarok-${SOCIAL_CHALLENGES_ACTION}:${username}:${timestamp}`,
);

type P2PSocialStats = Readonly<{
	onlineUsers: number;
	availableUsers: number;
	matchmakingUsers: number;
	inMatchUsers: number;
	reconnectingUsers: number;
	busyUsers: number;
	pendingChallenges: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) return false;
	}
	return true;
}

function getRequestIp(req: Request): string {
	return req.ip || req.socket.remoteAddress || 'unknown';
}

function sendReject(res: Response, status: number, reason: ChallengeRejectReason, retryAfterMs?: number): void {
	res.status(status).json({
		ok: false,
		reason,
		...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
	});
}

function challengeRejectStatus(reason: ChallengeRejectReason): number {
	if (reason === 'rate_limited') return 429;
	if (reason === 'not_warband' || reason === 'starter_claim_required') return 403;
	if (reason === 'invalid_input') return 400;
	if (reason === 'offline' || reason === 'stale_peer') return 404;
	if (reason === 'server_unconfigured') return 503;
	return 409;
}

function challengeReasonForAvailability(availability: P2PAvailabilityState): ChallengeRejectReason | null {
	if (availability === 'available') return null;
	if (availability === 'offline') return 'offline';
	if (availability === 'matchmaking') return 'matchmaking';
	if (availability === 'in_match') return 'in_match';
	if (availability === 'reconnecting') return 'reconnecting';
	return 'busy';
}

function isChallengeable(presence: { peerId?: string; availability: P2PAvailabilityState } | undefined): boolean {
	return !!presence?.peerId && presence.availability === 'available';
}

function isSharedServerNetworkEnvironment(): boolean {
	return process.env.VITE_NETWORK_STAGE === 'testnet' || process.env.VITE_NETWORK_STAGE === 'mainnet';
}

async function canUseSharedSocialP2P(username: string): Promise<boolean> {
	if (!isSharedServerNetworkEnvironment()) return true;
	return hasStarterCeremonyClaim(username);
}

function blockedPresence(): { peerId?: string; availability: P2PAvailabilityState } {
	return { availability: 'offline' };
}

function presenceForSharedP2P(presence: PresenceRecord, p2pAllowed: boolean): { peerId?: string; availability: P2PAvailabilityState } {
	return p2pAllowed ? presence : blockedPresence();
}

function presenceStatusFromRecord(presence: PresenceRecord | undefined, p2pAllowed: boolean): PresenceStatus {
	if (!presence) return { online: false, availability: 'offline', canReceiveChallenge: false };
	const visible = presenceForSharedP2P(presence, p2pAllowed);
	return {
		online: true,
		peerId: visible.peerId,
		lastSeen: presence.lastSeen,
		availability: visible.availability,
		canReceiveChallenge: isChallengeable(visible),
	};
}

function writeHeartbeatPresence(input: {
	readonly username: string;
	readonly peerId: string | undefined;
	readonly availability: P2PAvailabilityState | undefined;
	readonly p2pAllowed: boolean;
	readonly now?: number;
}): void {
	presenceMap.set(input.username, {
		peerId: input.p2pAllowed && typeof input.peerId === 'string' ? input.peerId.slice(0, MAX_PEER_ID_LENGTH) : undefined,
		lastSeen: input.now ?? Date.now(),
		availability: input.p2pAllowed ? input.availability ?? (input.peerId ? 'available' : 'offline') : 'offline',
	});
}

function readChallengeRequestBody(value: unknown): ChallengeRequestBody | null {
	if (!isRecord(value) || !hasOnlyKeys(value, CHALLENGE_BODY_KEYS)) return null;
	const { from, to, peerId } = value;
	if (!from || typeof from !== 'string' || !to || typeof to !== 'string' || !peerId || typeof peerId !== 'string') return null;
	const normalizedFrom = normalizeHiveUsername(from);
	const normalizedTo = normalizeHiveUsername(to);
	if (!isValidHiveUsername(normalizedFrom) || !isValidHiveUsername(normalizedTo)) return null;
	if (!isSafePeerId(peerId)) return null;
	return { from: normalizedFrom, to: normalizedTo, peerId };
}

async function canBothPlayersUseSharedSocialP2P(from: string, to: string): Promise<boolean> {
	return await canUseSharedSocialP2P(from) && await canUseSharedSocialP2P(to);
}

function readChallengeAvailability(input: {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
	readonly now: number;
}): ChallengeAvailability {
	const senderPresence = presenceMap.get(input.from);
	if (senderPresence) {
		const senderReason = challengeReasonForAvailability(senderPresence.availability);
		if (senderReason) return { ok: false, status: challengeRejectStatus(senderReason), reason: senderReason };
	}
	presenceMap.set(input.from, {
		peerId: input.peerId,
		lastSeen: input.now,
		availability: 'available',
	});

	const targetPresence = presenceMap.get(input.to);
	if (!targetPresence) return { ok: false, status: 404, reason: 'offline' };
	const targetReason = challengeReasonForAvailability(targetPresence.availability);
	if (targetReason) return { ok: false, status: challengeRejectStatus(targetReason), reason: targetReason };
	if (!targetPresence.peerId) return { ok: false, status: 404, reason: 'stale_peer' };

	const limit = consumeWindowRateLimit({
		bucket: challengeRateLimit,
		key: `${input.from}:${input.to}`,
		limit: CHALLENGE_RATE_LIMIT_MAX_ACCEPTED,
		windowMs: CHALLENGE_RATE_LIMIT_WINDOW_MS,
		now: input.now,
	});
	if (!limit.allowed) {
		return { ok: false, status: 429, reason: 'rate_limited', retryAfterMs: limit.retryAfterMs };
	}

	return { ok: true, targetPresence };
}

function buildDirectChallengePair(input: {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
	readonly targetPresence: PresenceRecord;
	readonly now: number;
}): DirectChallengePair {
	if (!input.targetPresence.peerId) return { ok: false };
	try {
		const senderMatchTicket = buildP2PMatchTicket({
			roomId: input.peerId,
			peerId: input.peerId,
			account: input.from,
			now: input.now,
		});
		const targetMatchTicket = buildP2PMatchTicket({
			roomId: input.peerId,
			peerId: input.targetPresence.peerId,
			account: input.to,
			now: input.now,
		});

		const challenge = {
			...buildServerSignedChallenge({
				from: input.from,
				to: input.to,
				peerId: input.peerId,
				timestamp: input.now,
				expiresAt: input.now + CHALLENGE_STALE_THRESHOLD_MS,
			}),
			matchTicket: targetMatchTicket,
		};
		const opponentMatchChallenge = {
			...buildServerSignedChallenge({
				from: input.to,
				to: input.from,
				peerId: input.targetPresence.peerId,
				timestamp: input.now,
				expiresAt: input.now + CHALLENGE_STALE_THRESHOLD_MS,
			}),
			matchTicket: senderMatchTicket,
		};
		return { ok: true, challenge, opponentMatchChallenge };
	} catch (err) {
		log(`Challenge signing unavailable: ${err instanceof Error ? err.message : String(err)}`, 'Social');
		return { ok: false };
	}
}

function senderVisibleChallenge(challenge: ServerSignedChallenge): ServerSignedChallenge {
	return {
		from: challenge.from,
		to: challenge.to,
		peerId: challenge.peerId,
		timestamp: challenge.timestamp,
		expiresAt: challenge.expiresAt,
		nonce: challenge.nonce,
		sigAlg: challenge.sigAlg,
		serverSig: challenge.serverSig,
	};
}

function pruneStale() {
	const now = Date.now();
	for (const [user, data] of presenceMap) {
		if (now - data.lastSeen > PRESENCE_STALE_THRESHOLD_MS) {
			presenceMap.delete(user);
			challenges.delete(user);
		}
	}
	for (const [user, list] of challenges) {
		const fresh = list.filter(c => c.expiresAt > now);
		if (fresh.length === 0) challenges.delete(user);
		else challenges.set(user, fresh);
	}
}

export function getP2PSocialStats(): P2PSocialStats {
	pruneStale();
	let availableUsers = 0;
	let matchmakingUsers = 0;
	let inMatchUsers = 0;
	let reconnectingUsers = 0;
	let busyUsers = 0;

	for (const presence of presenceMap.values()) {
		if (presence.availability === 'available') availableUsers += 1;
		else if (presence.availability === 'matchmaking') matchmakingUsers += 1;
		else if (presence.availability === 'in_match') inMatchUsers += 1;
		else if (presence.availability === 'reconnecting') reconnectingUsers += 1;
		else if (presence.availability !== 'offline') busyUsers += 1;
	}

	let pendingChallenges = 0;
	for (const list of challenges.values()) {
		pendingChallenges += list.length;
	}

	return {
		onlineUsers: presenceMap.size,
		availableUsers,
		matchmakingUsers,
		inMatchUsers,
		reconnectingUsers,
		busyUsers,
		pendingChallenges,
	};
}

export function clearP2PSocialStateForTests(): void {
	presenceMap.clear();
	challenges.clear();
	presenceRateLimit.clear();
	challengeRateLimit.clear();
	socialSessions.clear();
}

router.post('/session/login', async (req: Request, res: Response) => {
	const body = readSessionLoginBody(req.body);
	if (!body) {
		res.status(400).json({ error: 'Invalid social session login body' });
		return;
	}

	const normalizedUsername = body.username.trim().toLowerCase();
	if (!isValidHiveUsername(normalizedUsername)) {
		res.status(400).json({ error: 'invalid username' });
		return;
	}

	if (!isTimestampFresh(body.timestamp)) {
		res.status(401).json({ error: 'Timestamp is expired' });
		return;
	}

	const message = buildMessageFromSessionBody({
		username: normalizedUsername,
		timestamp: body.timestamp,
		signature: body.signature,
	});
	const authResult = await verifyHiveAuth(normalizedUsername, message, body.signature);
	if (!authResult.valid) {
		res.status(401).json({ error: 'Invalid social session signature' });
		return;
	}

	const token = createFriendSessionToken();
	const now = Date.now();
	const expiresAt = now + SOCIAL_SESSION_TTL_MS;
	socialSessions.set(token, {
		username: normalizedUsername,
		expiresAt,
		lastSeenAt: now,
	});
	res.cookie(SOCIAL_SESSION_COOKIE_NAME, token, writeFriendSessionCookie());
	res.json({ success: true, expiresAt });
});

router.get('/session/status', (req: Request, res: Response) => {
	const requestSession = readFriendSessionRequest(req);
	if (!requestSession) {
		res.status(401).json({ authenticated: false, reason: 'Session required' });
		return;
	}

	res.json({
		authenticated: true,
		username: requestSession.username,
	});
});

router.post('/heartbeat', requireFriendHeartbeatAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	const parsed = parsePresenceHeartbeatBody(req.body);
	if (!parsed.ok) {
		sendReject(res, 400, parsed.reason);
		return;
	}
	if (parsed.value.username !== req.hiveUsername) {
		res.status(403).json({ error: 'forbidden', reason: 'username_mismatch' });
		return;
	}

	const { username, peerId, friends, availability } = parsed.value;
	const p2pAllowed = await canUseSharedSocialP2P(username);
	const limit = consumeWindowRateLimit({
		bucket: presenceRateLimit,
		key: `${username}:${getRequestIp(req)}`,
		limit: PRESENCE_RATE_LIMIT_MAX_ACCEPTED,
		windowMs: PRESENCE_RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.allowed) {
		sendReject(res, 429, 'rate_limited', limit.retryAfterMs);
		return;
	}
	const seen = new Set<string>();
	const friendList: string[] = [];
	for (const f of friends) {
		if (typeof f !== 'string') continue;
		const normalized = f.toLowerCase();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		if (friendList.length >= MAX_FRIENDS_LIST) break;
		friendList.push(normalized);
	}

	pruneStale();

	writeHeartbeatPresence({
		username,
		peerId,
		availability,
		p2pAllowed,
	});

	const statuses: Record<string, PresenceStatus> = {};

	for (const friend of friendList) {
		const normalized = friend.toLowerCase();
		if (!hasAcceptedWarbandRelation(username, normalized)) {
			statuses[normalized] = { online: false, availability: 'offline', canReceiveChallenge: false };
			continue;
		}

		const presence = presenceMap.get(normalized);
		const friendP2PAllowed = await canUseSharedSocialP2P(normalized);
		statuses[normalized] = presenceStatusFromRecord(presence, friendP2PAllowed);
	}

	const pending = p2pAllowed ? challenges.get(username) || [] : [];
	challenges.delete(username);

	res.json({ statuses, challenges: pending });
});

router.post('/challenge', requireFriendChallengeAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	const body = readChallengeRequestBody(req.body);
	if (!body) {
		sendReject(res, 400, 'invalid_input');
		return;
	}
	if (req.hiveUsername !== body.from) {
		res.status(403).json({ error: 'forbidden', reason: 'username_mismatch' });
		return;
	}
	if (body.from === body.to) {
		sendReject(res, 400, 'self_challenge');
		return;
	}
	if (!hasAcceptedWarbandRelation(body.from, body.to)) {
		sendReject(res, 403, 'not_warband');
		return;
	}
	if (!await canBothPlayersUseSharedSocialP2P(body.from, body.to)) {
		sendReject(res, 403, 'starter_claim_required');
		return;
	}

	pruneStale();
	const now = Date.now();
	const availability = readChallengeAvailability({ ...body, now });
	if (!availability.ok) {
		sendReject(res, availability.status, availability.reason, availability.retryAfterMs);
		return;
	}

	const pair = buildDirectChallengePair({
		...body,
		targetPresence: availability.targetPresence,
		now,
	});
	if (!pair.ok) {
		sendReject(res, 503, 'server_unconfigured');
		return;
	}
	const existing = challenges.get(body.to) || [];
	existing.push(pair.challenge);
	challenges.set(body.to, existing.slice(-10));

	res.json({
		ok: true,
		challenge: senderVisibleChallenge(pair.challenge),
		opponentMatchChallenge: pair.opponentMatchChallenge,
	});
});

router.get('/challenges/:username', requireFriendChallengesAuth, async (req: HiveAuthenticatedRequest, res: Response) => {
	const username = normalizeHiveUsername(req.params.username);
	if (!isValidHiveUsername(username)) {
		sendReject(res, 400, 'invalid_input');
		return;
	}
	if (req.hiveUsername !== username) {
		res.status(403).json({ error: 'forbidden', reason: 'username_mismatch' });
		return;
	}
	if (!await canUseSharedSocialP2P(username)) {
		challenges.delete(username);
		sendReject(res, 403, 'starter_claim_required');
		return;
	}
	pruneStale();
	const pending = challenges.get(username) || [];
	challenges.delete(username);
	res.json({ challenges: pending });
});

export default router;

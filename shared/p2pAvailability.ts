export const PRESENCE_RATE_LIMIT_WINDOW_MS = 180_000;
export const PRESENCE_RATE_LIMIT_MAX_ACCEPTED = 2;
export const CHALLENGE_RATE_LIMIT_WINDOW_MS = 180_000;
export const CHALLENGE_RATE_LIMIT_MAX_ACCEPTED = 1;

export const MAX_FRIENDS_LIST = 200;
export const MAX_PEER_ID_LENGTH = 64;
export const MAX_MATCH_ID_LENGTH = 256;
export const MAX_ROOM_ID_LENGTH = 256;
export const CHALLENGE_STALE_THRESHOLD_MS = 90_000;
export const CHALLENGE_SIGNATURE_ALGORITHM = 'hmac-sha256:canonical-json:v1';
export const P2P_MATCH_TICKET_SIGNATURE_ALGORITHM = 'hmac-sha256:p2p-match-ticket:v1';
export const P2P_MATCH_TICKET_WS_PROTOCOL = 'ragnarok-p2p-v1';
export const P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX = 'ragnarok-p2p-ticket.';
export const MAX_P2P_MATCH_TICKET_TOKEN_LENGTH = 2048;

const HIVE_USERNAME_RE = /^[a-z][a-z0-9.-]{2,15}$/;
const SAFE_ID_RE = /^[A-Za-z0-9._:-]+$/;
const SERVER_SIGNATURE_RE = /^[a-f0-9]{64}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{16,80}$/;
const MATCH_TICKET_TOKEN_RE = /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/;

export type P2PConnectionAvailabilityState =
	| 'disconnected'
	| 'connecting'
	| 'waiting'
	| 'connected'
	| 'reconnecting'
	| 'grace_period'
	| 'error';

export type P2PAvailabilityState =
	| 'available'
	| 'challenging'
	| 'challenge_pending'
	| 'matchmaking'
	| 'in_match'
	| 'reconnecting'
	| 'busy'
	| 'offline';

export type ChallengeRejectReason =
	| 'offline'
	| 'busy'
	| 'matchmaking'
	| 'in_match'
	| 'reconnecting'
	| 'not_warband'
	| 'rate_limited'
	| 'stale_peer'
	| 'self_challenge'
	| 'server_unconfigured'
	| 'starter_claim_required'
	| 'invalid_input';

export type PresenceHeartbeatBody = {
	readonly username: string;
	readonly friends: readonly string[];
	readonly peerId?: string;
	readonly availability?: P2PAvailabilityState;
};

export type FriendPresenceSnapshot = {
	readonly online: boolean;
	readonly peerId?: string;
	readonly lastSeen?: number;
	readonly availability?: P2PAvailabilityState;
	readonly canReceiveChallenge?: boolean;
	readonly retryAfterMs?: number;
};

export type ServerSignedChallenge = {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
	readonly timestamp: number;
	readonly expiresAt: number;
	readonly nonce: string;
	readonly sigAlg: typeof CHALLENGE_SIGNATURE_ALGORITHM;
	readonly serverSig: string;
	readonly matchTicket?: P2PMatchTicket;
};

export type P2PMatchTicket = {
	readonly token: string;
	readonly roomId: string;
	readonly peerId: string;
	readonly expiresAt: number;
};

export type PresenceHeartbeatResponse = {
	readonly statuses: Record<string, FriendPresenceSnapshot>;
	readonly challenges: readonly ServerSignedChallenge[];
};

export type ChallengeSendResponse =
	| {
		readonly ok: true;
		readonly challenge?: ServerSignedChallenge;
		readonly opponentMatchChallenge?: ServerSignedChallenge;
	}
	| {
		readonly ok: false;
		readonly reason: ChallengeRejectReason;
		readonly retryAfterMs?: number;
	};

type ParseOk<T> = { readonly ok: true; readonly value: T };
type ParseFail = { readonly ok: false; readonly reason: ChallengeRejectReason; readonly detail: string };
export type ParseResult<T> = ParseOk<T> | ParseFail;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) return false;
	}
	return true;
}

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function normalizeHiveUsername(value: string): string {
	return value.trim().toLowerCase().replace(/^@/, '');
}

export function isValidAvailabilityHiveUsername(value: string): boolean {
	return HIVE_USERNAME_RE.test(value);
}

export function isSafePeerId(value: string): boolean {
	return value.length > 0 && value.length <= MAX_PEER_ID_LENGTH && SAFE_ID_RE.test(value);
}

export function isSafeRoomOrMatchId(value: string): boolean {
	return value.length > 0 && value.length <= MAX_ROOM_ID_LENGTH && SAFE_ID_RE.test(value);
}

export function isP2PConnectionStateBusy(state: P2PConnectionAvailabilityState): boolean {
	return (
		state === 'connecting'
		|| state === 'waiting'
		|| state === 'connected'
		|| state === 'reconnecting'
		|| state === 'grace_period'
	);
}

export function availabilityFromConnectionState(
	state: P2PConnectionAvailabilityState,
	matchmakingStatus?: 'idle' | 'queued' | 'offered' | 'accepting' | 'waiting_opponent' | 'ready' | 'connecting' | 'error',
): P2PAvailabilityState {
	if (matchmakingStatus === 'queued' || matchmakingStatus === 'offered' || matchmakingStatus === 'accepting' || matchmakingStatus === 'waiting_opponent') return 'matchmaking';
	if (matchmakingStatus === 'ready' || matchmakingStatus === 'connecting') return 'in_match';
	if (state === 'reconnecting' || state === 'grace_period') return 'reconnecting';
	if (isP2PConnectionStateBusy(state)) return 'busy';
	if (state === 'disconnected' || state === 'error') return 'available';
	return 'busy';
}

const HEARTBEAT_BODY_KEYS = new Set(['username', 'friends', 'peerId', 'availability']);

export function parsePresenceHeartbeatBody(input: unknown): ParseResult<PresenceHeartbeatBody> {
	if (!isRecord(input)) {
		return { ok: false, reason: 'invalid_input', detail: 'body must be an object' };
	}
	if (!hasOnlyKeys(input, HEARTBEAT_BODY_KEYS)) {
		return { ok: false, reason: 'invalid_input', detail: 'body contains unknown fields' };
	}

	const { username, friends, peerId } = input;
	if (typeof username !== 'string') {
		return { ok: false, reason: 'invalid_input', detail: 'username required' };
	}
	const normalized = normalizeHiveUsername(username);
	if (!isValidAvailabilityHiveUsername(normalized)) {
		return { ok: false, reason: 'invalid_input', detail: 'invalid username' };
	}
	if (!Array.isArray(friends)) {
		return { ok: false, reason: 'invalid_input', detail: 'friends must be an array' };
	}
	if (friends.length > MAX_FRIENDS_LIST) {
		return { ok: false, reason: 'invalid_input', detail: 'too many friends' };
	}

	const seen = new Set<string>();
	const normalizedFriends: string[] = [];
	for (const friend of friends) {
		if (typeof friend !== 'string') {
			return { ok: false, reason: 'invalid_input', detail: 'friend username must be a string' };
		}
		const normalizedFriend = normalizeHiveUsername(friend);
		if (!isValidAvailabilityHiveUsername(normalizedFriend)) {
			return { ok: false, reason: 'invalid_input', detail: 'invalid friend username' };
		}
		if (seen.has(normalizedFriend)) continue;
		seen.add(normalizedFriend);
		normalizedFriends.push(normalizedFriend);
	}

	if (peerId !== undefined) {
		if (typeof peerId !== 'string' || !isSafePeerId(peerId)) {
			return { ok: false, reason: 'invalid_input', detail: 'invalid peerId' };
		}
		if (input.availability !== undefined) {
			if (!isP2PAvailabilityState(input.availability)) {
				return { ok: false, reason: 'invalid_input', detail: 'invalid availability' };
			}
			return {
				ok: true,
				value: { username: normalized, friends: normalizedFriends, peerId, availability: input.availability },
			};
		}
		return { ok: true, value: { username: normalized, friends: normalizedFriends, peerId } };
	}

	if (input.availability !== undefined) {
		if (!isP2PAvailabilityState(input.availability)) {
			return { ok: false, reason: 'invalid_input', detail: 'invalid availability' };
		}
		return {
			ok: true,
			value: { username: normalized, friends: normalizedFriends, availability: input.availability },
		};
	}

	return { ok: true, value: { username: normalized, friends: normalizedFriends } };
}

const PRESENCE_KEYS = new Set(['online', 'peerId', 'lastSeen', 'availability', 'canReceiveChallenge', 'retryAfterMs']);
const AVAILABILITY_STATES: ReadonlySet<string> = new Set([
	'available',
	'challenging',
	'challenge_pending',
	'matchmaking',
	'in_match',
	'reconnecting',
	'busy',
	'offline',
]);

function isP2PAvailabilityState(value: unknown): value is P2PAvailabilityState {
	return typeof value === 'string' && AVAILABILITY_STATES.has(value);
}

function readFriendPresenceSnapshot(input: unknown): FriendPresenceSnapshot | null {
	if (!isRecord(input) || !hasOnlyKeys(input, PRESENCE_KEYS)) return null;
	if (typeof input.online !== 'boolean') return null;
	const snapshot: FriendPresenceSnapshot = { online: input.online };

	if (input.peerId !== undefined && (typeof input.peerId !== 'string' || !isSafePeerId(input.peerId))) return null;
	if (input.lastSeen !== undefined && !isNonNegativeInteger(input.lastSeen)) return null;
	if (input.availability !== undefined && !isP2PAvailabilityState(input.availability)) return null;
	if (input.canReceiveChallenge !== undefined && typeof input.canReceiveChallenge !== 'boolean') return null;
	if (input.retryAfterMs !== undefined && !isNonNegativeInteger(input.retryAfterMs)) return null;

	return {
		...snapshot,
		...(typeof input.peerId === 'string' ? { peerId: input.peerId } : {}),
		...(typeof input.lastSeen === 'number' ? { lastSeen: input.lastSeen } : {}),
		...(isP2PAvailabilityState(input.availability) ? { availability: input.availability } : {}),
		...(typeof input.canReceiveChallenge === 'boolean' ? { canReceiveChallenge: input.canReceiveChallenge } : {}),
		...(typeof input.retryAfterMs === 'number' ? { retryAfterMs: input.retryAfterMs } : {}),
	};
}

const CHALLENGE_KEYS = new Set(['from', 'to', 'peerId', 'timestamp', 'expiresAt', 'nonce', 'sigAlg', 'serverSig', 'matchTicket']);

export function readServerSignedChallenge(input: unknown): ServerSignedChallenge | null {
	if (!isRecord(input) || !hasOnlyKeys(input, CHALLENGE_KEYS)) return null;
	const matchTicket = input.matchTicket === undefined ? undefined : readP2PMatchTicket(input.matchTicket);
	if (input.matchTicket !== undefined && !matchTicket) return null;
	if (typeof input.from !== 'string') return null;
	const from = normalizeHiveUsername(input.from);
	if (!isValidAvailabilityHiveUsername(from)) return null;
	if (typeof input.to !== 'string') return null;
	const to = normalizeHiveUsername(input.to);
	if (!isValidAvailabilityHiveUsername(to)) return null;
	if (typeof input.peerId !== 'string' || !isSafePeerId(input.peerId)) return null;
	if (!isNonNegativeInteger(input.timestamp)) return null;
	if (!isNonNegativeInteger(input.expiresAt)) return null;
	if (input.expiresAt <= input.timestamp) return null;
	if (typeof input.nonce !== 'string' || !NONCE_RE.test(input.nonce)) return null;
	if (input.sigAlg !== CHALLENGE_SIGNATURE_ALGORITHM) return null;
	if (typeof input.serverSig !== 'string' || !SERVER_SIGNATURE_RE.test(input.serverSig)) return null;

	return {
		from,
		to,
		peerId: input.peerId,
		timestamp: input.timestamp,
		expiresAt: input.expiresAt,
		nonce: input.nonce,
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: input.serverSig,
		...(matchTicket ? { matchTicket } : {}),
	};
}

const MATCH_TICKET_KEYS = new Set(['token', 'roomId', 'peerId', 'expiresAt']);

export function readP2PMatchTicket(input: unknown): P2PMatchTicket | null {
	if (!isRecord(input) || !hasOnlyKeys(input, MATCH_TICKET_KEYS)) return null;
	if (
		typeof input.token !== 'string'
		|| input.token.length > MAX_P2P_MATCH_TICKET_TOKEN_LENGTH
		|| !MATCH_TICKET_TOKEN_RE.test(input.token)
	) return null;
	if (typeof input.roomId !== 'string' || !isSafeRoomOrMatchId(input.roomId)) return null;
	if (typeof input.peerId !== 'string' || !isSafePeerId(input.peerId)) return null;
	if (!isNonNegativeInteger(input.expiresAt)) return null;

	return {
		token: input.token,
		roomId: input.roomId,
		peerId: input.peerId,
		expiresAt: input.expiresAt,
	};
}

export function readPresenceHeartbeatResponse(input: unknown): PresenceHeartbeatResponse {
	if (!isRecord(input)) return { statuses: {}, challenges: [] };

	const statuses: Record<string, FriendPresenceSnapshot> = {};
	if (isRecord(input.statuses)) {
		for (const [username, presence] of Object.entries(input.statuses)) {
			const normalized = normalizeHiveUsername(username);
			if (!isValidAvailabilityHiveUsername(normalized)) continue;
			const parsed = readFriendPresenceSnapshot(presence);
			if (!parsed) continue;
			statuses[normalized] = parsed;
		}
	}

	const challenges: ServerSignedChallenge[] = [];
	if (Array.isArray(input.challenges)) {
		for (const challenge of input.challenges) {
			const parsed = readServerSignedChallenge(challenge);
			if (parsed) challenges.push(parsed);
		}
	}

	return { statuses, challenges };
}

const CHALLENGE_SEND_SUCCESS_KEYS = new Set(['ok', 'challenge', 'opponentMatchChallenge']);
const CHALLENGE_SEND_FAILURE_KEYS = new Set(['ok', 'reason', 'retryAfterMs']);
const CHALLENGE_REJECT_REASONS: ReadonlySet<string> = new Set([
	'offline',
	'busy',
	'matchmaking',
	'in_match',
	'reconnecting',
	'not_warband',
	'rate_limited',
	'stale_peer',
	'self_challenge',
	'server_unconfigured',
	'starter_claim_required',
	'invalid_input',
]);

function isChallengeRejectReason(value: unknown): value is ChallengeRejectReason {
	return typeof value === 'string' && CHALLENGE_REJECT_REASONS.has(value);
}

export function readChallengeSendResponse(input: unknown): ChallengeSendResponse {
	if (!isRecord(input)) {
		return { ok: false, reason: 'invalid_input' };
	}

	if (input.ok === true) {
		if (!hasOnlyKeys(input, CHALLENGE_SEND_SUCCESS_KEYS)) {
			return { ok: false, reason: 'invalid_input' };
		}
		const challenge = input.challenge === undefined ? null : readServerSignedChallenge(input.challenge);
		const opponentMatchChallenge = input.opponentMatchChallenge === undefined
			? null
			: readServerSignedChallenge(input.opponentMatchChallenge);
		if (
			(input.challenge !== undefined && !challenge)
			|| (input.opponentMatchChallenge !== undefined && !opponentMatchChallenge)
		) {
			return { ok: false, reason: 'invalid_input' };
		}
		if (!challenge && !opponentMatchChallenge) {
			return { ok: true };
		}
		return {
			ok: true,
			...(challenge ? { challenge } : {}),
			...(opponentMatchChallenge ? { opponentMatchChallenge } : {}),
		};
	}

	if (input.ok !== false || !hasOnlyKeys(input, CHALLENGE_SEND_FAILURE_KEYS)) {
		return { ok: false, reason: 'invalid_input' };
	}
	if (!isChallengeRejectReason(input.reason)) {
		return { ok: false, reason: 'invalid_input' };
	}
	if (input.retryAfterMs !== undefined && !isNonNegativeInteger(input.retryAfterMs)) {
		return { ok: false, reason: 'invalid_input' };
	}

	return {
		ok: false,
		reason: input.reason,
		...(typeof input.retryAfterMs === 'number' ? { retryAfterMs: input.retryAfterMs } : {}),
	};
}

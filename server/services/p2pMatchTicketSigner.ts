import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
	MAX_P2P_MATCH_TICKET_TOKEN_LENGTH,
	P2P_MATCH_TICKET_SIGNATURE_ALGORITHM,
	type P2PMatchTicket,
	type P2PMatchTicketScope,
	type P2PTransportRole,
	isSafePeerId,
	isSafeRoomOrMatchId,
	normalizeHiveUsername,
	isValidAvailabilityHiveUsername,
} from '../../shared/p2pAvailability';
import { canonicalStringify } from '../../shared/protocol-core/hash';

export type P2PMatchTicketPayload = {
	readonly v: 1;
	readonly purpose: 'p2p-room';
	readonly roomId: string;
	readonly peerId: string;
	readonly scope: P2PMatchTicketScope;
	readonly role?: P2PTransportRole;
	readonly account?: string;
	readonly issuedAt: number;
	readonly expiresAt: number;
	readonly nonce: string;
	readonly sigAlg: typeof P2P_MATCH_TICKET_SIGNATURE_ALGORITHM;
};

export type P2PMatchTicketVerifyResult =
	| { readonly ok: true; readonly payload: P2PMatchTicketPayload }
	| { readonly ok: false; readonly reason: 'missing' | 'malformed' | 'expired' | 'mismatch' | 'bad_signature' | 'server_unconfigured' };

const P2P_MATCH_TICKET_TTL_MS = 2 * 60 * 60 * 1000;
const P2P_MATCH_TICKET_SECRET_MIN_LENGTH = 32;
const HEX_SIGNATURE_RE = /^[a-f0-9]{64}$/;
let fallbackSigningSecret: string | null = null;

function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === 'production';
}

function getConfiguredSigningSecret(): string | undefined {
	const configured = process.env.P2P_CHALLENGE_SIGNING_SECRET?.trim();
	return configured && configured.length > 0 ? configured : undefined;
}

function getSigningSecret(): string {
	const configured = getConfiguredSigningSecret();
	if (configured && configured.length >= P2P_MATCH_TICKET_SECRET_MIN_LENGTH) return configured;
	if (isProductionRuntime()) {
		throw new Error(
			`P2P match ticket signing unavailable: P2P_CHALLENGE_SIGNING_SECRET must be at least ${P2P_MATCH_TICKET_SECRET_MIN_LENGTH} characters in production`,
		);
	}
	fallbackSigningSecret ??= randomBytes(32).toString('hex');
	return fallbackSigningSecret;
}

function signPayload(payload: P2PMatchTicketPayload): string {
	return createHmac('sha256', getSigningSecret())
		.update(canonicalStringify(payload), 'utf8')
		.digest('hex');
}

function encodePayload(payload: P2PMatchTicketPayload): string {
	return Buffer.from(canonicalStringify(payload), 'utf8').toString('base64url');
}

function decodePayload(value: string): unknown {
	try {
		const json = Buffer.from(value, 'base64url').toString('utf8');
		return JSON.parse(json);
	} catch {
		return null;
	}
}

function readPayload(input: unknown): P2PMatchTicketPayload | null {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
	const record = input as Record<string, unknown>;
	const allowed = new Set(['v', 'purpose', 'roomId', 'peerId', 'scope', 'role', 'account', 'issuedAt', 'expiresAt', 'nonce', 'sigAlg']);
	for (const key of Object.keys(record)) {
		if (!allowed.has(key)) return null;
	}
	if (record.v !== 1) return null;
	if (record.purpose !== 'p2p-room') return null;
	if (typeof record.roomId !== 'string' || !isSafeRoomOrMatchId(record.roomId)) return null;
	if (typeof record.peerId !== 'string' || !isSafePeerId(record.peerId)) return null;
	if (record.scope !== undefined && record.scope !== 'matchmaking' && record.scope !== 'direct-challenge') return null;
	if (record.role !== undefined && record.role !== 'offerer' && record.role !== 'answerer') return null;
	if (record.account !== undefined) {
		if (typeof record.account !== 'string') return null;
		const normalized = normalizeHiveUsername(record.account);
		if (!isValidAvailabilityHiveUsername(normalized)) return null;
	}
	if (typeof record.issuedAt !== 'number' || !Number.isSafeInteger(record.issuedAt) || record.issuedAt <= 0) return null;
	if (typeof record.expiresAt !== 'number' || !Number.isSafeInteger(record.expiresAt) || record.expiresAt <= record.issuedAt) return null;
	if (typeof record.nonce !== 'string' || record.nonce.length < 16 || record.nonce.length > 80) return null;
	if (record.sigAlg !== P2P_MATCH_TICKET_SIGNATURE_ALGORITHM) return null;

	return {
		v: 1,
		purpose: 'p2p-room',
		roomId: record.roomId,
		peerId: record.peerId,
		scope: record.scope === 'matchmaking' ? 'matchmaking' : 'direct-challenge',
		...(record.role === 'offerer' || record.role === 'answerer' ? { role: record.role } : {}),
		...(typeof record.account === 'string' ? { account: normalizeHiveUsername(record.account) } : {}),
		issuedAt: record.issuedAt,
		expiresAt: record.expiresAt,
		nonce: record.nonce,
		sigAlg: P2P_MATCH_TICKET_SIGNATURE_ALGORITHM,
	};
}

function signaturesMatch(expectedHex: string, receivedHex: string): boolean {
	if (!HEX_SIGNATURE_RE.test(expectedHex) || !HEX_SIGNATURE_RE.test(receivedHex)) return false;
	const expected = Buffer.from(expectedHex, 'hex');
	const received = Buffer.from(receivedHex, 'hex');
	return expected.length === received.length && timingSafeEqual(expected, received);
}

export function buildP2PMatchTicket(input: {
	readonly roomId: string;
	readonly peerId: string;
	readonly scope?: P2PMatchTicketScope;
	readonly role?: P2PTransportRole;
	readonly account?: string;
	readonly now?: number;
	readonly ttlMs?: number;
}): P2PMatchTicket {
	if (!isSafeRoomOrMatchId(input.roomId)) throw new Error('buildP2PMatchTicket: invalid roomId');
	if (!isSafePeerId(input.peerId)) throw new Error('buildP2PMatchTicket: invalid peerId');
	const normalizedAccount = input.account ? normalizeHiveUsername(input.account) : undefined;
	if (normalizedAccount && !isValidAvailabilityHiveUsername(normalizedAccount)) {
		throw new Error('buildP2PMatchTicket: invalid account');
	}
	const issuedAt = input.now ?? Date.now();
	const payload: P2PMatchTicketPayload = {
		v: 1,
		purpose: 'p2p-room',
		roomId: input.roomId,
		peerId: input.peerId,
		scope: input.scope ?? 'direct-challenge',
		...(input.role ? { role: input.role } : {}),
		...(normalizedAccount ? { account: normalizedAccount } : {}),
		issuedAt,
		expiresAt: issuedAt + (input.ttlMs ?? P2P_MATCH_TICKET_TTL_MS),
		nonce: randomBytes(18).toString('base64url'),
		sigAlg: P2P_MATCH_TICKET_SIGNATURE_ALGORITHM,
	};
	const token = `${encodePayload(payload)}.${signPayload(payload)}`;
	return {
		token,
		roomId: payload.roomId,
		peerId: payload.peerId,
		scope: payload.scope,
		expiresAt: payload.expiresAt,
		...(payload.role ? { role: payload.role } : {}),
	};
}

export function verifyP2PMatchTicketForRoom(input: {
	readonly token: string | null | undefined;
	readonly roomId: string;
	readonly peerId: string;
	readonly now?: number;
}): P2PMatchTicketVerifyResult {
	if (!input.token) return { ok: false, reason: 'missing' };
	if (input.token.length > MAX_P2P_MATCH_TICKET_TOKEN_LENGTH) return { ok: false, reason: 'malformed' };
	const [encodedPayload, signature, ...rest] = input.token.split('.');
	if (!encodedPayload || !signature || rest.length > 0 || !HEX_SIGNATURE_RE.test(signature)) {
		return { ok: false, reason: 'malformed' };
	}
	const payload = readPayload(decodePayload(encodedPayload));
	if (!payload) return { ok: false, reason: 'malformed' };
	if (payload.roomId !== input.roomId || payload.peerId !== input.peerId) {
		return { ok: false, reason: 'mismatch' };
	}
	if (payload.expiresAt <= (input.now ?? Date.now())) {
		return { ok: false, reason: 'expired' };
	}
	try {
		const expected = signPayload(payload);
		if (!signaturesMatch(expected, signature)) {
			return { ok: false, reason: 'bad_signature' };
		}
		return { ok: true, payload };
	} catch {
		return { ok: false, reason: 'server_unconfigured' };
	}
}

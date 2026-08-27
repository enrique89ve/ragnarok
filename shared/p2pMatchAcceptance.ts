import {
	isSafePeerId,
	isSafeRoomOrMatchId,
	isValidAvailabilityHiveUsername,
	normalizeHiveUsername,
} from './p2pAvailability';
import { canonicalStringify } from './protocol-core/hash';

export const MATCH_OFFER_PROTOCOL = 'ragnarok-match-offer-v1' as const;
export const MATCH_ACCEPTANCE_PROTOCOL = 'ragnarok-match-accept-v1' as const;
export const MATCH_OFFER_TTL_MS = 15_000;

export type MatchOfferPlayer = {
	readonly peerId: string;
	readonly username?: string;
	readonly elo: number;
};

export type MatchOffer = {
	readonly protocol: typeof MATCH_OFFER_PROTOCOL;
	readonly offerId: string;
	readonly matchId: string;
	readonly player: MatchOfferPlayer;
	readonly opponent: MatchOfferPlayer;
	readonly createdAt: number;
	readonly expiresAt: number;
	readonly serverNonce: string;
};

export type MatchAcceptanceV1 = {
	readonly protocol: typeof MATCH_ACCEPTANCE_PROTOCOL;
	readonly offerId: string;
	readonly matchId: string;
	readonly account?: string;
	readonly peerId: string;
	readonly opponentAccount?: string;
	readonly opponentPeerId: string;
	readonly ephemeralPubkey: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
	readonly serverNonce: string;
	readonly expiresAt: number;
};

export type MatchAcceptanceProof = MatchAcceptanceV1 & {
	readonly hiveSig?: string;
};

export function buildMatchAcceptanceMessage(acceptance: MatchAcceptanceV1): string {
	return `${MATCH_ACCEPTANCE_PROTOCOL} | ${canonicalStringify(acceptance)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
	return Object.keys(value).every((key) => allowed.has(key));
}

function isSafeText(value: unknown, maxLength: number): value is string {
	return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function readOfferPlayer(value: unknown): MatchOfferPlayer | null {
	if (!isRecord(value)) return null;
	const allowed = new Set(['peerId', 'username', 'elo']);
	if (!hasOnlyKeys(value, allowed)) return null;
	if (typeof value.peerId !== 'string' || !isSafePeerId(value.peerId)) return null;
	if (typeof value.elo !== 'number' || !Number.isFinite(value.elo)) return null;
	if (value.username !== undefined) {
		if (typeof value.username !== 'string') return null;
		const username = normalizeHiveUsername(value.username);
		if (!isValidAvailabilityHiveUsername(username)) return null;
		return { peerId: value.peerId, username, elo: value.elo };
	}
	return { peerId: value.peerId, elo: value.elo };
}

export function readMatchOffer(value: unknown): MatchOffer | null {
	if (!isRecord(value)) return null;
	const allowed = new Set(['protocol', 'offerId', 'matchId', 'player', 'opponent', 'createdAt', 'expiresAt', 'serverNonce']);
	if (!hasOnlyKeys(value, allowed) || value.protocol !== MATCH_OFFER_PROTOCOL) return null;
	const offerId = value.offerId;
	const matchId = value.matchId;
	const createdAt = value.createdAt;
	const expiresAt = value.expiresAt;
	const serverNonce = value.serverNonce;
	if (!isSafeText(offerId, 128) || typeof matchId !== 'string' || !isSafeRoomOrMatchId(matchId)) return null;
	const player = readOfferPlayer(value.player);
	const opponent = readOfferPlayer(value.opponent);
	if (!player || !opponent || player.peerId === opponent.peerId) return null;
	if (typeof createdAt !== 'number' || !Number.isSafeInteger(createdAt) || createdAt <= 0) return null;
	if (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= createdAt) return null;
	if (!isSafeText(serverNonce, 128)) return null;
	return {
		protocol: MATCH_OFFER_PROTOCOL,
		offerId,
		matchId,
		player,
		opponent,
		createdAt,
		expiresAt,
		serverNonce,
	};
}

export function readMatchAcceptanceProof(value: unknown): MatchAcceptanceProof | null {
	if (!isRecord(value)) return null;
	const allowed = new Set([
		'protocol', 'offerId', 'matchId', 'account', 'peerId', 'opponentAccount',
		'opponentPeerId', 'ephemeralPubkey', 'rulesetHash', 'engineHash', 'serverNonce', 'expiresAt', 'hiveSig',
	]);
	if (!hasOnlyKeys(value, allowed) || value.protocol !== MATCH_ACCEPTANCE_PROTOCOL) return null;
	const offerId = value.offerId;
	const matchId = value.matchId;
	const peerId = value.peerId;
	const opponentPeerId = value.opponentPeerId;
	const ephemeralPubkey = value.ephemeralPubkey;
	const rulesetHash = value.rulesetHash;
	const engineHash = value.engineHash;
	const serverNonce = value.serverNonce;
	const expiresAt = value.expiresAt;
	if (!isSafeText(offerId, 128) || typeof matchId !== 'string' || !isSafeRoomOrMatchId(matchId)) return null;
	if (typeof peerId !== 'string' || typeof opponentPeerId !== 'string' || !isSafePeerId(peerId) || !isSafePeerId(opponentPeerId) || peerId === opponentPeerId) return null;
	if (!isSafeText(ephemeralPubkey, 256) || !isSafeText(rulesetHash, 256) || !isSafeText(engineHash, 256)) return null;
	if (!isSafeText(serverNonce, 128) || typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= 0) return null;
	if (value.account !== undefined) {
		if (typeof value.account !== 'string' || !isValidAvailabilityHiveUsername(normalizeHiveUsername(value.account))) return null;
	}
	if (value.opponentAccount !== undefined) {
		if (typeof value.opponentAccount !== 'string' || !isValidAvailabilityHiveUsername(normalizeHiveUsername(value.opponentAccount))) return null;
	}
	if (value.hiveSig !== undefined && !isSafeText(value.hiveSig, 1024)) return null;
	return {
		protocol: MATCH_ACCEPTANCE_PROTOCOL,
		offerId,
		matchId,
		...(typeof value.account === 'string' ? { account: normalizeHiveUsername(value.account) } : {}),
		peerId,
		...(typeof value.opponentAccount === 'string' ? { opponentAccount: normalizeHiveUsername(value.opponentAccount) } : {}),
		opponentPeerId,
		ephemeralPubkey,
		rulesetHash,
		engineHash,
		serverNonce,
		expiresAt,
		...(typeof value.hiveSig === 'string' ? { hiveSig: value.hiveSig } : {}),
	};
}

export function isCurrentMatchOffer(offer: MatchOffer, now = Date.now()): boolean {
	return offer.createdAt <= now && offer.expiresAt > now;
}

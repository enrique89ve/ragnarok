import { isSafePeerId, isValidAvailabilityHiveUsername, normalizeHiveUsername } from './p2pAvailability';
import { canonicalStringify } from './protocol-core/hash';

export const MATCHMAKING_DELEGATION_PROTOCOL = 'ragnarok-matchmaking-delegation-v1' as const;
export const MATCHMAKING_DELEGATION_TTL_MS = 10 * 60 * 1000;

export type MatchmakingDelegationChallenge = {
	readonly protocol: typeof MATCHMAKING_DELEGATION_PROTOCOL;
	readonly delegationId: string;
	readonly account: string;
	readonly peerId: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
	readonly serverNonce: string;
	readonly issuedAt: number;
	readonly expiresAt: number;
};

export type MatchmakingDelegationV1 = {
	readonly protocol: typeof MATCHMAKING_DELEGATION_PROTOCOL;
	readonly delegationId: string;
	readonly account: string;
	readonly peerId: string;
	readonly ephemeralPubkey: string;
	readonly rulesetHash: string;
	readonly engineHash: string;
	readonly serverNonce: string;
	readonly issuedAt: number;
	readonly expiresAt: number;
};

export type MatchmakingDelegationProof = MatchmakingDelegationV1 & {
	readonly hiveSig: string;
};

export function buildMatchmakingDelegationMessage(delegation: MatchmakingDelegationV1): string {
	return `${MATCHMAKING_DELEGATION_PROTOCOL} | ${canonicalStringify(delegation)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeText(value: unknown, maxLength: number): value is string {
	return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

export function readMatchmakingDelegationProof(value: unknown): MatchmakingDelegationProof | null {
	if (!isRecord(value)) return null;
	const allowed = new Set([
		'protocol', 'delegationId', 'account', 'peerId', 'ephemeralPubkey',
		'rulesetHash', 'engineHash', 'serverNonce', 'issuedAt', 'expiresAt', 'hiveSig',
	]);
	if (Object.keys(value).some(key => !allowed.has(key))) return null;
	if (value.protocol !== MATCHMAKING_DELEGATION_PROTOCOL) return null;
	if (!isSafeText(value.delegationId, 128) || !isSafeText(value.account, 32)) return null;
	const account = normalizeHiveUsername(value.account);
	if (!isValidAvailabilityHiveUsername(account)) return null;
	if (!isSafeText(value.peerId, 64) || !isSafePeerId(value.peerId)) return null;
	if (!isSafeText(value.ephemeralPubkey, 256)) return null;
	if (!isSafeText(value.rulesetHash, 256) || !isSafeText(value.engineHash, 256)) return null;
	if (!isSafeText(value.serverNonce, 128) || value.serverNonce.length < 16) return null;
	if (typeof value.issuedAt !== 'number' || !Number.isSafeInteger(value.issuedAt) || value.issuedAt <= 0) return null;
	if (typeof value.expiresAt !== 'number' || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= value.issuedAt) return null;
	if (!isSafeText(value.hiveSig, 1024)) return null;
	return {
		protocol: MATCHMAKING_DELEGATION_PROTOCOL,
		delegationId: value.delegationId,
		account,
		peerId: value.peerId,
		ephemeralPubkey: value.ephemeralPubkey,
		rulesetHash: value.rulesetHash,
		engineHash: value.engineHash,
		serverNonce: value.serverNonce,
		issuedAt: value.issuedAt,
		expiresAt: value.expiresAt,
		hiveSig: value.hiveSig,
	};
}

export function readMatchmakingDelegationChallenge(value: unknown): MatchmakingDelegationChallenge | null {
	if (!isRecord(value)) return null;
	// Reuse the strict proof parser with placeholders for fields that are added
	// by the client after receiving the challenge (ephemeral key + Hive sig).
	const proof = readMatchmakingDelegationProof({
		...value,
		ephemeralPubkey: 'challenge-placeholder',
		hiveSig: 'challenge-placeholder',
	});
	if (!proof) return null;
	return {
		protocol: proof.protocol,
		delegationId: proof.delegationId,
		account: proof.account,
		peerId: proof.peerId,
		rulesetHash: proof.rulesetHash,
		engineHash: proof.engineHash,
		serverNonce: proof.serverNonce,
		issuedAt: proof.issuedAt,
		expiresAt: proof.expiresAt,
	};
}

export function isCurrentMatchmakingDelegation(delegation: MatchmakingDelegationV1, now = Date.now()): boolean {
	return delegation.issuedAt <= now && delegation.expiresAt > now;
}

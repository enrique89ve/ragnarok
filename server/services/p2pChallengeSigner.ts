import { createHmac, randomBytes } from 'crypto';
import {
	CHALLENGE_SIGNATURE_ALGORITHM,
	type ServerSignedChallenge,
} from '../../shared/p2pAvailability';
import { canonicalStringify } from '../../shared/protocol-core/hash';

type ChallengeSignPayload = {
	readonly v: 1;
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
	readonly timestamp: number;
	readonly expiresAt: number;
	readonly nonce: string;
	readonly sigAlg: typeof CHALLENGE_SIGNATURE_ALGORITHM;
};

export type P2PChallengeSigningSecretStatus = {
	readonly configured: boolean;
	readonly validLength: boolean;
	readonly source: 'env' | 'process-fallback';
	readonly minimumLength: number;
	readonly required: boolean;
	readonly ready: boolean;
	readonly error: string | null;
};

const P2P_CHALLENGE_SIGNING_SECRET_MIN_LENGTH = 32;
let fallbackSigningSecret: string | null = null;

function getConfiguredSigningSecret(): string | undefined {
	const configured = process.env.P2P_CHALLENGE_SIGNING_SECRET?.trim();
	return configured && configured.length > 0 ? configured : undefined;
}

function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === 'production';
}

export function getP2PChallengeSigningSecretStatus(): P2PChallengeSigningSecretStatus {
	const configured = getConfiguredSigningSecret();
	const validLength = configured !== undefined && configured.length >= P2P_CHALLENGE_SIGNING_SECRET_MIN_LENGTH;
	const required = isProductionRuntime();
	const ready = validLength || !required;
	return {
		configured: configured !== undefined,
		validLength,
		source: validLength ? 'env' : 'process-fallback',
		minimumLength: P2P_CHALLENGE_SIGNING_SECRET_MIN_LENGTH,
		required,
		ready,
		error: ready
			? null
			: `P2P_CHALLENGE_SIGNING_SECRET must be at least ${P2P_CHALLENGE_SIGNING_SECRET_MIN_LENGTH} characters in production.`,
	};
}

function getSigningSecret(): string {
	const configured = getConfiguredSigningSecret();
	if (configured && configured.length >= P2P_CHALLENGE_SIGNING_SECRET_MIN_LENGTH) return configured;
	if (isProductionRuntime()) {
		throw new Error(
			`P2P challenge signing unavailable: P2P_CHALLENGE_SIGNING_SECRET must be at least ${P2P_CHALLENGE_SIGNING_SECRET_MIN_LENGTH} characters in production`,
		);
	}
	fallbackSigningSecret ??= randomBytes(32).toString('hex');
	return fallbackSigningSecret;
}

function toSignPayload(input: {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
	readonly timestamp: number;
	readonly expiresAt: number;
	readonly nonce: string;
}): ChallengeSignPayload {
	return {
		v: 1,
		from: input.from,
		to: input.to,
		peerId: input.peerId,
		timestamp: input.timestamp,
		expiresAt: input.expiresAt,
		nonce: input.nonce,
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
	};
}

function signPayload(payload: ChallengeSignPayload): string {
	return createHmac('sha256', getSigningSecret())
		.update(canonicalStringify(payload), 'utf8')
		.digest('hex');
}

export function buildServerSignedChallenge(input: {
	readonly from: string;
	readonly to: string;
	readonly peerId: string;
	readonly timestamp: number;
	readonly expiresAt: number;
}): ServerSignedChallenge {
	const nonce = randomBytes(18).toString('base64url');
	const payload = toSignPayload({ ...input, nonce });
	return {
		from: input.from,
		to: input.to,
		peerId: input.peerId,
		timestamp: input.timestamp,
		expiresAt: input.expiresAt,
		nonce,
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: signPayload(payload),
	};
}

export function verifyServerSignedChallengeForTarget(
	challenge: ServerSignedChallenge,
	to: string,
): boolean {
	const expected = signPayload(toSignPayload({
		from: challenge.from,
		to,
		peerId: challenge.peerId,
		timestamp: challenge.timestamp,
		expiresAt: challenge.expiresAt,
		nonce: challenge.nonce,
	}));
	return expected === challenge.serverSig;
}

export function resetP2PChallengeSigningSecretForTests(): void {
	fallbackSigningSecret = null;
}

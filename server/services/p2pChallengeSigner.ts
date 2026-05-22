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

let fallbackSigningSecret: string | null = null;

function getSigningSecret(): string {
	const configured = process.env.P2P_CHALLENGE_SIGNING_SECRET;
	if (configured && configured.length >= 32) return configured;
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

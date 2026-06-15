import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const QUEUE_TOKEN_HASH_RE = /^[a-f0-9]{64}$/;

export function createP2PQueueToken(): string {
	return randomBytes(32).toString('base64url');
}

export function hashP2PQueueToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isP2PQueueTokenHash(value: unknown): value is string {
	return typeof value === 'string' && QUEUE_TOKEN_HASH_RE.test(value);
}

export function p2pQueueTokenMatches(expectedHash: string, token: string | null | undefined): boolean {
	if (!token || !isP2PQueueTokenHash(expectedHash)) return false;
	const actualHash = hashP2PQueueToken(token);
	if (!isP2PQueueTokenHash(actualHash)) return false;
	const expected = Buffer.from(expectedHash, 'hex');
	const actual = Buffer.from(actualHash, 'hex');
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

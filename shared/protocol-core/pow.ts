/**
 * Ragnarok Protocol Core — Proof of Work Verification
 *
 * Pure verification only (no solving). Isomorphic.
 * Matches proofOfWork.ts verification logic exactly.
 */

import { sha256Hash } from './hash';

export interface PoWConfig {
	count: number;
	difficulty: number;
}

export interface PoWResult {
	nonces: number[];
}

export const POW_CONFIG = {
	QUEUE_JOIN:   { count: 32, difficulty: 4 } as PoWConfig,
	MATCH_START:  { count: 32, difficulty: 4 } as PoWConfig,
	MATCH_RESULT: { count: 64, difficulty: 6 } as PoWConfig,
};

export async function deriveChallenge(payloadHash: string, index: number): Promise<string> {
	return sha256Hash(`${payloadHash}:${index}`);
}

function hasLeadingZeroBits(hexHash: string, bits: number): boolean {
	const fullNibbles = Math.floor(bits / 4);
	for (let i = 0; i < fullNibbles; i++) {
		if (hexHash[i] !== '0') return false;
	}
	const remainder = bits % 4;
	if (remainder > 0) {
		const nibble = parseInt(hexHash[fullNibbles], 16);
		if ((nibble >> (4 - remainder)) !== 0) return false;
	}
	return true;
}

export async function verifyPoW(
	payloadHash: string,
	result: PoWResult,
	config: PoWConfig,
): Promise<boolean> {
	if (result.nonces.length !== config.count) return false;

	for (let i = 0; i < config.count; i++) {
		const challenge = await deriveChallenge(payloadHash, i);
		const hash = await sha256Hash(`${challenge}:${result.nonces[i]}`);
		if (!hasLeadingZeroBits(hash, config.difficulty)) return false;
	}

	return true;
}

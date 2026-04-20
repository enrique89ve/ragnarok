/**
 * proofOfWork.ts - Multi-challenge Hashcash PoW (serverless)
 *
 * Implements the multi-challenge proof-of-work scheme from HIVE_BLOCKCHAIN_BLUEPRINT.md.
 *
 * Key design:
 *   - Sub-challenges derived deterministically from payload hash — no server needed.
 *   - Each sub-challenge is independent → parallelizable via Web Workers (future).
 *   - Law of large numbers gives predictable total solve time despite exponential dist.
 *
 * Difficulty tiers (from blueprint):
 *   queue_join / match_start : 32 challenges × 4-bit difficulty  (~0.5s on avg device)
 *   match_result             : 64 challenges × 6-bit difficulty  (~1s on avg device)
 *
 * Usage:
 *   const result = await computePoW(payloadHash, POW_CONFIG.QUEUE_JOIN);
 *   const ok     = await verifyPoW(payloadHash, result, POW_CONFIG.QUEUE_JOIN);
 */

import { sha256Hash } from './hashUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PoWConfig {
	count: number;      // number of independent sub-challenges
	difficulty: number; // required leading zero BITS per sub-challenge
}

export interface PoWResult {
	nonces: number[];   // one nonce per sub-challenge
}

// ---------------------------------------------------------------------------
// Difficulty presets (from blueprint)
// ---------------------------------------------------------------------------

export const POW_CONFIG = {
	QUEUE_JOIN:   { count: 32, difficulty: 4 } satisfies PoWConfig,
	MATCH_START:  { count: 32, difficulty: 4 } satisfies PoWConfig,
	MATCH_RESULT: { count: 64, difficulty: 6 } satisfies PoWConfig,
} as const;

// ---------------------------------------------------------------------------
// Challenge derivation — deterministic, no server needed
// ---------------------------------------------------------------------------

/**
 * Derive the i-th sub-challenge from the payload hash.
 * challenge_i = SHA256(payloadHash + ":" + i)
 */
export async function deriveChallenge(payloadHash: string, index: number): Promise<string> {
	return sha256Hash(`${payloadHash}:${index}`);
}

// ---------------------------------------------------------------------------
// Leading-zero bit check
// ---------------------------------------------------------------------------

function hasLeadingZeroBits(hexHash: string, bits: number): boolean {
	// Each hex character = 4 bits
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

// ---------------------------------------------------------------------------
// Solve a single sub-challenge
// ---------------------------------------------------------------------------

async function solveSingleChallenge(challenge: string, difficulty: number): Promise<number> {
	let nonce = 0;
	while (true) {
		const hash = await sha256Hash(`${challenge}:${nonce}`);
		if (hasLeadingZeroBits(hash, difficulty)) return nonce;
		nonce++;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const WORKER_COUNT = Math.min(navigator?.hardwareConcurrency ?? 4, 4);

function computePoWWithWorkers(payloadHash: string, config: PoWConfig): Promise<PoWResult> {
	return new Promise((resolve, reject) => {
		const allNonces = new Array<number>(config.count);
		let completedChunks = 0;
		const chunkSize = Math.ceil(config.count / WORKER_COUNT);
		const workers: Worker[] = [];

		for (let w = 0; w < WORKER_COUNT; w++) {
			const startIndex = w * chunkSize;
			const endIndex = Math.min(startIndex + chunkSize, config.count);
			if (startIndex >= config.count) break;

			const worker = new Worker(
				new URL('./powWorker.ts', import.meta.url),
				{ type: 'module' },
			);
			workers.push(worker);

			worker.onmessage = (e: MessageEvent<{ startIndex: number; nonces: number[] }>) => {
				const { startIndex: si, nonces } = e.data;
				for (let i = 0; i < nonces.length; i++) {
					allNonces[si + i] = nonces[i];
				}
				completedChunks++;
				worker.terminate();
				if (completedChunks === workers.length) {
					resolve({ nonces: allNonces });
				}
			};

			worker.onerror = (err) => {
				workers.forEach(w2 => w2.terminate());
				reject(err);
			};

			worker.postMessage({ payloadHash, startIndex, endIndex, difficulty: config.difficulty });
		}
	});
}

async function computePoWSerial(payloadHash: string, config: PoWConfig): Promise<PoWResult> {
	const nonces: number[] = [];
	for (let i = 0; i < config.count; i++) {
		const challenge = await deriveChallenge(payloadHash, i);
		const nonce = await solveSingleChallenge(challenge, config.difficulty);
		nonces.push(nonce);
	}
	return { nonces };
}

export async function computePoW(payloadHash: string, config: PoWConfig): Promise<PoWResult> {
	if (typeof Worker !== 'undefined') {
		try {
			return await computePoWWithWorkers(payloadHash, config);
		} catch {
			return computePoWSerial(payloadHash, config);
		}
	}
	return computePoWSerial(payloadHash, config);
}

/**
 * Verify a PoW result against a payload hash.
 * Pure function — no side effects.
 */
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

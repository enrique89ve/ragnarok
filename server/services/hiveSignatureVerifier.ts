/**
 * hiveSignatureVerifier.ts — Server-side Hive signature verification
 *
 * Implements the protocol-core SignatureVerifier interface with real
 * hive-tx signature recovery. Verifies against:
 * - Anchored pubkeys (from match_anchor payload) — canonical v1 path
 * - Current chain posting/active keys — legacy pre-seal path only
 *
 * Uses hive-tx PublicKey/Signature for ECDSA recovery over SHA-256 message hashes.
 */

import type { SignatureVerifier } from '../../shared/protocol-core/types';
import { createHash } from 'crypto';

// hive-tx is ESM; we dynamic-import to avoid CJS/ESM issues in Node
let _hiveTx: { PublicKey: typeof import('hive-tx').PublicKey; Signature: typeof import('hive-tx').Signature } | null = null;

async function getHiveTx() {
	if (!_hiveTx) {
		const mod = await import('hive-tx');
		_hiveTx = { PublicKey: mod.PublicKey, Signature: mod.Signature };
	}
	return _hiveTx;
}

// ---------------------------------------------------------------------------
// Hive RPC for key lookup (current-key path)
// ---------------------------------------------------------------------------

const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
];
const FETCH_TIMEOUT_MS = 8000;
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;

interface HiveAccountKeys {
	posting: string[];
	active: string[];
}

const keyCache = new Map<string, { keys: HiveAccountKeys; fetchedAt: number }>();

async function fetchAccountKeys(username: string): Promise<HiveAccountKeys> {
	const cached = keyCache.get(username);
	if (cached && Date.now() - cached.fetchedAt < KEY_CACHE_TTL_MS) {
		return cached.keys;
	}

	let lastError: Error = new Error('No Hive nodes available');
	for (const node of HIVE_NODES) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'condenser_api.get_accounts',
					params: [[username]],
					id: 1,
				}),
				signal: controller.signal,
			});
			const data = await res.json() as { result?: Array<{ posting: { key_auths: [string, number][] }; active: { key_auths: [string, number][] } }> };
			const account = data.result?.[0];
			if (!account) throw new Error(`Account ${username} not found`);

			const keys: HiveAccountKeys = {
				posting: account.posting.key_auths.map(([k]) => k),
				active: account.active.key_auths.map(([k]) => k),
			};
			keyCache.set(username, { keys, fetchedAt: Date.now() });
			return keys;
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		} finally {
			clearTimeout(timer);
		}
	}
	throw lastError;
}

// ---------------------------------------------------------------------------
// Core signature recovery
// ---------------------------------------------------------------------------

async function recoverPublicKey(message: string, signatureHex: string): Promise<string | null> {
	try {
		const { Signature } = await getHiveTx();
		const sig = Signature.from(signatureHex);
		const hashHex = createHash('sha256').update(message, 'utf8').digest('hex');
		const recoveredKey = sig.getPublicKey(hashHex);
		return recoveredKey.toString();
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// SignatureVerifier implementation
// ---------------------------------------------------------------------------

export const serverSignatureVerifier: SignatureVerifier = {
	/**
	 * Verify against an anchored public key (canonical v1 path).
	 * No RPC call needed — the key is in the match_anchor payload.
	 */
	async verifyAnchored(pubkey: string, message: string, signatureHex: string): Promise<boolean> {
		if (!signatureHex || signatureHex.length < 10) return false;
		const recovered = await recoverPublicKey(message, signatureHex);
		if (!recovered) return false;
		return recovered === pubkey;
	},

	/**
	 * Verify against current chain posting/active keys (legacy pre-seal path).
	 * Requires RPC call to fetch current account authorities.
	 */
	async verifyCurrentKey(account: string, message: string, signatureHex: string): Promise<boolean> {
		if (!signatureHex || signatureHex.length < 10) return false;
		try {
			const recovered = await recoverPublicKey(message, signatureHex);
			if (!recovered) return false;
			const keys = await fetchAccountKeys(account);
			return keys.posting.includes(recovered) || keys.active.includes(recovered);
		} catch {
			return false;
		}
	},
};

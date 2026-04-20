import { createHash } from 'crypto';

const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
];
const FETCH_TIMEOUT_MS = 8000;
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;
const HIVE_USERNAME_RE = /^[a-z][a-z0-9.-]{2,15}$/;
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

interface CachedKeys {
	posting: string[];
	fetchedAt: number;
}

const keyCache = new Map<string, CachedKeys>();

export function isValidHiveUsername(username: string): boolean {
	return HIVE_USERNAME_RE.test(username);
}

async function fetchPostingKeys(username: string): Promise<string[]> {
	const cached = keyCache.get(username);
	if (cached && Date.now() - cached.fetchedAt < KEY_CACHE_TTL_MS) {
		return cached.posting;
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
			const data = await res.json() as any;
			const account = data.result?.[0];
			if (!account) throw new Error(`Account ${username} not found on Hive`);

			const posting: string[] = account.posting.key_auths.map(([k]: [string, number]) => k);
			keyCache.set(username, { posting, fetchedAt: Date.now() });
			clearTimeout(timer);
			return posting;
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		} finally {
			clearTimeout(timer);
		}
	}
	throw lastError;
}

export type AuthErrorKind = 'invalid_input' | 'invalid_signature' | 'network_error' | 'malformed_data';

export interface AuthResult {
	valid: boolean;
	error?: AuthErrorKind;
}

export async function verifyHiveAuth(
	username: string,
	message: string,
	signatureHex: string,
): Promise<AuthResult> {
	if (!username || !signatureHex || signatureHex.length < 10) {
		return { valid: false, error: 'invalid_input' };
	}
	if (!isValidHiveUsername(username)) {
		return { valid: false, error: 'invalid_input' };
	}

	let postingKeys: string[];
	try {
		postingKeys = await fetchPostingKeys(username);
	} catch (err) {
		console.error(`[hiveAuth] network error fetching keys for ${username}:`, err);
		return { valid: false, error: 'network_error' };
	}

	try {
		const { Signature } = await import('hive-tx');
		const hashHex = createHash('sha256').update(message).digest('hex');
		const sig = Signature.from(signatureHex);
		const recoveredKey = sig.getPublicKey(hashHex);
		const recoveredKeyStr = recoveredKey.toString();

		if (postingKeys.includes(recoveredKeyStr)) {
			return { valid: true };
		}
		return { valid: false, error: 'invalid_signature' };
	} catch (err) {
		console.error(`[hiveAuth] malformed signature data for ${username}:`, err);
		return { valid: false, error: 'malformed_data' };
	}
}

export function isTimestampFresh(timestamp: number): boolean {
	const drift = Math.abs(Date.now() - timestamp);
	return drift < MAX_TIMESTAMP_DRIFT_MS;
}

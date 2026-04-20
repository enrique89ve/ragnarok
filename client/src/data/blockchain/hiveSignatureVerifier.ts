import { PublicKey, Signature } from 'hive-tx';
import { HIVE_NODES } from './hiveConfig';
const FETCH_TIMEOUT_MS = 8000;
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;

interface HiveAccountKeys {
	posting: string[];
	active: string[];
}

const keyCache = new Map<string, { keys: HiveAccountKeys; fetchedAt: number }>();

export async function fetchAccountKeys(username: string): Promise<HiveAccountKeys> {
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
			const data = await res.json();
			const account = data.result?.[0];
			if (!account) throw new Error(`Account ${username} not found`);

			const keys: HiveAccountKeys = {
				posting: account.posting.key_auths.map(([k]: [string, number]) => k),
				active: account.active.key_auths.map(([k]: [string, number]) => k),
			};
			keyCache.set(username, { keys, fetchedAt: Date.now() });
			clearTimeout(timer);
			return keys;
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		} finally {
			clearTimeout(timer);
		}
	}
	throw lastError;
}

export async function verifyHiveSignature(
	username: string,
	message: string,
	signatureHex: string,
): Promise<boolean> {
	if (!signatureHex || signatureHex.length < 10) return false;

	try {
		const keys = await fetchAccountKeys(username);
		const sig = Signature.from(signatureHex);

		const encoder = new TextEncoder();
		const msgBytes = encoder.encode(message);
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBytes);
		const hashHex = Array.from(new Uint8Array(hashBuffer))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		const recoveredKey = sig.getPublicKey(hashHex);
		const recoveredKeyStr = recoveredKey.toString();

		return keys.posting.includes(recoveredKeyStr);
	} catch {
		return false;
	}
}

export function clearKeyCache(): void {
	keyCache.clear();
}

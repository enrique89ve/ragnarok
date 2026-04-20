/**
 * Ragnarok Protocol Core — Canonical Hashing
 *
 * Uses Web Crypto, which is available in modern browsers and Node 20+.
 * Matches the spec's canonical serialization rules exactly.
 */

function sortKeys(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(sortKeys);
	if (typeof obj === 'object') {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
			sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return obj;
}

export function canonicalStringify(obj: unknown): string {
	return JSON.stringify(sortKeys(obj));
}

export async function sha256Hash(data: string): Promise<string> {
	if (typeof globalThis.crypto?.subtle?.digest !== 'function') {
		throw new Error('Web Crypto SHA-256 is unavailable in this environment.');
	}

	const encoder = new TextEncoder();
	const buffer = encoder.encode(data);
	const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

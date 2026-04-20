import type { PackagedMatchResult, NFTMetadata } from './types';

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
	const encoder = new TextEncoder();
	const buffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashMatchResult(
	result: Omit<PackagedMatchResult, 'hash'>
): Promise<string> {
	const canonical = canonicalStringify(result);
	return sha256Hash(canonical);
}

export async function hashNFTMetadata(
	metadata: Omit<NFTMetadata, 'hash'>
): Promise<string> {
	const canonical = canonicalStringify(metadata);
	return sha256Hash(canonical);
}

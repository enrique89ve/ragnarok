import { createRuntimeStorageKey } from '../game/config/networkConfig';

const CHUNK_RELOAD_KEY = createRuntimeStorageKey('chunk-reload');

/**
 * One-shot HTTP cache-bust after a stale-chunk failure.
 * Not a match session, not state sync, not resume. HashRouter never reads it.
 */
export const CHUNK_CACHE_BUST_QUERY = 'ragnarokReload';

type ChunkRecoveryStatus = 'started' | 'already-attempted';

function readChunkReloadFlag(): boolean {
	try {
		return window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
	} catch {
		return false;
	}
}

function writeChunkReloadFlag(): void {
	try {
		window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
	} catch {
		// Session storage can be unavailable in hardened browser contexts.
	}
}

export function clearChunkReloadFlag(): void {
	try {
		window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
	} catch {
		// Session storage can be unavailable in hardened browser contexts.
	}
}

export function isChunkLoadError(reason: unknown): boolean {
	const message = reason instanceof Error
		? reason.message
		: typeof reason === 'string'
			? reason
			: String(reason ?? '');

	return message.includes('Failed to fetch dynamically imported module')
		|| message.includes('Importing a module script failed')
		|| message.includes('error loading dynamically imported module')
		|| message.includes('dynamically imported module');
}

async function deleteRagnarokCaches(): Promise<void> {
	if (!('caches' in window)) return;

	const cacheNames = await window.caches.keys();
	await Promise.all(
		cacheNames
			.filter((cacheName) => cacheName.startsWith('ragnarok-'))
			.map((cacheName) => window.caches.delete(cacheName)),
	);
}

export function hrefWithoutChunkCacheBust(href: string): string | null {
	const url = new URL(href, 'http://localhost');
	if (!url.searchParams.has(CHUNK_CACHE_BUST_QUERY)) return null;
	url.searchParams.delete(CHUNK_CACHE_BUST_QUERY);
	return `${url.pathname}${url.search}${url.hash}`;
}

export function stripChunkCacheBustQuery(): void {
	try {
		const next = hrefWithoutChunkCacheBust(window.location.href);
		if (next === null) return;
		window.history.replaceState(window.history.state, '', next);
	} catch {
		// History can be unavailable in hardened or non-browser contexts.
	}
}

function reloadWithCacheBust(): void {
	const nextUrl = new URL(window.location.href);
	nextUrl.searchParams.set(CHUNK_CACHE_BUST_QUERY, String(Date.now()));
	window.location.replace(nextUrl.toString());
}

export async function recoverFromChunkLoadError(): Promise<ChunkRecoveryStatus> {
	if (readChunkReloadFlag()) return 'already-attempted';

	writeChunkReloadFlag();

	try {
		await deleteRagnarokCaches();
		if ('serviceWorker' in navigator) {
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
		}
	} catch {
		// Reload is still the correct recovery path if cleanup fails.
	}

	reloadWithCacheBust();
	return 'started';
}

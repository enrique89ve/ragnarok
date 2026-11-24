import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type ServiceWorkerContext = {
	readonly URL: typeof URL;
	readonly self: {
		readonly location: { readonly href: string };
		readonly addEventListener: () => void;
		__cacheName?: string;
	};
};

function readServiceWorkerCacheName(serviceWorkerUrl: string): string {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const context: ServiceWorkerContext = {
		URL,
		self: {
			location: { href: serviceWorkerUrl },
			addEventListener: () => undefined,
		},
	};

	vm.runInNewContext(`${source}\nself.__cacheName = CACHE_NAME;`, context);

	if (!context.self.__cacheName) {
		throw new Error('Service worker cache name was not initialized.');
	}
	return context.self.__cacheName;
}

function isServiceWorkerImmutableChunk(chunkUrl: string): boolean {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const context: ServiceWorkerContext & { __isImmutableChunk?: boolean } = {
		URL,
		self: {
			location: { href: 'https://example.test/sw.js?resetEpoch=alfa-testnet' },
			addEventListener: () => undefined,
		},
	};

	vm.runInNewContext(`${source}\n__isImmutableChunk = isImmutableChunk(${JSON.stringify(chunkUrl)});`, context);
	return context.__isImmutableChunk === true;
}

function isServiceWorkerRuntimeApiRequest(requestUrl: string): boolean {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const context: ServiceWorkerContext & { __isRuntimeApiRequest?: boolean } = {
		URL,
		self: {
			location: new URL('https://example.test/sw.js?resetEpoch=alfa-testnet'),
			addEventListener: () => undefined,
		},
	};

	vm.runInNewContext(`${source}\n__isRuntimeApiRequest = isRuntimeApiRequest(${JSON.stringify(requestUrl)});`, context);
	return context.__isRuntimeApiRequest === true;
}

function isServiceWorkerVersionedWasmRequest(requestUrl: string): boolean {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const context: ServiceWorkerContext & { __isVersionedWasm?: boolean } = {
		URL,
		self: {
			location: new URL('https://example.test/sw.js?resetEpoch=alfa-testnet'),
			addEventListener: () => undefined,
		},
	};

	vm.runInNewContext(`${source}\n__isVersionedWasm = isVersionedWasmRequest(${JSON.stringify(requestUrl)});`, context);
	return context.__isVersionedWasm === true;
}

function isServiceWorkerNoCacheManifestRequest(requestUrl: string): boolean {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const context: ServiceWorkerContext & { __isNoCacheManifest?: boolean } = {
		URL,
		self: {
			location: new URL('https://example.test/sw.js?resetEpoch=alfa-testnet'),
			addEventListener: () => undefined,
		},
	};

	vm.runInNewContext(`${source}\n__isNoCacheManifest = isNoCacheManifestRequest(${JSON.stringify(requestUrl)});`, context);
	return context.__isNoCacheManifest === true;
}

function isServiceWorkerVersionManifestRequest(requestUrl: string): boolean {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const context: ServiceWorkerContext & { __isVersionManifest?: boolean } = {
		URL,
		self: {
			location: new URL('https://example.test/sw.js?resetEpoch=alfa-testnet'),
			addEventListener: () => undefined,
		},
	};

	vm.runInNewContext(`${source}\n__isVersionManifest = isVersionManifestRequest(${JSON.stringify(requestUrl)});`, context);
	return context.__isVersionManifest === true;
}

type MockRequest = {
	readonly method: string;
	readonly url: string;
	readonly mode?: string;
	readonly cache?: string;
};

async function runServiceWorkerFetch(
	request: MockRequest,
	options?: {
		readonly fetchImpl?: () => Promise<Response>;
		readonly cacheMatch?: () => Promise<Response | undefined>;
	},
): Promise<Response> {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const listeners: Record<string, Array<(event: unknown) => void>> = {};
	let handledResponse: Promise<Response> | undefined;

	const fetchImpl = options?.fetchImpl ?? (() => Promise.reject(new Error('network offline')));
	const cacheMatch = options?.cacheMatch ?? (() => Promise.resolve(undefined));

	const context = {
		URL,
		Response,
		caches: {
			open: async () => ({
				put: async () => undefined,
				addAll: async () => undefined,
			}),
			match: async () => cacheMatch(),
			keys: async () => [] as string[],
			delete: async () => true,
		},
		fetch: fetchImpl,
		self: {
			location: new URL('https://example.test/sw.js?resetEpoch=alfa-testnet'),
			addEventListener: (type: string, handler: (event: unknown) => void) => {
				listeners[type] = listeners[type] ?? [];
				listeners[type].push(handler);
			},
			clients: { claim: async () => undefined },
			skipWaiting: () => undefined,
		},
	};

	vm.runInNewContext(source, context);
	for (const handler of listeners.fetch ?? []) {
		handler({
			request: {
				method: request.method,
				url: request.url,
				mode: request.mode ?? 'cors',
				cache: request.cache ?? 'default',
			},
			respondWith: (response: Promise<Response>) => {
				handledResponse = response;
			},
		});
	}

	if (!handledResponse) {
		throw new Error('Service worker fetch handler did not call respondWith.');
	}
	return handledResponse;
}

function dispatchServiceWorkerMessage(data: unknown): number {
	const source = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
	const listeners: Record<string, Array<(event: unknown) => void>> = {};
	let skipWaitingCalls = 0;

	const context = {
		URL,
		self: {
			location: new URL('https://example.test/sw.js?resetEpoch=alfa-testnet'),
			addEventListener: (type: string, handler: (event: unknown) => void) => {
				listeners[type] = listeners[type] ?? [];
				listeners[type].push(handler);
			},
			skipWaiting: () => {
				skipWaitingCalls += 1;
			},
		},
	};

	vm.runInNewContext(source, context);
	for (const handler of listeners.message ?? []) {
		handler({ data });
	}
	return skipWaitingCalls;
}

describe('service worker reset epoch cache name', () => {
	it('isolates asset caches by reset epoch', () => {
		expect(readServiceWorkerCacheName('https://example.test/sw.js?resetEpoch=QA%20Season%200%20%2F%202026-05')).toBe(
			'ragnarok-assets-v4-qa-season-0-2026-05',
		);
		expect(readServiceWorkerCacheName('https://example.test/sw.js?resetEpoch=Closed%20Beta%20%2F%202026-06')).toBe(
			'ragnarok-assets-v4-closed-beta-2026-06',
		);
	});

	it('recognizes Vite base64url-style chunk hashes as immutable chunks', () => {
		expect(isServiceWorkerImmutableChunk('https://example.test/assets/SettingsPage-DXkvZYh2.js')).toBe(true);
		expect(isServiceWorkerImmutableChunk('https://example.test/assets/index-j87ec-cY.js')).toBe(true);
		expect(isServiceWorkerImmutableChunk('https://example.test/assets/index-CLoi5iuK.css')).toBe(true);
		expect(isServiceWorkerImmutableChunk('https://example.test/assets/not-a-chunk.js')).toBe(false);
	});

	it('identifies runtime API requests that must bypass the cache fallback', () => {
		expect(isServiceWorkerRuntimeApiRequest('https://example.test/api/matchmaking/status/peer-one')).toBe(true);
		expect(isServiceWorkerRuntimeApiRequest('https://example.test/api/health')).toBe(true);
		expect(isServiceWorkerRuntimeApiRequest('https://example.test/assets/index-j87ec-cY.js')).toBe(false);
	});

	it('identifies version.json manifest requests that must bypass cache', () => {
		expect(isServiceWorkerVersionManifestRequest('https://example.test/version.json')).toBe(true);
		expect(isServiceWorkerVersionManifestRequest('https://example.test/version.json?t=123456')).toBe(true);
		expect(isServiceWorkerVersionManifestRequest('https://example.test/manifest.json')).toBe(false);
	});

	it('treats hashed wasm query URLs as versioned and plain engine.wasm as unversioned', () => {
		const wasmHash = 'a'.repeat(64);
		expect(isServiceWorkerVersionedWasmRequest(`https://example.test/engine.wasm?v=${wasmHash}`)).toBe(true);
		expect(isServiceWorkerVersionedWasmRequest('https://example.test/assets/engine-AbCdEfGh12345678.wasm')).toBe(true);
		expect(isServiceWorkerVersionedWasmRequest('https://example.test/engine.wasm')).toBe(false);
		expect(isServiceWorkerVersionedWasmRequest('https://example.test/engine.wasm?v=short')).toBe(false);
	});

	it('bypasses cache for manifest.json alongside version.json', () => {
		expect(isServiceWorkerNoCacheManifestRequest('https://example.test/manifest.json')).toBe(true);
		expect(isServiceWorkerNoCacheManifestRequest('https://example.test/version.json')).toBe(true);
		expect(isServiceWorkerNoCacheManifestRequest('https://example.test/index.html')).toBe(false);
	});

	it('calls self.skipWaiting only when receiving a SKIP_WAITING message', () => {
		expect(dispatchServiceWorkerMessage({ type: 'SKIP_WAITING' })).toBe(1);
		expect(dispatchServiceWorkerMessage({ type: 'OTHER_EVENT' })).toBe(0);
		expect(dispatchServiceWorkerMessage(null)).toBe(0);
	});

	it('bypasses the SW cache when request.cache is no-store', async () => {
		let fetchCalled = false;
		const networkBody = new Uint8Array([0, 97, 115, 109]);
		const response = await runServiceWorkerFetch(
			{
				method: 'GET',
				url: 'https://example.test/engine.wasm?v=' + 'a'.repeat(64),
				cache: 'no-store',
			},
			{
				fetchImpl: async () => {
					fetchCalled = true;
					return new Response(networkBody, { status: 200 });
				},
				cacheMatch: async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
			},
		);

		expect(fetchCalled).toBe(true);
		expect(response.status).toBe(200);
		const bytes = new Uint8Array(await response.arrayBuffer());
		expect(bytes).toEqual(networkBody);
	});

	it('returns a 504 response for unversioned wasm when offline and uncached', async () => {
		const response = await runServiceWorkerFetch(
			{
				method: 'GET',
				url: 'https://example.test/engine.wasm',
			},
			{
				fetchImpl: async () => Promise.reject(new Error('offline')),
				cacheMatch: async () => undefined,
			},
		);

		expect(response.status).toBe(504);
		expect(response.statusText).toBe('Gateway Timeout');
	});
});

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
});

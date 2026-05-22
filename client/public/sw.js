/* eslint-disable no-undef */

function normalizeSegment(value) {
	return String(value || 'default')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'default';
}

function readResetEpoch() {
	try {
		return new URL(self.location.href).searchParams.get('resetEpoch') || 'default';
	} catch (error) {
		return 'default';
	}
}

// Cache shared with assetCacheStore.ts bulk downloader
var CACHE_NAME = 'ragnarok-assets-v3-' + normalizeSegment(readResetEpoch());

var ASSET_DIRS = [
	'/art/', '/portraits/', '/textures/', '/sounds/',
	'/icons/', '/heroes/', '/ui/', '/fonts/',
];

var ASSET_EXTS = [
	'.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg',
	'.mp3', '.ogg', '.wav',
];

// Vite hashed JS/CSS chunks are immutable. Keep old visited chunks in the
// reset-epoch cache so tabs opened before a deploy can still lazy-load routes.
var IMMUTABLE_RE = /\/assets\/[^/]+[-.][A-Za-z0-9_-]{8,}\.(js|css)$/;

function getBase() {
	var swUrl = new URL(self.location);
	return swUrl.pathname.replace(/sw\.js$/, '');
}

function isAssetRequest(url) {
	var parsed = new URL(url);
	var base = getBase();
	var normalized = parsed.pathname.startsWith(base)
		? '/' + parsed.pathname.slice(base.length)
		: parsed.pathname;

	if (ASSET_DIRS.some(function(dir) { return normalized.includes(dir); })) return true;
	if (ASSET_EXTS.some(function(ext) { return normalized.endsWith(ext); })) return true;
	return false;
}

function isImmutableChunk(url) {
	return IMMUTABLE_RE.test(url);
}

function isValidImmutableChunkResponse(requestUrl, response) {
	if (!response || !response.ok) return false;

	var contentType = response.headers.get('content-type') || '';
	if (requestUrl.endsWith('.js')) {
		return contentType.indexOf('javascript') !== -1
			|| contentType.indexOf('ecmascript') !== -1
			|| contentType.indexOf('text/plain') !== -1;
	}

	if (requestUrl.endsWith('.css')) {
		return contentType.indexOf('text/css') !== -1;
	}

	return true;
}

function isViteDevRequest(url) {
	var parsed = new URL(url);
	return parsed.pathname === '/@vite/client'
		|| parsed.pathname === '/@react-refresh'
		|| parsed.pathname.startsWith('/@fs/')
		|| parsed.pathname.startsWith('/src/')
		|| parsed.pathname.includes('/node_modules/.vite/');
}

// Install: pre-cache index.html for offline navigation, then activate immediately
self.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open(CACHE_NAME).then(function(cache) {
			// Cache the shell so offline users can always load the app
			var base = getBase();
			return cache.addAll([
				base,
				base + 'index.html',
			]).catch(function() {
				// Non-fatal: first install might fail if offline (impossible, but safe)
			});
		}).then(function() {
			return self.skipWaiting();
		})
	);
});

// Activate: clean other reset-epoch caches, but keep visited JS/CSS chunks for
// this epoch. Deleting them during a deploy can break still-open tabs whose old
// app bundle requests an old lazy chunk after the new server build is live.
self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(names) {
			return Promise.all(
				names
					.filter(function(name) { return name !== CACHE_NAME; })
					.map(function(name) { return caches.delete(name); })
			);
		}).then(function() {
			return self.clients.claim();
		})
	);
});

self.addEventListener('fetch', function(event) {
	var request = event.request;

	if (request.method !== 'GET') return;

	var url = new URL(request.url);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
	if (url.origin !== self.location.origin) return;

	if (isViteDevRequest(request.url)) return;

	// Navigation: network-first with offline fallback to cached index.html
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).then(function(response) {
				// Cache the latest index.html for offline use
				var clone = response.clone();
				caches.open(CACHE_NAME).then(function(cache) {
					cache.put(request, clone);
				});
				return response;
			}).catch(function() {
				return caches.match(request).then(function(cached) {
					return cached || caches.match(getBase() + 'index.html');
				});
			})
		);
		return;
	}

	// Hashed JS/CSS chunks: cache-first, never revalidate (immutable)
	if (isImmutableChunk(request.url)) {
		event.respondWith(
			caches.match(request).then(function(cached) {
				if (cached) return cached;
				return fetch(request).then(function(response) {
					if (isValidImmutableChunkResponse(request.url, response)) {
						var clone = response.clone();
						caches.open(CACHE_NAME).then(function(cache) {
							cache.put(request, clone);
						});
					}
					return response;
				});
			})
		);
		return;
	}

	// Art/images/audio: cache-first, background revalidate only if online
	// Serves instantly from cache; does NOT fetch in background unless cache miss
	if (isAssetRequest(request.url)) {
		event.respondWith(
			caches.match(request).then(function(cached) {
				if (cached) return cached;
				// Cache miss — fetch from network and cache for next time
				return fetch(request).then(function(response) {
					if (response.ok) {
						var clone = response.clone();
						caches.open(CACHE_NAME).then(function(cache) {
							cache.put(request, clone);
						});
					}
					return response;
				}).catch(function() {
					// Offline + no cache = transparent fail (img onerror handles UI)
					return new Response('', { status: 408, statusText: 'Offline' });
				});
			})
		);
		return;
	}

	// WASM: cache-first (same binary per build)
	if (request.url.endsWith('.wasm')) {
		event.respondWith(
			caches.match(request).then(function(cached) {
				if (cached) return cached;
				return fetch(request).then(function(response) {
					if (response.ok) {
						var clone = response.clone();
						caches.open(CACHE_NAME).then(function(cache) {
							cache.put(request, clone);
						});
					}
					return response;
				});
			})
		);
		return;
	}

	// Everything else: network-first with cache fallback
	event.respondWith(
			fetch(request).then(function(response) {
				if (response.ok) {
					var clone = response.clone();
					caches.open(CACHE_NAME).then(function(cache) {
						cache.put(request, clone);
					});
				}
				return response;
			}).catch(function() {
				return caches.match(request).then(function(cached) {
					return cached || new Response('', { status: 504, statusText: 'Gateway Timeout' });
				});
			})
		);
});

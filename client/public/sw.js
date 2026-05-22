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

// Hashed JS/CSS chunks are immutable — cache forever
var IMMUTABLE_RE = /\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css)$/;

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

// Activate: clean old caches + purge stale JS/CSS chunks, claim clients
self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(names) {
			return Promise.all(
				names
					.filter(function(name) { return name !== CACHE_NAME; })
					.map(function(name) { return caches.delete(name); })
			);
		}).then(function() {
			// Purge stale immutable JS/CSS chunks from current cache
			// New build generates new hashes — old chunks cause 404s
			return caches.open(CACHE_NAME).then(function(cache) {
				return cache.keys().then(function(requests) {
					return Promise.all(
						requests
							.filter(function(req) { return IMMUTABLE_RE.test(req.url); })
							.map(function(req) { return cache.delete(req); })
					);
				});
			});
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

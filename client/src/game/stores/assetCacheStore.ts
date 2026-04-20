import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageKeys } from '../config/storageKeys';

declare const __BUILD_HASH__: string;

interface PackInfo {
	name: string;
	fileCount: number;
	uncompressedSize: number;
	compressedSize: number;
	files: string[];
}

interface PackManifest {
	version: string;
	packs: PackInfo[];
	totalFiles: number;
	totalSize: number;
}

const CACHE_NAME = 'ragnarok-assets-v2';
const BASE = import.meta.env.BASE_URL || '/';
const MAX_RETRIES = 2;
const PARALLEL_PACKS = 2;

function toFullUrl(filePath: string): string {
	const clean = filePath.startsWith('/') ? filePath.slice(1) : filePath;
	return new URL(`${BASE}${clean}`, window.location.origin).href;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getExtMimeType(path: string): string {
	const ext = path.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'webp': return 'image/webp';
		case 'png': return 'image/png';
		case 'jpg': case 'jpeg': return 'image/jpeg';
		case 'gif': return 'image/gif';
		case 'svg': return 'image/svg+xml';
		case 'mp3': return 'audio/mpeg';
		case 'ogg': return 'audio/ogg';
		case 'wav': return 'audio/wav';
		default: return 'application/octet-stream';
	}
}

interface AssetCacheState {
	downloadedVersion: string | null;
	isFullyDownloaded: boolean;
	isDownloading: boolean;
	downloadProgress: number;
	filesDownloaded: number;
	filesTotal: number;
	bytesDownloaded: number;
	bytesTotal: number;
	downloadError: string | null;
}

interface AssetCacheActions {
	startDownload: () => Promise<void>;
	cancelDownload: () => void;
	clearCache: () => Promise<void>;
}

let abortController: AbortController | null = null;

async function fetchWithRetry(url: string, signal: AbortSignal, retries = MAX_RETRIES): Promise<Response> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, { signal });
			if (res.ok) return res;
			if (attempt === retries) throw new Error(`HTTP ${res.status}: ${url.split('/').pop()}`);
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') throw err;
			if (attempt === retries) throw err;
		}
		// Back off before retry
		await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
	}
	throw new Error('Unreachable');
}

async function downloadAndExtractPack(
	pack: PackInfo,
	cache: Cache,
	signal: AbortSignal,
	onBytes: (delta: number) => void,
	onFiles: (delta: number) => void,
) {
	const packUrl = toFullUrl(`packs/${pack.name}`);
	const packRes = await fetchWithRetry(packUrl, signal);

	const reader = packRes.body?.getReader();
	if (!reader) throw new Error('ReadableStream not supported');

	const chunks: Uint8Array[] = [];
	let packBytes = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		packBytes += value.length;
		onBytes(value.length);
	}

	const zipBuffer = new Uint8Array(packBytes);
	let offset = 0;
	for (const chunk of chunks) {
		zipBuffer.set(chunk, offset);
		offset += chunk.length;
	}

	const { unzipSync } = await import('fflate');
	const extracted = unzipSync(zipBuffer);

	// Batch cache puts — process 50 files at a time to avoid locking the main thread
	const entries = Object.entries(extracted);
	const BATCH = 50;
	for (let b = 0; b < entries.length; b += BATCH) {
		const batch = entries.slice(b, b + BATCH);
		await Promise.all(batch.map(([filePath, fileData]) => {
			const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
			const url = toFullUrl(normalizedPath);
			const mimeType = getExtMimeType(normalizedPath);
			const response = new Response(fileData, {
				headers: {
					'Content-Type': mimeType,
					'Content-Length': String(fileData.length),
					'Cache-Control': 'public, max-age=31536000, immutable',
				},
			});
			return cache.put(new Request(url), response);
		}));
		onFiles(batch.length);
	}
}

export const useAssetCacheStore = create<AssetCacheState & AssetCacheActions>()(
	persist(
		(set, get) => ({
			downloadedVersion: null,
			isFullyDownloaded: false,
			isDownloading: false,
			downloadProgress: 0,
			filesDownloaded: 0,
			filesTotal: 0,
			bytesDownloaded: 0,
			bytesTotal: 0,
			downloadError: null,

			startDownload: async () => {
				if (get().isDownloading) return;

				const controller = new AbortController();
				abortController = controller;
				set({
					isDownloading: true,
					downloadError: null,
					downloadProgress: 0,
					filesDownloaded: 0,
					bytesDownloaded: 0,
				});

				try {
					if (navigator.storage?.persist) {
						await navigator.storage.persist();
					}

					if (navigator.storage?.estimate) {
						const { quota = 0, usage = 0 } = await navigator.storage.estimate();
						const available = quota - usage;
						if (available < 300 * 1024 * 1024) {
							set({
								isDownloading: false,
								downloadError: `Not enough storage. Available: ${formatBytes(available)}. Need ~256 MB.`,
							});
							return;
						}
					}

					const manifestUrl = toFullUrl('packs/manifest.json');
					const manifestRes = await fetchWithRetry(manifestUrl, controller.signal);
					const manifest: PackManifest = await manifestRes.json();

					const totalCompressed = manifest.packs.reduce((s, p) => s + p.compressedSize, 0);
					set({
						filesTotal: manifest.totalFiles,
						bytesTotal: totalCompressed,
					});

					const cache = await caches.open(CACHE_NAME);

					let totalBytes = 0;
					let totalFiles = 0;

					const updateProgress = () => {
						const byteRatio = totalCompressed > 0 ? totalBytes / totalCompressed : 0;
						const fileRatio = manifest.totalFiles > 0 ? totalFiles / manifest.totalFiles : 0;
						// Weighted: 70% download progress, 30% extraction progress
						const progress = Math.min(99, Math.round(byteRatio * 70 + fileRatio * 30));
						set({
							bytesDownloaded: totalBytes,
							filesDownloaded: totalFiles,
							downloadProgress: progress,
						});
					};

					// Download packs in parallel (PARALLEL_PACKS at a time)
					const queue = [...manifest.packs];
					const workers: Promise<void>[] = [];

					const processNext = async (): Promise<void> => {
						while (queue.length > 0) {
							if (controller.signal.aborted) return;
							const pack = queue.shift()!;
							await downloadAndExtractPack(
								pack,
								cache,
								controller.signal,
								(delta) => { totalBytes += delta; updateProgress(); },
								(delta) => { totalFiles += delta; updateProgress(); },
							);
						}
					};

					for (let w = 0; w < Math.min(PARALLEL_PACKS, queue.length); w++) {
						workers.push(processNext());
					}
					await Promise.all(workers);

					if (!controller.signal.aborted) {
						// Also cache JS/CSS chunks so the game works fully offline
						try {
							const jsCache = await caches.open(CACHE_NAME);
							const scripts = Array.from(document.querySelectorAll('script[src]'))
								.map(s => (s as HTMLScriptElement).src)
								.filter(s => s.includes('/assets/'));
							const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
								.map(l => (l as HTMLLinkElement).href)
								.filter(s => s.includes('/assets/'));
							const chunks = [...scripts, ...styles];
							await Promise.all(chunks.map(async url => {
								const cached = await jsCache.match(url);
								if (!cached) {
									try {
										const resp = await fetch(url);
										if (resp.ok) await jsCache.put(url, resp);
									} catch { /* non-critical */ }
								}
							}));
						} catch { /* JS/CSS caching is best-effort */ }

						set({
							isDownloading: false,
							isFullyDownloaded: true,
							downloadedVersion: typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : manifest.version,
							downloadProgress: 100,
							filesDownloaded: totalFiles,
						});
					}
				} catch (err: unknown) {
					if (err instanceof Error && err.name === 'AbortError') {
						set({ isDownloading: false, downloadError: null });
					} else {
						set({
							isDownloading: false,
							downloadError: err instanceof Error ? err.message : 'Download failed',
						});
					}
				} finally {
					abortController = null;
				}
			},

			cancelDownload: () => {
				abortController?.abort();
				set({ isDownloading: false, downloadError: null });
			},

			clearCache: async () => {
				await caches.delete(CACHE_NAME);
				set({
					downloadedVersion: null,
					isFullyDownloaded: false,
					isDownloading: false,
					downloadProgress: 0,
					filesDownloaded: 0,
					filesTotal: 0,
					bytesDownloaded: 0,
					bytesTotal: 0,
					downloadError: null,
				});
			},
		}),
		{
			name: StorageKeys.ASSET_CACHE,
			partialize: (state) => ({
				downloadedVersion: state.downloadedVersion,
				isFullyDownloaded: state.isFullyDownloaded,
			}),
		}
	)
);

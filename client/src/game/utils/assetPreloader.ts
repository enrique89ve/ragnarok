import { assetPath } from './assetPath';

const preloaded = new Set<string>();
const preloadQueue: string[] = [];
let isProcessing = false;
const MAX_CONCURRENT = 6;
let active = 0;

function processQueue() {
	if (isProcessing) return;
	isProcessing = true;

	function next() {
		while (active < MAX_CONCURRENT && preloadQueue.length > 0) {
			const url = preloadQueue.shift()!;
			if (preloaded.has(url)) { next(); return; }
			preloaded.add(url);
			active++;
			const img = new Image();
			img.decoding = 'async';
			img.onload = img.onerror = () => {
				active--;
				next();
			};
			img.src = url;
		}
		if (active === 0) isProcessing = false;
	}
	next();
}

export function preloadImages(paths: string[]) {
	for (const p of paths) {
		const url = p.startsWith('/') ? assetPath(p) : p;
		if (!preloaded.has(url)) {
			preloadQueue.push(url);
		}
	}
	if (typeof requestIdleCallback !== 'undefined') {
		requestIdleCallback(() => processQueue());
	} else {
		setTimeout(processQueue, 0);
	}
}

export function preloadImage(path: string) {
	preloadImages([path]);
}

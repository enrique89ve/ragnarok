/**
 * blockRefCache.ts - Hive block reference cache
 *
 * Polls Hive `get_dynamic_global_properties` every 3s during active matches,
 * caching the last 5 block headers. Provides the most recent block ref for
 * embedding in per-move records and match anchors.
 */

import { HIVE_NODES } from './hiveConfig';

interface BlockHeader {
	blockId: string;
	blockNum: number;
	timestamp: number;
	fetchedAt: number;
}

const MAX_CACHE_SIZE = 5;
const POLL_INTERVAL_MS = 3000;

let cache: BlockHeader[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let polling = false;

async function fetchHeadBlock(): Promise<BlockHeader | null> {
	for (const node of HIVE_NODES) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 5000);
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'condenser_api.get_dynamic_global_properties',
					params: [],
					id: 1,
				}),
				signal: controller.signal,
			});
			clearTimeout(timer);
			const data = await res.json() as {
				result?: {
					head_block_id?: string;
					head_block_number?: number;
					time?: string;
				};
			};
			if (data.result?.head_block_id) {
				return {
					blockId: data.result.head_block_id,
					blockNum: data.result.head_block_number || 0,
					timestamp: data.result.time ? new Date(data.result.time + 'Z').getTime() : Date.now(),
					fetchedAt: Date.now(),
				};
			}
		} catch {
			// try next node
		}
	}
	return null;
}

async function pollOnce(): Promise<void> {
	const header = await fetchHeadBlock();
	if (!header) return;

	if (cache.length > 0 && cache[0].blockId === header.blockId) return;

	cache.unshift(header);
	if (cache.length > MAX_CACHE_SIZE) {
		cache = cache.slice(0, MAX_CACHE_SIZE);
	}
}

export function startBlockRefPolling(): void {
	if (polling) return;
	polling = true;
	pollOnce();
	pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
}

export function stopBlockRefPolling(): void {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
	polling = false;
}

export function getLatestBlockRef(): string {
	if (cache.length === 0) return '';
	return cache[0].blockId;
}

export function getLatestBlockNum(): number {
	if (cache.length === 0) return 0;
	return cache[0].blockNum;
}

export function getCachedHeaders(): readonly BlockHeader[] {
	return cache;
}

export function isBlockRefFresh(maxAgeMs: number = 10_000): boolean {
	if (cache.length === 0) return false;
	return (Date.now() - cache[0].fetchedAt) < maxAgeMs;
}

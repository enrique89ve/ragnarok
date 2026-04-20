/**
 * chainIndexer.ts — Server-side Hive chain indexer
 *
 * PR 2B: Block-complete sequential scan via get_ops_in_block.
 * - Replays irreversible blocks from cursor+1 through LIB
 * - Cursor is block-based and only advances AFTER entire block is applied
 * - All protocol semantics live in shared/protocol-core
 * - Block-header lookup for entropy block IDs (pack auto-finalize)
 * - Crash-safe: partial block failure = cursor stays, next restart retries
 */

import {
	normalizeRawOp,
	applyOp,
	type RawHiveOp,
	type ReplayContext,
	type ProtocolCoreDeps,
	type CardDataProvider,
	type RewardProvider,
	type SignatureVerifier,
} from '../../shared/protocol-core';
import { serverStateAdapter } from './serverStateAdapter';
import { serverSignatureVerifier } from './hiveSignatureVerifier';
import {
	registerAccount,
	getBlockCursor, setBlockCursor,
	loadState,
	startPersistence,
	stopPersistence,
	saveState,
} from './chainState';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
];

const NODE_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 10_000;
const BLOCKS_PER_BATCH = 50;

// ---------------------------------------------------------------------------
// Hive RPC
// ---------------------------------------------------------------------------

interface HiveRpcResponse<T> {
	result?: T;
	error?: { message: string };
}

async function callHive<T>(method: string, params: unknown[]): Promise<T> {
	let lastError: Error = new Error('No Hive nodes configured');

	for (const node of HIVE_NODES) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), NODE_TIMEOUT_MS);

		try {
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
				signal: controller.signal,
			});

			const data = (await res.json()) as HiveRpcResponse<T>;
			if (data.result !== undefined) return data.result;
			if (data.error) throw new Error(data.error.message);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		} finally {
			clearTimeout(timer);
		}
	}

	throw lastError;
}

// ---------------------------------------------------------------------------
// Block-level APIs
// ---------------------------------------------------------------------------

interface BlockOp {
	trx_id: string;
	block: number;
	trx_in_block: number;
	op_in_trx: number;
	timestamp: string;
	op: [string, Record<string, unknown>];
}

async function getOpsInBlock(blockNum: number): Promise<BlockOp[]> {
	return callHive<BlockOp[]>('condenser_api.get_ops_in_block', [blockNum, false]);
}

async function getLastIrreversibleBlock(): Promise<number> {
	const props = await callHive<{ last_irreversible_block_num: number }>(
		'condenser_api.get_dynamic_global_properties', [],
	);
	return props.last_irreversible_block_num;
}

// Block ID lookup for pack entropy (uses get_block, not get_block_header,
// because get_block returns block_id while get_block_header does not in all Hive APIs)
const blockIdCache = new Map<number, string>();

async function getBlockId(blockNum: number): Promise<string | null> {
	const cached = blockIdCache.get(blockNum);
	if (cached) return cached;

	try {
		const block = await callHive<{ block_id: string } | null>(
			'condenser_api.get_block', [blockNum],
		);
		const id = block?.block_id ?? null;
		if (id) {
			blockIdCache.set(blockNum, id);
			// Keep cache bounded
			if (blockIdCache.size > 1000) {
				const oldest = blockIdCache.keys().next().value;
				if (oldest !== undefined) blockIdCache.delete(oldest);
			}
		}
		return id;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Protocol-core dependencies
// ---------------------------------------------------------------------------

const serverCardData: CardDataProvider = {
	getCardById(id: number) {
		if (id >= 1000 && id <= 99999) {
			return { name: `Card${id}`, type: 'minion', rarity: 'common', collectible: true };
		}
		return null;
	},
	getCollectibleIdsInRanges(ranges: [number, number][]) {
		const ids: number[] = [];
		for (const [lo, hi] of ranges) {
			for (let i = lo; i <= Math.min(hi, lo + 5000); i++) ids.push(i);
		}
		return ids;
	},
};

const serverRewards: RewardProvider = {
	getRewardById() { return null; },
};

function buildDeps(): ProtocolCoreDeps {
	return {
		state: serverStateAdapter,
		cards: serverCardData,
		rewards: serverRewards,
		sigs: serverSignatureVerifier,
	};
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _isSyncing = false;

// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------

async function scanBlocks(): Promise<number> {
	const cursor = getBlockCursor();
	let lib: number;

	try {
		lib = await getLastIrreversibleBlock();
	} catch (err) {
		console.warn('[chainIndexer] Failed to get LIB:', err instanceof Error ? err.message : err);
		return 0;
	}

	if (cursor >= lib) return 0; // fully caught up

	const startBlock = cursor + 1;
	const endBlock = Math.min(startBlock + BLOCKS_PER_BATCH - 1, lib);

	const ctx: ReplayContext = { lastIrreversibleBlock: lib, getBlockId };
	const deps = buildDeps();
	let totalApplied = 0;

	for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
		let ops: BlockOp[];
		try {
			ops = await getOpsInBlock(blockNum);
		} catch (err) {
			// RPC failure mid-batch: stop here, cursor stays at last completed block
			console.warn(`[chainIndexer] Failed to fetch block ${blockNum}:`, err instanceof Error ? err.message : err);
			break;
		}

		let blockApplied = 0;

		// Process all protocol ops in this block, in order
		for (const op of ops) {
			if (op.op[0] !== 'custom_json') continue;

			const opData = op.op[1] as {
				required_auths?: string[];
				required_posting_auths?: string[];
				id?: string;
				json?: string;
			};

			// Quick pre-filter
			const opId = opData.id ?? '';
			if (!opId.startsWith('rp_') && opId !== 'ragnarok-cards' && opId !== 'ragnarok_level_up') continue;

			const broadcaster = opData.required_posting_auths?.[0] ?? opData.required_auths?.[0] ?? '';
			if (!broadcaster) continue;

			const rawOp: RawHiveOp = {
				customJsonId: opId,
				json: opData.json ?? '{}',
				broadcaster,
				trxId: op.trx_id,
				blockNum: op.block,
				timestamp: new Date(op.timestamp + 'Z').getTime(),
				requiredPostingAuths: opData.required_posting_auths ?? [],
				requiredAuths: opData.required_auths ?? [],
			};

			// Normalize through protocol-core
			const normalized = normalizeRawOp(rawOp);
			if (normalized.status === 'ignore') continue;

			// Apply through protocol-core (all validation lives here)
			const result = await applyOp(normalized.op, ctx, deps);

			if (result.status === 'applied') {
				blockApplied++;
				registerAccount(broadcaster);
			} else if (result.status === 'rejected') {
				console.warn(`[chainIndexer] REJECTED ${normalized.op.action} from ${broadcaster} block=${blockNum}: ${result.reason}`);
			}
		}

		// Block fully processed — advance cursor atomically
		setBlockCursor(blockNum);
		totalApplied += blockApplied;
	}

	if (totalApplied > 0) {
		// Flush state to disk after each batch to ensure crash safety
		saveState();
	}

	return totalApplied;
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

async function pollNext(): Promise<void> {
	if (_isSyncing) return;
	_isSyncing = true;

	try {
		const applied = await scanBlocks();
		if (applied > 0) {
			console.log(`[chainIndexer] Processed ${applied} ops, cursor now at block ${getBlockCursor()}`);
		}
	} catch (err) {
		console.warn('[chainIndexer] Poll error:', err instanceof Error ? err.message : err);
	} finally {
		_isSyncing = false;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startIndexer(): void {
	if (_pollTimer) return;

	loadState();
	startPersistence();

	// Immediate first scan
	pollNext();

	_pollTimer = setInterval(pollNext, POLL_INTERVAL_MS);
	console.log('[chainIndexer] Started block scanner (every %ds, cursor at block %d)', POLL_INTERVAL_MS / 1000, getBlockCursor());
}

export function stopIndexer(): void {
	if (_pollTimer) {
		clearInterval(_pollTimer);
		_pollTimer = null;
	}
	stopPersistence();
	console.log('[chainIndexer] Stopped');
}

export async function syncAccountNow(username: string): Promise<number> {
	registerAccount(username);
	// In block-scanning mode, account-specific sync triggers a full batch scan
	return scanBlocks();
}

/**
 * chainIndexer.ts — Server-side Hive chain indexer
 *
 * PR 2B: Block-complete sequential scan via get_ops_in_block.
 * - Replays irreversible blocks from cursor+1 through LIB
 * - Cursor is block-based and only advances AFTER entire block is applied
 * - All protocol semantics live in shared/protocol-core
 * - Block-header lookup for entropy block IDs (pack auto-finalize)
 * - Crash-safe: partial block failure = cursor stays, next restart retries
 *
 * Fast-path (volume catch-up): when backlog is high, fetch Hive custom_json
 * operations by block range through HafAH (when available), keeping block-order
 * application and cursor monotonicity identical to per-block mode.
 */

import {
	normalizeRawOp,
	applyOp,
	PACK_ENTROPY_DELAY_BLOCKS,
	type RawHiveOp,
	type ReplayContext,
	type ProtocolCoreDeps,
	type CardDataProvider,
	type RewardProvider,
} from '../../shared/protocol-core';
import { getProtocolRewardById } from '../../shared/protocol-core/rewardCatalog';
import { serverStateAdapter } from './serverStateAdapter';
import { serverSignatureVerifier } from './hiveSignatureVerifier';
import { serverRuneExchangeAdapter } from './runeExchangeAdapter';
import { getRagnarokServerRuntimeConfig } from './runtimeConfig';
import { campaignRegistryProvider } from '../../shared/campaign/registry';
import { getDuatEntitlement } from '../../shared/protocol-core/duatSnapshot';
import {
	registerAccount,
	getBlockCursor,
	setBlockCursor,
	setSyncStatus,
	loadState,
	startPersistence,
	stopPersistence,
	saveState,
} from './chainState';
import { maybePublishIndexCheckpoint } from './indexCheckpointPublisher';
import { shouldAcceptCustomJsonId } from '../../shared/runtimeConfig';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me',
	'https://api.openhive.network',
];

const DEFAULT_HAF_ENDPOINTS = ['https://api.hive.blog'];
const NODE_TIMEOUT_MS = 8_000;
const POLL_INTERVAL_MS = 10_000;
const BLOCKS_PER_BATCH = 100; // Increased for faster catch-up
const MASSIVE_THRESHOLD = 100;
const MASSIVE_RANGE_SIZE = 2_000; // HafAH hard server-side cap
const HAF_PAGE_SIZE_LIVE = 100;
const HAF_PAGE_SIZE_NORMAL = 1000;
const HAF_PAGE_SIZE_MASSIVE = 1000;
const HAF_MASSIVE_SYNC_THRESHOLD = 100;
const HAF_LIVE_SYNC_THRESHOLD = 20;
const HAF_MAX_PAGES = 100;
const SYNC_TOLERANCE_BLOCKS = 5;

const OPEN_AFTER_FAILURES = 8;
const COOLDOWN_BASE_MS = 10_000;
const COOLDOWN_MAX_MS = 120_000;
const COOLDOWN_MULTIPLIER = 2;
const RATE_LIMIT_DEFAULT_MS = 30_000;
const LATENCY_WINDOW = 20;

function parseEndpointList(value: string | undefined): string[] {
	const endpoints = value
		?.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0) ?? [];
	return endpoints.length > 0 ? endpoints : DEFAULT_HAF_ENDPOINTS;
}

const HAF_ENDPOINTS = parseEndpointList(process.env.RAGNAROK_HAF_ENDPOINTS);
let hafEndpointRoundRobin = 0;

// ---------------------------------------------------------------------------
// Endpoint health / failover
// ---------------------------------------------------------------------------

type CircuitState = 'closed' | 'open' | 'half_open';
type ErrorCategory = 'transient' | 'rate_limited' | 'client_error' | 'unknown';

interface EndpointState {
	endpoint: string;
	state: CircuitState;
	consecutiveFailures: number;
	cooldownMs: number;
	openUntil: number;
	rateLimitedUntil: number;
	latencies: number[];
}

const endpointStates: EndpointState[] = HIVE_NODES.map((endpoint) => ({
	endpoint,
	state: 'closed',
	consecutiveFailures: 0,
	cooldownMs: COOLDOWN_BASE_MS,
	openUntil: 0,
	rateLimitedUntil: 0,
	latencies: [],
}));
let endpointRoundRobin = 0;

function pickRoundRobin(pool: readonly EndpointState[]): string {
	const idx = endpointRoundRobin % pool.length;
	endpointRoundRobin += 1;
	return pool[idx]!.endpoint;
}

function getBackoffMs(attempt: number, category: ErrorCategory): number {
	const base = 250 * (attempt + 1);
	if (category === 'rate_limited') return RATE_LIMIT_DEFAULT_MS;
	if (category === 'client_error') return Math.min(base * 2, 2000);
	return Math.min(base * 2, 3000);
}

function classifyError(err: unknown): ErrorCategory {
	if (typeof err === 'object' && err !== null) {
		const anyErr = err as { status?: unknown; name?: string };
		if (typeof anyErr.status === 'number') {
			if (anyErr.status === 429) return 'rate_limited';
			if (anyErr.status >= 500) return 'transient';
			if (anyErr.status >= 400) return 'client_error';
		}
		if (anyErr.name === 'AbortError' || anyErr.name === 'TimeoutError') return 'transient';
	}
	return 'unknown';
}

function selectEndpoint(): string {
	if (endpointStates.length === 0) {
		throw new Error('No Hive endpoints configured');
	}

	const now = Date.now();
	for (const state of endpointStates) {
		if (state.state === 'open' && now >= state.openUntil) {
			state.state = 'half_open';
		}
	}

	if (endpointStates.length === 1) {
		const only = endpointStates[0]!;
		if (only.state === 'open') {
			only.state = 'half_open';
		}
		return only.endpoint;
	}

	const notRateLimited = endpointStates.filter((state) => state.rateLimitedUntil <= now);
	const candidates = notRateLimited.length > 0 ? notRateLimited : endpointStates;

	const closed = candidates.filter((state) => state.state === 'closed');
	if (closed.length > 0) {
		return pickRoundRobin(closed);
	}

	const halfOpen = candidates.filter((state) => state.state === 'half_open');
	if (halfOpen.length > 0) return halfOpen[0]!.endpoint;

	const sorted = [...candidates].sort((a, b) => a.openUntil - b.openUntil);
	const selected = sorted[0]!;
	selected.state = 'half_open';
	return selected.endpoint;
}

function recordSuccess(endpoint: string, latencyMs: number): void {
	const state = endpointStates.find((s) => s.endpoint === endpoint);
	if (!state) return;
	state.consecutiveFailures = 0;
	state.latencies.push(latencyMs);
	if (state.latencies.length > LATENCY_WINDOW) state.latencies.shift();
	if (state.state === 'half_open') {
		state.state = 'closed';
		state.cooldownMs = COOLDOWN_BASE_MS;
	}
}

function recordFailure(endpoint: string, category: ErrorCategory, retryAfterMs?: number): void {
	const state = endpointStates.find((s) => s.endpoint === endpoint);
	if (!state) return;

	if (category === 'rate_limited') {
		state.rateLimitedUntil = Date.now() + (retryAfterMs ?? RATE_LIMIT_DEFAULT_MS);
		return;
	}

	state.consecutiveFailures += 1;
	if (state.state === 'half_open') {
		state.cooldownMs = Math.min(state.cooldownMs * COOLDOWN_MULTIPLIER, COOLDOWN_MAX_MS);
		state.state = 'open';
		state.openUntil = Date.now() + state.cooldownMs;
		return;
	}

	if (state.consecutiveFailures >= OPEN_AFTER_FAILURES && state.state === 'closed') {
		state.state = 'open';
		state.openUntil = Date.now() + state.cooldownMs;
	}
}

// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------

interface HiveRpcResponse<T> {
	result?: T;
	error?: { message: string };
}

interface RpcErrorOptions {
	status?: number;
	endpoint: string;
}

class RpcError extends Error {
	readonly status?: number;
	readonly endpoint: string;
	constructor(message: string, options: RpcErrorOptions) {
		super(message);
		this.name = 'RpcError';
		this.status = options.status;
		this.endpoint = options.endpoint;
	}
}

async function rpcCall<T>(endpoint: string, method: string, params: unknown[], timeoutMs = NODE_TIMEOUT_MS): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
			signal: controller.signal,
		});

		if (!res.ok) {
			const retryAfterHeader = res.headers.get('Retry-After');
			const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1_000 : undefined;
			const normalizedRetryAfterMs = typeof retryAfterMs === 'number' && retryAfterMs > 0 ? retryAfterMs : undefined;
			await res.text().catch(() => {});
			if (normalizedRetryAfterMs !== undefined) {
				(res as Response & { __retryAfterMs?: number }).__retryAfterMs = normalizedRetryAfterMs;
			}
			const error = new RpcError(`RPC error: ${res.statusText} (${res.status})`, {
				endpoint,
				status: res.status,
			});
			const anyErr = error as { __retryAfterMs?: number };
			if (normalizedRetryAfterMs !== undefined) {
				anyErr.__retryAfterMs = normalizedRetryAfterMs;
			}
			throw error;
		}

		const data = (await res.json()) as HiveRpcResponse<T>;
		if (data.result !== undefined) {
			return data.result as T;
		}
		if (data.error) {
			throw new Error(data.error.message);
		}
		throw new Error('RPC returned empty result');
	} finally {
		clearTimeout(timer);
	}
}

function extractRetryAfter(err: unknown): number | undefined {
	if (typeof err === 'object' && err !== null) {
		const candidate = err as { __retryAfterMs?: unknown };
		if (typeof candidate.__retryAfterMs === 'number' && candidate.__retryAfterMs > 0) {
			return candidate.__retryAfterMs;
		}
	}
	return undefined;
}

async function callWithFailover<T>(method: string, params: unknown[]): Promise<T> {
	const maxAttempts = endpointStates.length * 2;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const endpoint = selectEndpoint();
		const start = Date.now();
		try {
			const result = await rpcCall<T>(endpoint, method, params);
			recordSuccess(endpoint, Date.now() - start);
			return result;
		} catch (err) {
			const category = classifyError(err);
			const retryAfterMs = extractRetryAfter(err);
			recordFailure(endpoint, category, retryAfterMs);
			if (attempt === maxAttempts - 1) throw err;
			await sleep(getBackoffMs(attempt, category));
		}
	}

	throw new Error(`Failed to call ${method} after failover attempts`);
}

interface BlockchainStatus {
	head_block_number: number;
	last_irreversible_block_num: number;
}

function parseBlockchainStatus(value: unknown): BlockchainStatus {
	if (!value || typeof value !== 'object') {
		throw new Error('Invalid blockchain status payload');
	}
	const data = value as Record<string, unknown>;
	const head = Number(data.head_block_number);
	const irreversible = Number(data.last_irreversible_block_num);
	if (!Number.isFinite(head) || !Number.isFinite(irreversible)) {
		throw new Error('Invalid blockchain status values');
	}
	return { head_block_number: head, last_irreversible_block_num: irreversible };
}

async function getBlockchainStatus(): Promise<BlockchainStatus> {
	const samples = await Promise.allSettled(
		endpointStates.map((state) => {
			const start = Date.now();
			return rpcCall<unknown>(state.endpoint, 'condenser_api.get_dynamic_global_properties', [])
				.then((raw) => {
					recordSuccess(state.endpoint, Date.now() - start);
					return parseBlockchainStatus(raw);
				});
		}),
	);

	const statuses = samples.flatMap((result, idx) => {
		if (result.status === 'fulfilled') return [result.value];
		const endpoint = endpointStates[idx]?.endpoint;
		if (endpoint) {
			recordFailure(endpoint, classifyError(result.reason));
		}
		return [];
	});

	if (statuses.length === 0) {
		// fallback to full failover path
		const props = await rpcCall<unknown>(selectEndpoint(), 'condenser_api.get_dynamic_global_properties', []);
		return parseBlockchainStatus(props);
	}

	const sorted = [...statuses].sort((a, b) => a.last_irreversible_block_num - b.last_irreversible_block_num);
	if (sorted.length >= 2) {
		const spread = sorted[sorted.length - 1]!.last_irreversible_block_num - sorted[0]!.last_irreversible_block_num;
		if (spread > 1) {
			console.warn('[chainIndexer] Head consensus spread detected', {
				minLib: sorted[0]!.last_irreversible_block_num,
				maxLib: sorted[sorted.length - 1]!.last_irreversible_block_num,
				spread,
				nodes: statuses.length,
			});
		}
	}

	// Conservative consensus: with 2 samples select the older safe chain, with 3+ median.
	const selected =
		sorted[Math.max(0, Math.floor((sorted.length - 1) / 2) - (sorted.length === 2 ? 1 : 0))] ?? sorted[0]!;
	return selected;
}

interface BlockchainOp {
	trx_id: string;
	block: number;
	trx_in_block: number;
	op_in_trx: number;
	timestamp: string;
	op: [string, Record<string, unknown>];
}

function asNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isInteger(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		if (Number.isInteger(n)) return n;
	}
	return Number.NaN;
}

async function getOpsInBlock(blockNum: number): Promise<BlockchainOp[]> {
	return callWithFailover<BlockchainOp[]>('condenser_api.get_ops_in_block', [blockNum, false]);
}

const blockIdCache = new Map<number, string>();

async function getBlockId(blockNum: number): Promise<string | null> {
	const cached = blockIdCache.get(blockNum);
	if (cached) {
		return cached;
	}

	try {
		const block = await callWithFailover<{ block_id: string } | null>('condenser_api.get_block', [blockNum]);
		const blockId = block?.block_id ?? null;
		if (blockId) {
			blockIdCache.set(blockNum, blockId);
			if (blockIdCache.size > 1000) {
				const oldest = blockIdCache.keys().next().value;
				if (oldest !== undefined) {
					blockIdCache.delete(oldest);
				}
			}
		}
		return blockId;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// HafAH range fetch (massive catch-up)
// ---------------------------------------------------------------------------

interface HafAHOperation {
	op: {
		type: string;
		value: {
			id: string;
			json: string;
			required_auths: string[];
			required_posting_auths: string[];
		};
	};
	block: number;
	trx_id: string;
	trx_in_block?: number;
	op_pos?: number;
	timestamp: string;
	operation_id: string | number;
	virtual_op: boolean;
}

interface HafAHResponse {
	ops: HafAHOperation[];
	next_block_range_begin: number | null;
	next_operation_begin: string | null;
}

function parseRetryAfterHeader(response: Response): number | undefined {
	const header = response.headers.get('Retry-After');
	if (!header) return undefined;
	const parsed = Number(header);
	if (!Number.isNaN(parsed) && parsed > 0) return parsed * 1_000;
	return undefined;
}

function getPageSize(behind: number): number {
	if (behind > HAF_MASSIVE_SYNC_THRESHOLD) return HAF_PAGE_SIZE_MASSIVE;
	if (behind > HAF_LIVE_SYNC_THRESHOLD) return HAF_PAGE_SIZE_NORMAL;
	return HAF_PAGE_SIZE_LIVE;
}

async function hafahFetch(
	endpoint: string,
	fromBlock: number,
	toBlock: number,
	operationBegin: string,
	pageSize: number,
): Promise<HafAHResponse> {
	const timeoutMs = pageSize > HAF_PAGE_SIZE_NORMAL ? 15_000 : 10_000;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const response = await fetch(
		`${endpoint}/hafah-api/operations?from-block=${fromBlock}&to-block=${toBlock}&operation-types=18&page-size=${pageSize}&operation-begin=${operationBegin}`,
		{ signal: controller.signal },
	);
	clearTimeout(timer);
	if (!response.ok) {
		const retryAfterMs = parseRetryAfterHeader(response);
		await response.text().catch(() => {});
		const err = new Error(`HafAH error: ${response.statusText} (${response.status})`);
		(err as Error & { __status?: number; __retryAfterMs?: number }).__status = response.status;
		(err as Error & { __status?: number; __retryAfterMs?: number }).__retryAfterMs = retryAfterMs;
		throw err;
	}
	const payload = (await response.json()) as Record<string, unknown>;
	const ops = Array.isArray(payload.ops) ? payload.ops : undefined;
	if (!Array.isArray(ops)) {
		throw new Error('Invalid HafAH response: missing ops array');
	}
	const nextBlockRangeBegin =
		payload.next_block_range_begin === null || payload.next_block_range_begin === undefined
			? null
			: Number(payload.next_block_range_begin);
	const nextOperationBegin =
		payload.next_operation_begin === undefined || payload.next_operation_begin === null
			? null
			: String(payload.next_operation_begin);

	return {
		ops: ops
			.filter((raw): raw is HafAHOperation => {
				if (!raw || typeof raw !== 'object') return false;
				return true;
			})
			.map((raw, idx) => {
				const rawRecord = raw as unknown as Record<string, unknown>;
				const opData = rawRecord.op as Record<string, unknown> | undefined;
				const value = opData?.value as Record<string, unknown> | undefined;
				const type = typeof opData?.type === 'string' ? opData.type : '';
				const requiredAuths = Array.isArray(value?.required_auths) && value.required_auths.every((x) => typeof x === 'string')
					? value.required_auths as string[]
					: [];
				const requiredPostingAuths =
					Array.isArray(value?.required_posting_auths) && value.required_posting_auths.every((x) => typeof x === 'string')
						? value.required_posting_auths as string[]
						: [];
				const block = asNumber(rawRecord.block);
				if (!Number.isFinite(block)) {
					throw new Error(`Invalid HafAH op.block at index ${idx}`);
				}
				const rawTimestamp = typeof rawRecord.timestamp === 'string'
					? rawRecord.timestamp
					: '';
				const trxId = typeof rawRecord.trx_id === 'string'
					? rawRecord.trx_id
					: '';
				const opId = typeof rawRecord.operation_id === 'string' || typeof rawRecord.operation_id === 'number'
						? String(rawRecord.operation_id)
						: `${idx}`;
				const trxInBlock = asNumber(rawRecord.trx_in_block);
				const opPos = asNumber(rawRecord.op_pos);
				return {
					op: {
						type,
						value: {
							id: typeof value?.id === 'string' ? value.id : '',
							json: typeof value?.json === 'string' ? value.json : '{}',
							required_auths: requiredAuths,
							required_posting_auths: requiredPostingAuths,
						},
					},
					block,
					trx_id: trxId,
					trx_in_block: Number.isFinite(trxInBlock) ? trxInBlock : undefined,
					op_pos: Number.isFinite(opPos) ? opPos : undefined,
					timestamp: rawTimestamp,
					operation_id: opId,
					virtual_op: Boolean(rawRecord.virtual_op),
				};
			}),
		next_block_range_begin: Number.isFinite(nextBlockRangeBegin) ? nextBlockRangeBegin : null,
		next_operation_begin: nextOperationBegin,
	};
}

function getHafAHFailureCategory(err: unknown): ErrorCategory {
	if (typeof err === 'object' && err !== null) {
		const envelope = err as { __status?: unknown; name?: string };
		if (typeof envelope.__status === 'number') {
			if (envelope.__status === 429) return 'rate_limited';
			if (envelope.__status >= 500) return 'transient';
			if (envelope.__status >= 400) return 'client_error';
		}
		if (envelope.name === 'AbortError' || envelope.name === 'TimeoutError') return 'transient';
	}
	return 'unknown';
}

async function hafahWithFailover(
	fromBlock: number,
	toBlock: number,
	operationBegin: string,
	pageSize: number,
): Promise<HafAHResponse> {
	const maxAttempts = HAF_ENDPOINTS.length * 2;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const endpoint = HAF_ENDPOINTS[hafEndpointRoundRobin % HAF_ENDPOINTS.length]!;
		hafEndpointRoundRobin += 1;
		try {
			const result = await hafahFetch(endpoint, fromBlock, toBlock, operationBegin, pageSize);
			return result;
		} catch (err) {
			const category = getHafAHFailureCategory(err);
			const retryAfterMs = ((): number | undefined => {
				if (typeof err === 'object' && err !== null) {
					const e = err as { __retryAfterMs?: unknown };
					if (typeof e.__retryAfterMs === 'number' && e.__retryAfterMs > 0) return e.__retryAfterMs;
				}
				return undefined;
			})();
			if (attempt === maxAttempts - 1) throw err;
			await sleep(retryAfterMs ?? getBackoffMs(attempt, category));
		}
	}
	throw new Error(`Failed HafAH range fetch ${fromBlock}..${toBlock}`);
}

function isHafCustomJsonType(type: string): boolean {
	return type === 'custom_json' || type === 'custom_json_operation';
}

async function getCustomJsonInRange(
	fromBlock: number,
	toBlock: number,
	protocolId: string,
	behind: number,
): Promise<BlockchainOp[]> {
	const pageSize = getPageSize(behind);
	let operationBegin = '-1';
	let pages = 0;
	const allOps: BlockchainOp[] = [];

	while (pages < HAF_MAX_PAGES) {
		const result = await hafahWithFailover(fromBlock, toBlock, operationBegin, pageSize);
		const filtered = result.ops
			.filter((op) => {
				if (!isHafCustomJsonType(op.op.type)) return false;
				if (!op.op.value || typeof op.op.value.id !== 'string') return false;
				if (shouldAcceptCustomJsonId(getRagnarokServerRuntimeConfig(), op.op.value.id)) {
					return true;
				}
				// Keep legacy/extra IDs in debug path if caller expects explicit protocol filtering later.
				if (protocolId && op.op.value.id === protocolId) return true;
				return false;
			})
			.map((op) => ({
				trx_id: op.trx_id,
				block: op.block,
				trx_in_block: op.trx_in_block ?? (asNumber(op.operation_id) || 0),
				op_in_trx: op.op_pos ?? (asNumber(op.operation_id) || 0),
				timestamp: op.timestamp,
				op: ['custom_json', {
					id: op.op.value.id,
					json: op.op.value.json,
					required_auths: op.op.value.required_auths,
					required_posting_auths: op.op.value.required_posting_auths,
				}] as [string, Record<string, unknown>],
			}));

		allOps.push(...filtered);

		if (result.next_operation_begin === null || result.next_operation_begin === '0') {
			break;
		}
		operationBegin = result.next_operation_begin;
		pages += 1;
	}

	return allOps;
}

// ---------------------------------------------------------------------------
// Protocol-core dependencies
// ---------------------------------------------------------------------------

const serverCardData: CardDataProvider = {
	getCardById(id: number) {
		if (id >= 1000 && id <= 99999) {
			return { name: `Card${id}`, type: 'minion', rarity: 'common', collectible: true, set: 'genesis' };
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
	getRewardById: getProtocolRewardById,
};

function buildDeps(): ProtocolCoreDeps {
	return {
		runtime: getRagnarokServerRuntimeConfig(),
		state: serverStateAdapter,
		cards: serverCardData,
		rewards: serverRewards,
		campaigns: campaignRegistryProvider,
		sigs: serverSignatureVerifier,
		runeExchange: serverRuneExchangeAdapter,
		duat: { getDuatEntitlement },
	};
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _isSyncing = false;
let _scanPromise: Promise<number> | null = null;

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function groupOpsByTransaction(ops: readonly BlockchainOp[]): Map<string, unknown[]> {
	const grouped = new Map<string, unknown[]>();
	for (const op of ops) {
		const existing = grouped.get(op.trx_id) ?? [];
		existing.push(op.op);
		grouped.set(op.trx_id, existing);
	}
	return grouped;
}

function parseBlockTimestamp(timestamp: string): number {
	if (!timestamp) return Number.NaN;
	const value = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
	const t = Date.parse(value);
	return Number.isFinite(t) ? t : Number.NaN;
}

function sortOpsForBlock(ops: readonly BlockchainOp[]): BlockchainOp[] {
	return [...ops].sort((a, b) => {
		if (a.trx_in_block !== b.trx_in_block) return a.trx_in_block - b.trx_in_block;
		if (a.op_in_trx !== b.op_in_trx) return a.op_in_trx - b.op_in_trx;
		return a.trx_id.localeCompare(b.trx_id);
	});
}

async function processBlockOps(
	blockNum: number,
	ops: readonly BlockchainOp[],
	runtime: ReturnType<typeof getRagnarokServerRuntimeConfig>,
	deps: ProtocolCoreDeps,
	ctx: ReplayContext,
): Promise<number> {
	const ordered = sortOpsForBlock(ops);
	const siblingsByTrx = groupOpsByTransaction(ordered);
	let blockApplied = 0;

	for (const op of ordered) {
		if (op.op[0] !== 'custom_json') continue;

		const opData = op.op[1] as {
			required_auths?: string[];
			required_posting_auths?: string[];
			id?: string;
			json?: string;
		};

		const opId = opData.id ?? '';
		if (!shouldAcceptCustomJsonId(runtime, opId)) continue;

		const broadcaster = opData.required_posting_auths?.[0] ?? opData.required_auths?.[0] ?? '';
		if (!broadcaster) continue;

		const rawOp: RawHiveOp = {
			customJsonId: opId,
			json: opData.json ?? '{}',
			broadcaster,
			trxId: op.trx_id,
			opInTrx: op.op_in_trx,
			blockNum: op.block,
			timestamp: parseBlockTimestamp(op.timestamp),
			requiredPostingAuths: opData.required_posting_auths ?? [],
			requiredAuths: opData.required_auths ?? [],
		};

		const normalized = normalizeRawOp(rawOp, {
			protocolIds: [runtime.protocolId],
			acceptLegacyProtocolIds: runtime.acceptsLegacyProtocolIds,
		});
		if (normalized.status === 'ignore') continue;
		if (normalized.status === 'reject') {
			console.warn(`[chainIndexer] REJECTED ${broadcaster} custom_json id=${opId} block=${blockNum}: ${normalized.reason}`);
			continue;
		}

		serverStateAdapter.setTrxSiblings(op.trx_id, siblingsByTrx.get(op.trx_id) ?? []);

		const result = await applyOp(normalized.op, ctx, deps);
		if (result.status === 'applied') {
			blockApplied++;
			registerAccount(broadcaster);
		} else if (result.status === 'rejected') {
			console.warn(`[chainIndexer] REJECTED ${normalized.op.action} from ${broadcaster} block=${blockNum}: ${result.reason}`);
		}
	}

	setBlockCursor(blockNum);
	return blockApplied;
}

async function scanWindowByBlocks(
	startBlock: number,
	endBlock: number,
	deps: ProtocolCoreDeps,
	runtime: ReturnType<typeof getRagnarokServerRuntimeConfig>,
	lib: number,
): Promise<{ blocks: number; applied: number }> {
	let applied = 0;
	let advanced = 0;
	const ctx: ReplayContext = { lastIrreversibleBlock: lib, getBlockId };

	for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
		let ops: BlockchainOp[];
		try {
			ops = await getOpsInBlock(blockNum);
		} catch (err) {
			console.warn(`[chainIndexer] Failed to fetch block ${blockNum}:`, err instanceof Error ? err.message : err);
			break;
		}
		const blockOps = sortOpsForBlock(ops);
		applied += await processBlockOps(blockNum, blockOps, runtime, deps, ctx);
		advanced += 1;
	}

	return { blocks: advanced, applied };
}

async function scanWindowByRange(
	startBlock: number,
	endBlock: number,
	behind: number,
	deps: ProtocolCoreDeps,
	runtime: ReturnType<typeof getRagnarokServerRuntimeConfig>,	lib: number,
): Promise<{ blocks: number; applied: number }> {
	const protocolId = runtime.protocolId;
	const rawOps = await getCustomJsonInRange(startBlock, endBlock, protocolId, behind);
	const byBlock = new Map<number, BlockchainOp[]>();
	for (const op of rawOps) {
		const list = byBlock.get(op.block);
		if (!list) byBlock.set(op.block, [op]);
		else list.push(op);
	}

	let applied = 0;
	let advanced = 0;
	const ctx: ReplayContext = { lastIrreversibleBlock: lib, getBlockId };
	for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
		const blockOps = byBlock.get(blockNum) ?? [];
		applied += await processBlockOps(blockNum, blockOps, runtime, deps, ctx);
		advanced++;
	}

	return { blocks: advanced, applied };
}

// ---------------------------------------------------------------------------
// Block scanner
// ---------------------------------------------------------------------------

function getRangeScanEnabled(): boolean {
	const raw = process.env.RAGNAROK_RANGE_SCAN?.trim().toLowerCase();
	return raw !== 'false' && raw !== '0' && raw !== 'off';
}

async function scanBlocks(): Promise<number> {
	const startedAt = Date.now();
	const cursor = getBlockCursor();
	let status: BlockchainStatus;

	try {
		status = await getBlockchainStatus();
	} catch (err) {
		console.warn('[chainIndexer] Failed to get chain status:', err instanceof Error ? err.message : err);
		return 0;
	}

	const lib = status.last_irreversible_block_num;
	const head = status.head_block_number;
	const effectiveLib = Math.max(0, lib - PACK_ENTROPY_DELAY_BLOCKS);

	const behind = Math.max(0, effectiveLib - cursor);
	setSyncStatus(cursor, lib, head, behind <= SYNC_TOLERANCE_BLOCKS, effectiveLib);

	if (cursor >= effectiveLib) return 0;

	const startBlock = cursor + 1;
	const isMassive = behind > MASSIVE_THRESHOLD;
	const rangeScanEnabled = getRangeScanEnabled();
	const scanMode = isMassive && rangeScanEnabled ? 'haf-range' : 'block-rpc';
	console.log(`[chainIndexer] Sync status cursor=${cursor}, target=${effectiveLib}, lib=${lib}, head=${head}, blocksBehind=${behind}, mode=${scanMode}`);
	const deps = buildDeps();
	const runtime = getRagnarokServerRuntimeConfig();

	let current = startBlock;
	let totalApplied = 0;
	let totalBlocks = 0;
	let hasProgress = false;

	while (current <= effectiveLib) {
		if (!isMassive || !rangeScanEnabled) {
			const endBlock = Math.min(current + BLOCKS_PER_BATCH - 1, effectiveLib);
			const result = await scanWindowByBlocks(current, endBlock, deps, runtime, lib);
			current += result.blocks;
			totalApplied += result.applied;
			totalBlocks += result.blocks;
			hasProgress = hasProgress || result.blocks > 0;
			if (result.blocks === 0) break;
			if (result.blocks > 0) {
				saveState();
			}
			continue;
		}

		const range1End = Math.min(current + MASSIVE_RANGE_SIZE - 1, effectiveLib);
		const range2Start = range1End + 1;
		const hasRange2 = range2Start <= effectiveLib;
		const range2End = hasRange2
			? Math.min(range2Start + MASSIVE_RANGE_SIZE - 1, effectiveLib)
			: 0;

		let first: { from: number; to: number; ops: BlockchainOp[] } | null = null;
		let second: { from: number; to: number; ops: BlockchainOp[] } | null = null;

		const results = await Promise.allSettled([
			scanRangeFetch(current, range1End, behind, runtime.protocolId),
			hasRange2
				? scanRangeFetch(range2Start, range2End, behind, runtime.protocolId)
				: Promise.resolve({ from: range2Start, to: range2End, ops: [] }),
		]);

		if (results[0]?.status === 'fulfilled') {
			first = results[0]!.value;
		} else {
			console.warn('[chainIndexer] HafAH range 1 failed, falling back to block scan', {
				from: current,
				to: range1End,
				error: results[0] instanceof Object && 'reason' in results[0]
					? String(results[0].reason)
					: 'unknown',
			});
		}

		if (results[1]?.status === 'fulfilled') {
			const r2 = results[1]!.value;
			if (r2.ops.length > 0) {
				second = r2;
			}
		} else if (hasRange2) {
			console.warn('[chainIndexer] HafAH range 2 failed, continuing with first range only', {
				from: range2Start,
				to: range2End,
				error: results[1] instanceof Object && 'reason' in results[1]
					? String(results[1].reason)
					: 'unknown',
			});
		}

		if (!first) {
			const fallback = await scanWindowByBlocks(current, range1End, deps, runtime, lib);
			if (fallback.blocks === 0) break;
			totalApplied += fallback.applied;
			totalBlocks += fallback.blocks;
			hasProgress = hasProgress || fallback.blocks > 0;
			current += fallback.blocks;
			saveState();
			continue;
		}

		const ranges = [first];
		if (second) ranges.push(second);
		for (const segment of ranges) {
			const segmentResult = await scanWindowByRange(segment.from, segment.to, behind, deps, runtime, lib);
			totalApplied += segmentResult.applied;
			totalBlocks += segmentResult.blocks;
			current = Math.max(current, segment.to + 1);
			hasProgress = hasProgress || segmentResult.blocks > 0;
		}

		if (hasProgress) saveState();
	}

	if (totalApplied > 0 || totalBlocks > 0) {
		saveState();
	}

	if (totalBlocks > 0) {
		const remaining = Math.max(0, effectiveLib - getBlockCursor());
		const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
		const blocksPerSecond = totalBlocks / elapsedSeconds;
		console.log(`[chainIndexer] Processed ${totalApplied} ops across ${totalBlocks} blocks, cursor=${getBlockCursor()}, target=${effectiveLib}, blocksBehind=${remaining}, rate=${blocksPerSecond.toFixed(1)} blocks/s`);
	}

	if (totalBlocks > 0 && getBlockCursor() >= effectiveLib && totalApplied >= 0) {
		// Mark explicit progress while synchronized.
		const refreshedStatus = getBlockCursor();
		setSyncStatus(refreshedStatus, lib, head, true, effectiveLib);
	}

	return totalApplied;
}

async function scanRangeFetch(
	fromBlock: number,
	toBlock: number,
	behind: number,
	protocolId: string,
): Promise<{ from: number; to: number; ops: BlockchainOp[] }> {
	if (toBlock < fromBlock) return { from: fromBlock, to: toBlock, ops: [] };
	const ops = await getCustomJsonInRange(fromBlock, toBlock, protocolId, behind);
	return { from: fromBlock, to: toBlock, ops };
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

async function pollNext(): Promise<void> {
	if (_isSyncing) return;
	_isSyncing = true;

	try {
		const applied = await scanOnce();
		if (applied > 0) {
			console.log(`[chainIndexer] Processed ${applied} ops, cursor now at block ${getBlockCursor()}`);
		}
		const runtime = getRagnarokServerRuntimeConfig();
		void maybePublishIndexCheckpoint(runtime)
			.then((result) => {
				if (result.status === 'published') {
					console.log(`[chainIndexer] Published index checkpoint block=${result.block} tx=${result.trxId ?? 'unknown'}`);
				} else if (result.status === 'dry_run') {
					console.log(`[chainIndexer] Dry-run index checkpoint block=${result.block} hash=${result.stateHash.slice(0, 12)}`);
				}
			})
			.catch((err) => {
				console.warn('[chainIndexer] Failed to publish index checkpoint:', err instanceof Error ? err.message : err);
			});
	} catch (err) {
		console.warn('[chainIndexer] Poll error:', err instanceof Error ? err.message : err);
	} finally {
		_isSyncing = false;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function isIndexerEnabled(): boolean {
	return process.env.ENABLE_CHAIN_INDEXER !== 'false';
}

function scanOnce(): Promise<number> {
	if (_scanPromise) return _scanPromise;

	_scanPromise = scanBlocks().finally(() => {
		_scanPromise = null;
	});
	return _scanPromise;
}

export function startIndexer(): void {
	if (!isIndexerEnabled()) return;
	if (_pollTimer) return;

	loadState();
	startPersistence();

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
	if (!isIndexerEnabled()) return 0;
	registerAccount(username);
	return scanOnce();
}

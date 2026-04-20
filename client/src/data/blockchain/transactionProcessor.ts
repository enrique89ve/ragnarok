/**
 * transactionProcessor.ts
 *
 * Drains the transactionQueueStore and routes each transaction to the
 * appropriate backend depending on DATA_LAYER_MODE:
 *
 *   'local' → no-op (transactions stay queued, never submitted)
 *   'test'  → POST to local Express mock-blockchain endpoints
 *   'hive'  → broadcast via Hive Keychain (requestCustomJson)
 *
 * Usage:
 *   startTransactionProcessor()   — call once at app start (idempotent)
 *   stopTransactionProcessor()    — call on unmount / test teardown
 *
 * The processor polls every POLL_INTERVAL_MS for queued transactions,
 * submits them one at a time (sequential to avoid double-submission), and
 * marks each as confirmed/failed in the store.
 */

import { useTransactionQueueStore } from './transactionQueueStore';
import { getDataLayerMode } from '@/config/featureFlags';
import type { TransactionEntry, PackagedMatchResult } from './types';
import { hiveSync } from '../HiveSync';
import { hiveEvents } from '../HiveEvents';
import type { RagnarokTransactionType } from '../schemas/HiveTypes';

const POLL_INTERVAL_MS = 2000;
const MOCK_API_BASE = '/api/mock-blockchain';

let processorInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startTransactionProcessor(): void {
	if (processorInterval !== null) return; // already running

	const mode = getDataLayerMode();
	if (mode === 'local') {
		// In local mode there's no server to send to — leave queue in-memory only
		return;
	}

	processorInterval = setInterval(processNextTransaction, POLL_INTERVAL_MS);
}

export function stopTransactionProcessor(): void {
	if (processorInterval !== null) {
		clearInterval(processorInterval);
		processorInterval = null;
	}
	isRunning = false;
}

// ---------------------------------------------------------------------------
// Core drain loop
// ---------------------------------------------------------------------------

async function processNextTransaction(): Promise<void> {
	if (isRunning) return; // prevent overlap

	const store = useTransactionQueueStore.getState();
	// Pick the oldest queued transaction
	const queued = store.getByStatus('queued');
	if (queued.length === 0) return;

	// Sort by createdAt ascending — oldest first
	const tx = queued.sort((a, b) => a.createdAt - b.createdAt)[0];

	isRunning = true;
	store.updateStatus(tx.id, 'submitting');

	try {
		const mode = getDataLayerMode();

		if (mode === 'test') {
			await submitToMockServer(tx);
		} else if (mode === 'hive') {
			await submitToHive(tx);
		}
		// 'local' never reaches here (processor doesn't start)

	} catch (err) {
		const canRetry = useTransactionQueueStore.getState().retry(tx.id);
		if (!canRetry) {
			useTransactionQueueStore.getState().updateStatus(tx.id, 'failed', {
				error: err instanceof Error ? err.message : String(err),
			});
		}
	} finally {
		isRunning = false;
	}
}

// ---------------------------------------------------------------------------
// Mock server submission ('test' mode)
// ---------------------------------------------------------------------------

async function submitToMockServer(tx: TransactionEntry): Promise<void> {
	const store = useTransactionQueueStore.getState();

	let endpoint = '';
	let body: unknown = tx.payload;

	switch (tx.actionType) {
		case 'match_result':
			endpoint = `${MOCK_API_BASE}/match-result`;
			body = tx.payload as PackagedMatchResult;
			break;

		case 'card_transfer':
			endpoint = `${MOCK_API_BASE}/transfer`;
			body = tx.payload;
			break;

		case 'level_up':
			endpoint = `${MOCK_API_BASE}/level-up`;
			body = tx.payload;
			break;

		case 'nft_mint':
			endpoint = `${MOCK_API_BASE}/mint`;
			body = tx.payload;
			break;

		default:
			throw new Error(`Unknown action type: ${tx.actionType}`);
	}

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Mock server ${response.status}: ${errText}`);
	}

	const data = await response.json() as { trxId?: string; blockNum?: number };

	store.updateStatus(tx.id, 'confirmed', {
		trxId: data.trxId ?? `mock_${tx.id}`,
		blockNum: data.blockNum ?? 0,
	});
	hiveEvents.emitTransactionConfirmed({ trxId: data.trxId ?? `mock_${tx.id}`, type: tx.actionType as any, status: 'confirmed' });
}

// ---------------------------------------------------------------------------
// Real Hive submission ('hive' mode)
// ---------------------------------------------------------------------------

// Maps internal BlockchainActionType to Hive custom_json op id
const ACTION_TO_OP_ID: Partial<Record<string, RagnarokTransactionType>> = {
	match_result:  'rp_match_result',
	level_up:      'rp_level_up',
	card_transfer: 'rp_card_transfer',
	nft_mint:      'rp_pack_open',
};

// Card transfers require Active key; everything else uses Posting key
const ACTIVE_KEY_ACTIONS = new Set(['card_transfer']);

async function submitToHive(tx: TransactionEntry): Promise<void> {
	const store = useTransactionQueueStore.getState();

	const username = hiveSync.getUsername();
	if (!username) {
		throw new Error('No Hive username — user must log in with Keychain first');
	}
	if (!hiveSync.isKeychainAvailable()) {
		throw new Error('Hive Keychain extension not installed');
	}

	const opId = ACTION_TO_OP_ID[tx.actionType];
	if (!opId) {
		throw new Error(`No chain op mapped for action type: ${tx.actionType}`);
	}

	const useActiveKey = ACTIVE_KEY_ACTIONS.has(tx.actionType);

	const result = await hiveSync.broadcastCustomJson(
		opId,
		tx.payload as Record<string, unknown>,
		useActiveKey,
	);

	if (!result.success) {
		hiveEvents.emitTransactionFailed({ trxId: tx.id, type: tx.actionType as any, status: 'failed', errorMessage: result.error ?? 'Keychain broadcast rejected' });
		throw new Error(result.error ?? 'Keychain broadcast rejected');
	}

	store.updateStatus(tx.id, 'confirmed', {
		trxId: result.trxId ?? null,
		blockNum: result.blockNum ?? null,
	});
	hiveEvents.emitTransactionConfirmed({ trxId: result.trxId ?? '', type: tx.actionType as any, status: 'confirmed' });
}

// ---------------------------------------------------------------------------
// Helpers for manual use (e.g. dev console or UI)
// ---------------------------------------------------------------------------

/**
 * Manually submit a single transaction by ID (for retry UI).
 */
export async function resubmitTransaction(txId: string): Promise<void> {
	const store = useTransactionQueueStore.getState();
	const tx = store.transactions.find(t => t.id === txId);
	if (!tx) throw new Error(`Transaction ${txId} not found`);

	store.updateStatus(txId, 'submitting');

	const mode = getDataLayerMode();
	if (mode === 'test') {
		await submitToMockServer(tx);
	} else if (mode === 'hive') {
		await submitToHive(tx);
	}
}

/**
 * Fetch current collection from mock server (test mode only).
 */
export async function fetchMockCollection(username: string): Promise<unknown> {
	if (getDataLayerMode() !== 'test') {
		throw new Error('fetchMockCollection only available in test mode');
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const res = await fetch(`${MOCK_API_BASE}/collection/${username}`, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Fetch player stats from mock server (test mode only).
 */
export async function fetchMockStats(username: string): Promise<unknown> {
	if (getDataLayerMode() !== 'test') {
		throw new Error('fetchMockStats only available in test mode');
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const res = await fetch(`${MOCK_API_BASE}/stats/${username}`, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Reset all mock blockchain data (test mode only, useful between test runs).
 */
export async function resetMockBlockchain(): Promise<void> {
	if (getDataLayerMode() !== 'test') {
		throw new Error('resetMockBlockchain only available in test mode');
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const res = await fetch(`${MOCK_API_BASE}/reset`, { method: 'POST', signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Dump entire mock blockchain state as JSON (debug).
 */
export async function dumpMockBlockchain(): Promise<unknown> {
	if (getDataLayerMode() !== 'test') {
		throw new Error('dumpMockBlockchain only available in test mode');
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const res = await fetch(`${MOCK_API_BASE}/dump`, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	} finally {
		clearTimeout(timer);
	}
}

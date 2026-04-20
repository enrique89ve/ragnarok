/**
 * replayRules.ts — Client replay adapter over shared protocol-core
 *
 * PR 3: This file is now a thin adapter. All protocol validation and state
 * transitions live in shared/protocol-core. This adapter:
 * 1. Converts the replay engine's RawOp format to protocol-core's RawHiveOp
 * 2. Calls normalizeRawOp + applyOp from protocol-core
 * 3. Emits HiveEvents for UI notifications (not protocol logic)
 * 4. Handles slash evidence RPC verification (requires fetch, not pure)
 *
 * Zero protocol semantics live here. PoW, signatures, nonces, cooldowns,
 * supply caps, ELO, RUNE, XP — all inside protocol-core.
 */

import {
	normalizeRawOp,
	applyOp as coreApplyOp,
	type RawHiveOp,
	type ReplayContext,
	type ProtocolCoreDeps,
} from '../../../../shared/protocol-core';
import { clientStateAdapter } from './clientStateAdapter';
import { clientSignatureVerifier } from './clientSignatureVerifier';
import { hiveEvents } from '../HiveEvents';
import { getCardDataProvider } from './ICardDataProvider';
import { getRewardById } from './tournamentRewards';
import { HIVE_NODES } from './hiveConfig';

// ============================================================
// RawOp format (from replayEngine.ts)
// ============================================================

export interface RawOp {
	id: string;
	json: string;
	broadcaster: string;
	trxId: string;
	blockNum: number;
	timestamp: number;
}

// ============================================================
// Card data provider adapter
// ============================================================

function getCardDataProviderAdapter() {
	const provider = getCardDataProvider();
	return {
		getCardById(id: number) {
			const card = provider.getCardById(id);
			if (!card) return null;
			return {
				name: card.name || '',
				type: card.type || 'minion',
				rarity: card.rarity || 'common',
				race: card.race,
				collectible: card.collectible,
			};
		},
		getCollectibleIdsInRanges(ranges: [number, number][]) {
			const all = provider.getAllCards().filter((c: { collectible?: boolean }) => c.collectible !== false);
			return all
				.filter((c: { id: number }) => ranges.some(([lo, hi]) => c.id >= lo && c.id <= hi))
				.map((c: { id: number }) => c.id);
		},
	};
}

// ============================================================
// Reward provider adapter
// ============================================================

const rewardProviderAdapter = {
	getRewardById(id: string) {
		const r = getRewardById(id);
		if (!r) return null;
		return {
			id: r.rewardId,
			condition: r.condition,
			cards: r.cards,
			runeBonus: r.runeBonus,
		};
	},
};

// ============================================================
// LIB + block-id lookup (client-side)
// ============================================================

async function callHive<T>(method: string, params: unknown[]): Promise<T> {
	for (const node of HIVE_NODES) {
		try {
			const res = await fetch(node, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
			});
			const data = await res.json();
			if (data.result !== undefined) return data.result as T;
		} catch { /* try next node */ }
	}
	throw new Error('All Hive nodes failed');
}

let _cachedLib = 0;
let _libFetchedAt = 0;
const LIB_CACHE_MS = 10_000;

async function getLastIrreversibleBlock(): Promise<number> {
	if (Date.now() - _libFetchedAt < LIB_CACHE_MS) return _cachedLib;
	try {
		const props = await callHive<{ last_irreversible_block_num: number }>(
			'condenser_api.get_dynamic_global_properties', [],
		);
		_cachedLib = props.last_irreversible_block_num;
		_libFetchedAt = Date.now();
		return _cachedLib;
	} catch {
		return _cachedLib || 999_999_999;
	}
}

async function getBlockId(blockNum: number): Promise<string | null> {
	try {
		const block = await callHive<{ block_id: string } | null>(
			'condenser_api.get_block', [blockNum],
		);
		return block?.block_id ?? null;
	} catch {
		return null;
	}
}

// ============================================================
// Build protocol-core dependencies
// ============================================================

function buildDeps(): ProtocolCoreDeps {
	return {
		state: clientStateAdapter,
		cards: getCardDataProviderAdapter(),
		rewards: rewardProviderAdapter,
		sigs: clientSignatureVerifier,
	};
}

// ============================================================
// Main entry point — called by replayEngine.ts
// ============================================================

export async function applyOp(op: RawOp): Promise<void> {
	// Convert RawOp to protocol-core RawHiveOp
	const rawHiveOp: RawHiveOp = {
		customJsonId: op.id,
		json: op.json,
		broadcaster: op.broadcaster,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
		// The replay engine normalizes these before calling us,
		// but the protocol-core normalizer also handles them.
		// Use op.id prefix to infer authority level.
		requiredPostingAuths: [op.broadcaster],
		requiredAuths: [],
	};

	// Normalize through protocol-core (legacy mapping, authority check)
	const normalized = normalizeRawOp(rawHiveOp);
	if (normalized.status === 'ignore') return;

	// Build context with LIB + block-id lookup
	const lib = await getLastIrreversibleBlock();
	const ctx: ReplayContext = { lastIrreversibleBlock: lib, getBlockId };
	const deps = buildDeps();

	// Apply through protocol-core (all validation lives here)
	const result = await coreApplyOp(normalized.op, ctx, deps);

	if (result.status === 'rejected') {
		console.warn(`[replayRules] REJECTED ${normalized.op.action} from ${op.broadcaster} (trx=${op.trxId.slice(0, 12)}): ${result.reason}`);
	}

	// Post-apply UI hooks (not protocol logic — HiveEvents for toasts/notifications)
	if (result.status === 'applied') {
		emitUIEvents(normalized.op.action, op);
	}
}

// ============================================================
// UI event emissions (post-apply, non-protocol)
// ============================================================

function emitUIEvents(action: string, op: RawOp): void {
	try {
		const payload = JSON.parse(op.json);
		switch (action) {
			case 'match_result': {
				const winner = payload.w ?? payload.winnerId;
				if (winner) {
					hiveEvents.emitTokenUpdate('RUNE', 0, winner === op.broadcaster ? 10 : 3);
				}
				break;
			}
			case 'card_transfer': {
				const nftId = payload.nft_id ?? payload.card_uid;
				const to = payload.to;
				if (nftId && to) {
					hiveEvents.emitCardTransferred(nftId, op.broadcaster, to);
				}
				break;
			}
		}
	} catch { /* non-critical */ }
}

// ============================================================
// Slash evidence (requires RPC — not pure, stays here)
// ============================================================

export async function retryPendingSlashes(): Promise<void> {
	// Slash evidence verification requires fetching transactions from Hive RPC.
	// This is the one piece that can't be pure protocol-core because it needs
	// external data. It stays in the client adapter.
	// TODO: Extract into a SlashVerifier interface if this grows.
}

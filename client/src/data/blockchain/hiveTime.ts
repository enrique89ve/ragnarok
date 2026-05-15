/**
 * Hive chain time fetch.
 *
 * Used by the daily quest countdown so the "next reset" timer aligns
 * with the same clock the chain validates against (`op.timestamp`
 * compared to `ymd_utc` in `applyDailyQuestClaim`). The dev server is
 * NOT in this path — the client talks directly to a Hive RPC node, the
 * same way Keychain dispatches broadcasts.
 *
 * Pattern mirrors `blockRefCache.fetchHeadBlock`: try each node in
 * order with a 5s abort timeout, fall back to the next node on error.
 */

import { HIVE_NODES } from './hiveConfig';

export interface HiveTimeSnapshot {
	/** Hive head-block timestamp, ms since epoch (UTC). */
	hiveNowMs: number;
	/** Local `Date.now()` captured at the moment of the response. */
	clientNowMs: number;
	/** Node that answered, useful for diagnostics. */
	sourceNode: string;
}

const FETCH_TIMEOUT_MS = 5000;

interface DynamicGlobalProperties {
	time?: string;
}

interface RpcResponse {
	result?: DynamicGlobalProperties;
}

export async function fetchHiveTime(): Promise<HiveTimeSnapshot | null> {
	for (const node of HIVE_NODES) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			try {
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
				if (!res.ok) continue;
				const data = (await res.json()) as RpcResponse;
				const time = data.result?.time;
				if (typeof time !== 'string' || time.length === 0) continue;
				// Hive returns `YYYY-MM-DDTHH:mm:ss` with NO timezone suffix; the
				// stamp is UTC by chain convention, so we append `Z` to parse it
				// as such (matches what `blockRefCache` does).
				const hiveNowMs = Date.parse(`${time}Z`);
				if (!Number.isFinite(hiveNowMs)) continue;
				return {
					hiveNowMs,
					clientNowMs: Date.now(),
					sourceNode: node,
				};
			} finally {
				clearTimeout(timer);
			}
		} catch {
			// try next node
		}
	}
	return null;
}

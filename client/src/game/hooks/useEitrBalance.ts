import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEitrAccount, type AccountEitrSummary } from '../../data/eitrAPI';
import { hiveEvents, type HiveEvent } from '../../data/HiveEvents';

export interface UseEitrBalanceResult {
	balance: number;
	summary: AccountEitrSummary | null;
	loading: boolean;
	error: string | null;
	refresh: () => void;
}

const EMPTY_SUMMARY: UseEitrBalanceResult = {
	balance: 0,
	summary: null,
	loading: false,
	error: null,
	refresh: () => {},
};

// Subscribes to /api/chain/player/:u/eitr and refetches when the bridge emits
// a `token:updated` event for `'Eitr'`. Per ADR 0001, balance is replay-derived
// (credits − debits) — no local scalar. Hook returns 0 when account is null.
export function useEitrBalance(account: string | null, seasonId = 'S01'): UseEitrBalanceResult {
	const [summary, setSummary] = useState<AccountEitrSummary | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const tickRef = useRef(0);

	const refresh = useCallback(() => {
		tickRef.current += 1;
	}, []);

	useEffect(() => {
		if (!account) {
			setSummary(null);
			setError(null);
			return;
		}

		const controller = new AbortController();
		setLoading(true);
		setError(null);

		fetchEitrAccount(account, seasonId, controller.signal)
			.then(next => {
				if (controller.signal.aborted) return;
				setSummary(next);
				setLoading(false);
			})
			.catch(err => {
				if (controller.signal.aborted) return;
				setError(err instanceof Error ? err.message : String(err));
				setLoading(false);
			});

		return () => controller.abort();
	}, [account, seasonId, tickRef.current]);

	useEffect(() => {
		if (!account) return;
		const off = hiveEvents.on('token:updated', (event: HiveEvent) => {
			const payload = event.payload as { token?: unknown } | undefined;
			if (payload && payload.token === 'Eitr') refresh();
		});
		return off;
	}, [account, refresh]);

	if (!account) return EMPTY_SUMMARY;

	return {
		balance: summary?.eitrBalance ?? 0,
		summary,
		loading,
		error,
		refresh,
	};
}

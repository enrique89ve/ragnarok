/**
 * Daily quest reset countdown synced to Hive chain time.
 *
 * Hive's head-block timestamp is the same clock the chain validates
 * `daily_quest_claim` against (`ymd_utc` compared to `op.timestamp`),
 * so anchoring the UI countdown to it gives the player a number that
 * matches reality even when the local device clock is skewed. If
 * every Hive node we know about is unreachable, the countdown falls
 * back to `Date.now()` with `sourceIsHive: false` so the caller can
 * render an "approximate" hint.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchHiveTime, type HiveTimeSnapshot } from '../../data/blockchain/hiveTime';

const TICK_MS = 1000;
const RESYNC_INTERVAL_MS = 15 * 60 * 1000; // refresh offset every 15 min
const CLOCK_SKEW_WARNING_MS = 30 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

let clockSkewWarningEmitted = false;

export interface DailyResetCountdown {
	/** Milliseconds until the next UTC midnight, never negative. */
	remainingMs: number;
	/** Whether the offset came from a successful Hive RPC fetch. */
	sourceIsHive: boolean;
}

type ClockSync =
	| { readonly kind: 'hive'; readonly offsetMs: number }
	| { readonly kind: 'local'; readonly offsetMs: 0 };

function nextUtcMidnightMs(nowMs: number): number {
	const date = new Date(nowMs);
	const tomorrow = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate() + 1,
		0, 0, 0, 0,
	);
	return tomorrow;
}

function computeRemaining(sync: ClockSync): number {
	const effectiveNow = Date.now() + sync.offsetMs;
	const reset = nextUtcMidnightMs(effectiveNow);
	return Math.max(0, reset - effectiveNow);
}

function snapshotToClockSync(snapshot: HiveTimeSnapshot): ClockSync {
	return {
		kind: 'hive',
		offsetMs: snapshot.hiveNowMs - snapshot.clientNowMs,
	};
}

function formatApproximateSkew(offsetMs: number): string {
	const totalMinutes = Math.round(Math.abs(offsetMs) / MS_PER_MINUTE);
	if (totalMinutes < 60) return `${totalMinutes}m`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (minutes === 0) return `${hours}h`;
	return `${hours}h ${minutes}m`;
}

function emitClockSkewWarning(offsetMs: number): void {
	if (clockSkewWarningEmitted || Math.abs(offsetMs) <= CLOCK_SKEW_WARNING_MS) return;
	clockSkewWarningEmitted = true;
	toast.warning('Your device clock is off', {
		description: `Quest timing may differ from your device by ~${formatApproximateSkew(offsetMs)}.`,
		duration: 8000,
	});
}

export function useDailyResetCountdown(): DailyResetCountdown {
	const [clockSync, setClockSync] = useState<ClockSync>({ kind: 'local', offsetMs: 0 });
	const [remainingMs, setRemainingMs] = useState(() => computeRemaining({ kind: 'local', offsetMs: 0 }));

	useEffect(() => {
		let cancelled = false;

		async function resync() {
			const snapshot = await fetchHiveTime();
			if (cancelled) return;
			if (snapshot === null) {
				setClockSync({ kind: 'local', offsetMs: 0 });
				return;
			}
			const nextSync = snapshotToClockSync(snapshot);
			setClockSync(nextSync);
			emitClockSkewWarning(nextSync.offsetMs);
		}

		void resync();
		const resyncTimer = window.setInterval(() => { void resync(); }, RESYNC_INTERVAL_MS);
		return () => {
			cancelled = true;
			window.clearInterval(resyncTimer);
		};
	}, []);

	useEffect(() => {
		setRemainingMs(computeRemaining(clockSync));
		const tick = window.setInterval(() => {
			setRemainingMs(computeRemaining(clockSync));
		}, TICK_MS);
		return () => window.clearInterval(tick);
	}, [clockSync]);

	return { remainingMs, sourceIsHive: clockSync.kind === 'hive' };
}

export function formatCountdown(ms: number): string {
	const total = Math.floor(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

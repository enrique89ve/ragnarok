import React, { useEffect, useState } from 'react';

// One-time banner that runs on first v1 boot for any tester who had a
// localStorage Eitr balance from the pre-canonical preview. Per ADR 0001
// §8, the legacy balance is dropped and not retroactively credited — Eitr
// now lives on-chain via the eitr_ledger store.
const LEGACY_KEY = 'ragnarok-crafting';
const ACK_KEY = 'eitr-migration-acknowledged';

function readLegacyEitr(): number | null {
	try {
		const raw = localStorage.getItem(LEGACY_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return null;
		// zustand/persist wraps state in { state, version }
		const state = (parsed as { state?: { eitr?: unknown } }).state ?? parsed as { eitr?: unknown };
		const eitr = (state as { eitr?: unknown })?.eitr;
		return typeof eitr === 'number' && Number.isFinite(eitr) ? eitr : null;
	} catch {
		return null;
	}
}

export function EitrMigrationBanner(): React.ReactElement | null {
	const [legacyValue, setLegacyValue] = useState<number | null>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (localStorage.getItem(ACK_KEY) === '1') return;
		const value = readLegacyEitr();
		if (value === null || value === 0) {
			// Nothing to migrate — set ack so we never check again.
			localStorage.setItem(ACK_KEY, '1');
			return;
		}
		setLegacyValue(value);
		localStorage.removeItem(LEGACY_KEY);
		localStorage.setItem(ACK_KEY, '1');
	}, []);

	if (legacyValue === null || dismissed) return null;

	return (
		<div
			role="alert"
			className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl mx-auto px-4 py-3 rounded-lg border border-bifrost-500/40 bg-obsidian-900/95 backdrop-blur-sm shadow-2xl"
		>
			<div className="flex items-start gap-3">
				<span className="text-bifrost-300 font-bold text-sm shrink-0">Eitr is now chain-derived</span>
				<div className="text-ink-200 text-xs leading-relaxed">
					Your previous local balance of <span className="text-bifrost-300 font-mono">{legacyValue}</span> Eitr was a UI preview only and is not carried into Season 01. Start fresh — burn cards to earn Eitr canonically.
				</div>
				<button
					onClick={() => setDismissed(true)}
					className="text-ink-300 hover:text-ink-0 text-sm shrink-0 transition-colors"
					aria-label="Dismiss"
				>
					✕
				</button>
			</div>
		</div>
	);
}

export default EitrMigrationBanner;

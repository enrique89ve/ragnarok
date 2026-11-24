import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { RotateCw, X } from 'lucide-react';
import {
	appUpdateManager,
	formatVersionLabel,
	isAppUpdateToastVisible,
} from '../lib/appUpdateManager';

function isLiveMatchRoute(): boolean {
	if (typeof window === 'undefined') return false;
	return /^#\/(game|multiplayer)\b/i.test(window.location.hash);
}

export const AppUpdateToast: React.FC = () => {
	const state = useSyncExternalStore(
		appUpdateManager.subscribe,
		appUpdateManager.getSnapshot,
		appUpdateManager.getSnapshot,
	);
	const [inLiveMatch, setInLiveMatch] = useState<boolean>(isLiveMatchRoute);

	useEffect(() => {
		const handleHashChange = () => setInLiveMatch(isLiveMatchRoute());
		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
	}, []);

	if (!isAppUpdateToastVisible(state)) {
		return null;
	}

	const hasVersionMeta = Boolean(state.latestAppVersion || state.latestBuildHash);
	const revisionLabel = hasVersionMeta
		? formatVersionLabel(state.latestAppVersion, state.latestBuildHash)
		: 'New version ready';

	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="app-update-toast"
			className="fixed bottom-4 right-4 z-[99990] max-w-sm rounded-lg border border-gold-400/50 bg-obsidian-950/95 px-4 py-3 text-ink-0 shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-md"
		>
			<div className="flex items-start gap-3">
				<button
					type="button"
					disabled={state.isApplying}
					onClick={() => void appUpdateManager.applyUpdate()}
					className="group flex flex-1 items-center gap-3 text-left focus:outline-none disabled:cursor-wait"
				>
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold-400/40 bg-gold-500/15 text-gold-300 transition-colors group-hover:bg-gold-500/25">
						<RotateCw
							className={`h-4 w-4 ${state.isApplying ? 'animate-spin' : ''}`}
						/>
					</span>
					<span className="min-w-0 flex-1">
						<span className="block font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-300">
							{state.isApplying ? 'Installing...' : 'Update Available'}
						</span>
						<span className="mt-0.5 block text-xs text-ink-200">
							{state.isApplying
								? 'Refreshing workers & assets'
								: `${revisionLabel} · Click to install`}
						</span>
						{!state.isApplying && inLiveMatch && (
							<span className="mt-1 block text-[11px] text-ink-400">
								Finish match before installing
							</span>
						)}
					</span>
					<span className="shrink-0 rounded border border-gold-300/60 bg-linear-to-b from-gold-300 to-gold-500 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-obsidian-950 transition-transform group-hover:scale-[1.03]">
						{state.isApplying ? 'Installing...' : 'Install New Version'}
					</span>
				</button>

				{!state.isApplying && (
					<button
						type="button"
						aria-label="Dismiss update notification"
						onClick={() => appUpdateManager.dismissUpdate()}
						className="-mr-1 -mt-1 rounded p-1 text-ink-400 transition-colors hover:bg-obsidian-800 hover:text-ink-100"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>
		</div>
	);
};
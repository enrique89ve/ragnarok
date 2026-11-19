import React, { useSyncExternalStore } from 'react';
import { RotateCw, X } from 'lucide-react';
import {
	appUpdateManager,
	isAppUpdateToastVisible,
} from '../lib/appUpdateManager';

export const AppUpdateToast: React.FC = () => {
	const state = useSyncExternalStore(
		appUpdateManager.subscribe,
		appUpdateManager.getSnapshot,
		appUpdateManager.getSnapshot,
	);

	if (!isAppUpdateToastVisible(state)) {
		return null;
	}

	const revisionLabel = state.latestBuildHash
		? `Build ${state.latestBuildHash}`
		: 'New revision ready';

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
							{state.isApplying ? 'Updating Ragnarok...' : 'Update Available'}
						</span>
						<span className="mt-0.5 block text-xs text-ink-200">
							{state.isApplying
								? 'Refreshing workers & assets'
								: `${revisionLabel} · Click to refresh`}
						</span>
					</span>
					<span className="shrink-0 rounded border border-gold-300/60 bg-linear-to-b from-gold-300 to-gold-500 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-obsidian-950 transition-transform group-hover:scale-[1.03]">
						{state.isApplying ? '...' : 'Update'}
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

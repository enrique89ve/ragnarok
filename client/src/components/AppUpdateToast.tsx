import React, { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCw, X } from 'lucide-react';
import {
	appUpdateManager,
	formatVersionLabel,
	isAppUpdatePromptVisible,
	type AppUpdateState,
} from '../lib/appUpdateManager';

function isLiveMatchRoute(): boolean {
	if (typeof window === 'undefined') return false;
	return /^#\/(game|multiplayer)\b/i.test(window.location.hash);
}

function formatBuildTime(builtAt: string | null): string | null {
	if (!builtAt) return null;
	const parsed = Date.parse(builtAt);
	if (Number.isNaN(parsed)) return null;
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(parsed));
	} catch {
		return null;
	}
}

function LiveMatchUpdateToast({ state }: { state: AppUpdateState }) {
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
				<div className="min-w-0 flex-1">
					<span className="block font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-300">
						Update Available
					</span>
					<span className="mt-0.5 block text-xs text-ink-200">{revisionLabel}</span>
					<span className="mt-1 block text-[11px] text-ink-400">
						Finish match before installing
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						disabled={state.isApplying}
						onClick={() => void appUpdateManager.applyUpdate()}
						className="inline-flex items-center gap-1.5 rounded border border-gold-300/60 bg-linear-to-b from-gold-300 to-gold-500 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-obsidian-950 transition-transform hover:scale-[1.03] disabled:cursor-wait disabled:opacity-60"
					>
						{state.isApplying && <RotateCw className="h-3 w-3 animate-spin" aria-hidden />}
						{state.isApplying ? 'Installing...' : 'Install New Version'}
					</button>
					{!state.isApplying && (
						<button
							type="button"
							aria-label="Dismiss update notification"
							onClick={() => appUpdateManager.dismissUpdate()}
							className="rounded p-1 text-ink-400 transition-colors hover:bg-obsidian-800 hover:text-ink-100"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function AppUpdateModalDialog({ state }: { state: AppUpdateState }) {
	const titleId = useId();
	const descId = useId();
	const installButtonRef = useRef<HTMLButtonElement | null>(null);

	const handleDismiss = useCallback(() => {
		if (state.isApplying) return;
		appUpdateManager.dismissUpdate();
	}, [state.isApplying]);

	useEffect(() => {
		installButtonRef.current?.focus();
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !state.isApplying) {
				handleDismiss();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [handleDismiss, state.isApplying]);

	const hasVersionMeta = Boolean(state.latestAppVersion || state.latestBuildHash);
	const buildTimeLabel = formatBuildTime(state.latestBuiltAt);

	return (
		<div
			role="presentation"
			className="fixed inset-0 z-[99990] flex items-center justify-center bg-obsidian-950/82 px-4 backdrop-blur-sm"
			onMouseDown={() => {
				if (!state.isApplying) handleDismiss();
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				data-testid="app-update-modal"
				className="w-full max-w-md rounded-lg border border-gold-300/35 bg-obsidian-900/95 text-ink-0 shadow-2xl shadow-black/60"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<header className="flex items-start justify-between gap-4 border-b border-obsidian-700 px-5 py-4">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-300">
							System Update
						</p>
						<h2
							id={titleId}
							className="mt-1 font-display text-lg uppercase tracking-[0.08em] text-ink-0"
						>
							{state.isApplying ? 'Installing Update...' : 'New Version Available'}
						</h2>
					</div>
					{!state.isApplying && (
						<button
							type="button"
							onClick={handleDismiss}
							aria-label="Close update dialog"
							className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-obsidian-700 bg-obsidian-950/70 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
						>
							<X size={15} strokeWidth={2.2} aria-hidden />
						</button>
					)}
				</header>

				<div id={descId} className="space-y-4 px-5 py-5 text-sm leading-6 text-ink-200">
					<p>
						A new version of Ragnarok is available. Install it now to refresh cached assets
						and run the latest build.
					</p>

					<div className="rounded-md border border-obsidian-700 bg-obsidian-950/50 p-3">
						<div className="grid grid-cols-2 gap-3 text-xs">
							<div>
								<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
									Current
								</p>
								<p className="mt-1 font-mono text-ink-100">
									{formatVersionLabel(state.currentAppVersion, state.currentBuildHash)}
								</p>
							</div>
							<div>
								<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
									Available
								</p>
								<p className="mt-1 font-mono text-gold-300">
									{hasVersionMeta
										? formatVersionLabel(state.latestAppVersion, state.latestBuildHash)
										: 'New version ready'}
								</p>
							</div>
						</div>
						{buildTimeLabel && (
							<p className="mt-3 text-[11px] text-ink-400">Built {buildTimeLabel}</p>
						)}
					</div>
				</div>

				<footer className="flex flex-col gap-3 border-t border-obsidian-700 px-5 py-4">
					<button
						ref={installButtonRef}
						type="button"
						disabled={state.isApplying}
						onClick={() => void appUpdateManager.applyUpdate()}
						className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold-300/60 bg-linear-to-b from-gold-300 to-gold-500 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-[0.1em] text-obsidian-950 transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
					>
						{state.isApplying && (
							<RotateCw className="h-4 w-4 animate-spin" aria-hidden />
						)}
						{state.isApplying ? 'Installing...' : 'Install New Version'}
					</button>
					{!state.isApplying && (
						<div className="flex flex-col items-center gap-1">
							<button
								type="button"
								onClick={() => appUpdateManager.dismissUpdate()}
								className="text-sm text-ink-300 transition-colors hover:text-ink-100"
							>
								Later
							</button>
							<p className="text-center text-[11px] text-ink-500">
								You can install updates anytime from Settings.
							</p>
						</div>
					)}
				</footer>
			</div>
		</div>
	);
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

	if (!isAppUpdatePromptVisible(state)) {
		return null;
	}

	if (inLiveMatch) {
		return <LiveMatchUpdateToast state={state} />;
	}

	return <AppUpdateModalDialog state={state} />;
};

export const AppUpdateModal = AppUpdateToast;
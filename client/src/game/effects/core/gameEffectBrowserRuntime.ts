import { gameEffectCoordinator } from './gameEffectCoordinator';

/** Browser-only adapter. The coordinator itself remains DOM/Worker agnostic. */
export function startGameEffectBrowserRuntime(): () => void {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};

	const media = window.matchMedia('(prefers-reduced-motion: reduce)');
	const syncPreference = () => gameEffectCoordinator.setReducedMotion(media.matches);
	syncPreference();
	media.addEventListener?.('change', syncPreference);

	return () => {
		media.removeEventListener?.('change', syncPreference);
	};
}

/**
 * Single-channel arena camera shake.
 *
 * Targets `.game-viewport-wrapper` (never `.game-viewport`, which holds the
 * responsive scale transform) via CSS keyframes defined in GameViewport.css.
 * Replaces competing GSAP shakes and state-diff shakes so every impact hits
 * once at the exact contact frame.
 */

import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';

export type ArenaShakeIntensity = 'mild' | 'heavy' | 'lethal';

const SHAKE_CLASS: Record<ArenaShakeIntensity, string> = {
	mild: 'screen-shake-mild',
	heavy: 'screen-shake-impact-heavy',
	lethal: 'screen-shake-impact-lethal',
};

const SHAKE_DURATION_MS: Record<ArenaShakeIntensity, number> = {
	mild: 300,
	heavy: 240,
	lethal: 280,
};

const ALL_SHAKE_CLASSES = Object.values(SHAKE_CLASS);

export function triggerArenaShake(intensity: ArenaShakeIntensity): void {
	const wrapper = getArenaVfxLayer(ARENA_VFX_LAYERS.viewportWrapper);
	if (!wrapper) return;

	wrapper.classList.remove(...ALL_SHAKE_CLASSES);
	// Force reflow so consecutive shakes restart cleanly.
	void wrapper.offsetWidth;
	const cls = SHAKE_CLASS[intensity];
	wrapper.classList.add(cls);

	gameEffectCoordinator.schedule({
		owner: 'arena-camera',
		lane: 'shake',
		key: 'viewport-shake',
		priority: intensity === 'lethal' ? 'critical' : 'high',
		delayMs: SHAKE_DURATION_MS[intensity],
		run: () => {
			wrapper.classList.remove(cls);
		},
	});
}

export function clearArenaShake(): void {
	gameEffectCoordinator.cancelOwnerLane('arena-camera', 'shake');
	const wrapper = getArenaVfxLayer(ARENA_VFX_LAYERS.viewportWrapper);
	if (wrapper) {
		wrapper.classList.remove(...ALL_SHAKE_CLASSES);
	}
}

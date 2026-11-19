/**
 * Presentation-only HP latch for hero vitals.
 *
 * Gameplay state commits immediately from canonical rules. To prevent the HP
 * bar from "spoiling the hit" before an attack or showdown blast lands, a
 * choreography sequence can latch a hero's displayed HP at its pre-impact
 * value and release it at the exact impact beat.
 *
 * Safety invariant: every latch carries a bounded TTL scheduled through
 * `gameEffectCoordinator` so a cancelled or failed animation can never leave
 * displayed HP stale.
 */

import { create } from 'zustand';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';
import type { ArenaVfxOwner } from '../arenaVfxTargets';

const DEFAULT_MAX_HOLD_MS = 1_800;

interface HeroHpHold {
	readonly heldHp: number;
	readonly token: string;
}

interface VisualVitalsHoldState {
	readonly heroHpHolds: Partial<Record<ArenaVfxOwner, HeroHpHold>>;
}

const activeTimers = new Map<ArenaVfxOwner, GameEffectHandle>();

export const useVisualVitalsHoldStore = create<VisualVitalsHoldState>(() => ({
	heroHpHolds: {},
}));

export function holdHeroVisualHp(
	side: ArenaVfxOwner,
	preImpactHp: number,
	token: string,
	maxHoldMs = DEFAULT_MAX_HOLD_MS,
): void {
	if (!Number.isFinite(preImpactHp) || preImpactHp < 0) return;

	activeTimers.get(side)?.cancel();
	useVisualVitalsHoldStore.setState((state) => ({
		heroHpHolds: {
			...state.heroHpHolds,
			[side]: { heldHp: preImpactHp, token },
		},
	}));

	const handle = gameEffectCoordinator.schedule({
		owner: 'visual-vitals-hold',
		lane: 'hp-hold',
		key: side,
		priority: 'high',
		delayMs: Math.max(50, maxHoldMs),
		run: () => releaseHeroVisualHp(side, token),
	});
	activeTimers.set(side, handle);
}

export function releaseHeroVisualHp(side: ArenaVfxOwner, token?: string): void {
	const current = useVisualVitalsHoldStore.getState().heroHpHolds[side];
	if (!current) return;
	if (token !== undefined && current.token !== token) return;

	activeTimers.get(side)?.cancel();
	activeTimers.delete(side);

	useVisualVitalsHoldStore.setState((state) => {
		const next = { ...state.heroHpHolds };
		delete next[side];
		return { heroHpHolds: next };
	});
}

export function clearAllVisualVitalsHolds(): void {
	for (const handle of activeTimers.values()) {
		handle.cancel();
	}
	activeTimers.clear();
	useVisualVitalsHoldStore.setState({ heroHpHolds: {} });
}

export function useVisualHeroHp(side: ArenaVfxOwner, canonicalHp: number): number {
	const held = useVisualVitalsHoldStore((state) => state.heroHpHolds[side]);
	return held ? held.heldHp : canonicalHp;
}

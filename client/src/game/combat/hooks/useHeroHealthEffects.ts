/**
 * Legacy compatibility hook kept for RagnarokCombatArena.
 *
 * Arena camera shake is now driven exclusively at the exact impact beat via
 * `triggerArenaShake` (`combat/vfx/arenaShake.ts`) from combatImpactHandler
 * and Showdown choreography, rather than on raw Zustand HP diffs at t=0.
 */

interface UseHeroHealthEffectsParams {
	playerHeroHealth: number;
	opponentHeroHealth: number;
}

export function useHeroHealthEffects(_params: UseHeroHealthEffectsParams) {
	return { outerShakeClass: '' };
}

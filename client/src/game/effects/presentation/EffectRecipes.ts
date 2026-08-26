import type { CombatPresentation, EffectRecipeStep } from './types';

const step = (primitive: EffectRecipeStep['primitive'], delayMs: number): EffectRecipeStep => ({
	primitive,
	delayMs,
});

export const BASIC_ATTACK_RECIPE: readonly EffectRecipeStep[] = [
	step('slashTrail', 0),
	step('impact-normal', 0),
	step('white-flash', 0),
];

export const LIGHT_ATTACK_RECIPE: readonly EffectRecipeStep[] = [
	step('slashTrail', 0),
	step('impact-light', 0),
	step('white-flash', 0),
];

export const HEAVY_ATTACK_RECIPE: readonly EffectRecipeStep[] = [
	step('slashTrail', 0),
	step('impact-heavy', 0),
	step('impactRing', 0),
	step('sparkBurst', 0),
];

export const SHIELD_ATTACK_RECIPE: readonly EffectRecipeStep[] = [
	step('slashTrail', 0),
	step('shield-flash', 0),
	step('sparkBurst', 0),
];

export const LETHAL_ATTACK_RECIPE: readonly EffectRecipeStep[] = [
	...HEAVY_ATTACK_RECIPE,
	step('smokePuff', 0),
];

/**
 * Kept as an explicit recipe for future resolved critical-hit outcomes.
 * CombatStep does not currently expose criticality, so this is not inferred
 * from damage and is intentionally not selected by the default resolver.
 */
export const CRITICAL_HIT_RECIPE: readonly EffectRecipeStep[] = [
	step('slashTrail', 0),
	step('shine', 0),
	step('impact-heavy', 0),
	step('sparkBurst', 0),
	step('impactRing', 0),
];

export function recipeForCombatPresentation(
	presentation: CombatPresentation,
	impactKind: 'target' | 'counter' = 'target',
): readonly EffectRecipeStep[] {
	const impact = impactKind === 'counter'
		? presentation.counter
		: presentation.target;
	if (!impact) return [];
	if (impact.outcome === 'shield') return SHIELD_ATTACK_RECIPE;
	if (impact.lethal === true) return LETHAL_ATTACK_RECIPE;
	if (impact.level === 'light') return LIGHT_ATTACK_RECIPE;
	return impact.level === 'heavy' ? HEAVY_ATTACK_RECIPE : BASIC_ATTACK_RECIPE;
}

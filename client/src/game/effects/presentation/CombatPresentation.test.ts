import { describe, expect, it } from 'vitest';
import {
	buildCombatPresentation,
	buildCombatPresentationFromResolvedAttack,
	impactLevelFor,
} from './CombatPresentation';
import { CRITICAL_HIT_RECIPE, recipeForCombatPresentation } from './EffectRecipes';
import type { CombatStep } from '@/game/services/AttackResolutionService';

function makeStep(overrides: Partial<CombatStep> = {}): CombatStep {
	return {
		id: 'step-1',
		attackerId: 'attacker-1',
		attackerName: 'Attacker',
		attackerAttack: 8,
		targetId: 'target-1',
		targetName: 'Target',
		targetType: 'minion',
		targetAttack: 3,
		damage: 8,
		counterDamage: 3,
		attackerHasDivineShield: false,
		defenderHasDivineShield: false,
		resolved: false,
		timestamp: 1,
		attackerSide: 'player',
		...overrides,
	};
}

describe('combat presentation contract', () => {
	it('maps a CombatStep to semantic targets without resolving gameplay', () => {
		const presentation = buildCombatPresentation(makeStep());

		expect(presentation).toMatchObject({
			action: 'melee-hit',
			source: { type: 'card', instanceId: 'attacker-1' },
			target: {
				target: { type: 'card', instanceId: 'target-1' },
				amount: 8,
				level: 'heavy',
				outcome: 'damage',
				lethal: null,
			},
			counter: {
				source: { type: 'card', instanceId: 'target-1' },
				target: { type: 'card', instanceId: 'attacker-1' },
				amount: 3,
			},
		});
	});

	it('represents shield absorption as an outcome and preserves hero side', () => {
		const presentation = buildCombatPresentation(makeStep({
			targetId: null,
			targetType: 'hero',
			defenderHasDivineShield: true,
			counterDamage: 0,
		}));

		expect(presentation.target).toMatchObject({
			target: { type: 'hero', side: 'opponent' },
			outcome: 'shield',
			amount: 8,
		});
		expect(presentation.counter).toBeUndefined();
	});

	it('selects recipes from visual outcomes and keeps thresholds pure', () => {
		expect(impactLevelFor(0)).toBe('light');
		expect(impactLevelFor(4)).toBe('normal');
		expect(impactLevelFor(8)).toBe('heavy');

		const shielded = buildCombatPresentation(makeStep({ defenderHasDivineShield: true }));
		expect(recipeForCombatPresentation(shielded).map(item => item.primitive)).toEqual([
			'slashTrail',
			'shield-flash',
			'sparkBurst',
		]);
		expect(CRITICAL_HIT_RECIPE).toContainEqual({
			primitive: 'shine',
			delayMs: 0,
		});
	});

	it('maps resolved shield and lethal facts without reading card state', () => {
		const presentation = buildCombatPresentationFromResolvedAttack({
			id: 'resolved-1',
			attackerId: 'attacker-1',
			targetId: 'target-1',
			targetType: 'minion',
			attackerSide: 'player',
			damageToTarget: 8,
			damageToAttacker: 3,
			healthDamageToTarget: 0,
			healthDamageToAttacker: 3,
			targetHealthBefore: 5,
			targetHealthAfter: 5,
			attackerHealthBefore: 5,
			attackerHealthAfter: 2,
			targetShieldConsumed: true,
			attackerShieldConsumed: false,
			targetLethal: false,
			attackerLethal: false,
			counterAttackOccurred: true,
			triggeredEffects: [],
			statChanges: [],
			zoneChanges: [],
		});

		expect(presentation.target).toMatchObject({ outcome: 'shield', amount: 8, lethal: false });
		expect(presentation.counter).toMatchObject({ amount: 3, lethal: false });
	});
});

import type { CombatStep, ResolvedAttack } from '@/game/services/AttackResolutionService';
import type {
	CombatPresentation,
	ImpactLevel,
	PresentationImpact,
	PresentationTarget,
} from './types';

function opposingSide(side: 'player' | 'opponent'): 'player' | 'opponent' {
	return side === 'player' ? 'opponent' : 'player';
}

export function impactLevelFor(amount: number): ImpactLevel {
	if (amount >= 8) return 'heavy';
	if (amount >= 4) return 'normal';
	return 'light';
}

export function presentationTargetForStep(
	step: Pick<CombatStep, 'targetId' | 'targetType' | 'attackerSide'>,
): PresentationTarget {
	const defenderSide = opposingSide(step.attackerSide);
	if (step.targetType === 'hero') {
		return { type: 'hero', side: defenderSide };
	}
	if (step.targetId) {
		return { type: 'card', instanceId: step.targetId };
	}
	return { type: 'field', side: defenderSide };
}

function createImpact(
	target: PresentationTarget,
	amount: number,
	shielded: boolean,
	lethal: boolean | null,
	healthDamage = shielded ? 0 : amount,
): PresentationImpact {
	const safeAmount = Math.max(0, amount);
	return {
		target,
		amount: safeAmount,
		healthDamage: Math.max(0, healthDamage),
		level: impactLevelFor(safeAmount),
		outcome: shielded ? 'shield' : 'damage',
		lethal,
	};
}

/**
 * Maps resolved combat context to presentation-only data.
 *
 * This function never chooses targets, applies damage, or computes a game
 * outcome. `lethal` is intentionally supplied by a later resolver when the
 * gameplay path knows the post-impact result.
 */
export function buildCombatPresentation(
	step: CombatStep,
	outcomes: {
		readonly targetLethal?: boolean;
		readonly attackerLethal?: boolean;
	} = {},
): CombatPresentation {
	const target = presentationTargetForStep(step);
	const targetImpact = createImpact(
		target,
		step.damage,
		step.defenderHasDivineShield,
		outcomes.targetLethal ?? null,
	);

	const counter = step.targetType === 'minion' && step.targetId && step.counterDamage > 0
		? {
			source: target,
			...createImpact(
				{ type: 'card', instanceId: step.attackerId },
				step.counterDamage,
				step.attackerHasDivineShield,
				outcomes.attackerLethal ?? null,
			),
		}
		: undefined;

	return {
		id: step.id,
		action: 'melee-hit',
		source: { type: 'card', instanceId: step.attackerId },
		attackerSide: step.attackerSide,
		target: targetImpact,
		...(counter ? { counter } : {}),
	};
}

/**
 * Maps the gameplay-owned resolved result into presentation data. The
 * renderer receives the resolved combat amount, shield outcome, and lethal
 * flags; it never has to inspect a CardInstance or recalculate them.
 */
export function buildCombatPresentationFromResolvedAttack(
	resolved: ResolvedAttack,
): CombatPresentation {
	const target = resolved.targetType === 'hero'
		? { type: 'hero' as const, side: opposingSide(resolved.attackerSide) }
		: resolved.targetId
			? { type: 'card' as const, instanceId: resolved.targetId }
			: { type: 'field' as const, side: opposingSide(resolved.attackerSide) };

	const targetImpact = createImpact(
		target,
		resolved.damageToTarget,
		resolved.targetShieldConsumed,
		resolved.targetLethal,
		resolved.healthDamageToTarget,
	);
	const counter = resolved.counterAttackOccurred && resolved.targetType === 'minion'
		&& resolved.targetId
		&& resolved.damageToAttacker > 0
		? {
			source: target,
			...createImpact(
				{ type: 'card' as const, instanceId: resolved.attackerId },
				resolved.damageToAttacker,
				resolved.attackerShieldConsumed,
				resolved.attackerLethal,
				resolved.healthDamageToAttacker,
			),
		}
		: undefined;

	return {
		id: resolved.id,
		action: 'melee-hit',
		source: { type: 'card', instanceId: resolved.attackerId },
		attackerSide: resolved.attackerSide,
		target: targetImpact,
		...(counter ? { counter } : {}),
	};
}

export function buildCombatPresentationFromIntent(input: {
	readonly id: string;
	readonly sourceId: string;
	readonly targetId: string;
	readonly damage: number;
	readonly sourceIsHero?: boolean;
	readonly targetIsHero?: boolean;
	readonly attackerSide?: 'player' | 'opponent';
	readonly shielded?: boolean;
}): CombatPresentation {
	const attackerSide = input.attackerSide ?? 'player';
	const target: PresentationTarget = input.targetIsHero
		? { type: 'hero', side: opposingSide(attackerSide) }
		: { type: 'card', instanceId: input.targetId };
	const source: PresentationTarget = input.sourceIsHero
		? { type: 'hero', side: attackerSide }
		: { type: 'card', instanceId: input.sourceId };

	return {
		id: input.id,
		action: 'melee-hit',
		source,
		attackerSide,
		target: createImpact(target, input.damage, input.shielded ?? false, null),
	};
}

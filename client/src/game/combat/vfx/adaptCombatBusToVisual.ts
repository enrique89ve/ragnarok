/**
 * Combat bus → visual adapter.
 *
 * Translates IMPACT_PHASE into VisualEvents. Never writes HP or game state.
 */
import { CombatEventBus, type ImpactPhaseEvent } from '../../services/CombatEventBus';
import { emitCombatImpact } from './events';
import { attackIntentsFromImpact } from '@/game/effects/poker/attackEffectAdapter';
import {
	buildCombatPresentationFromIntent,
	buildCombatPresentationFromResolvedAttack,
	impactLevelFor,
} from '@/game/effects/presentation/CombatPresentation';
import type { CombatPresentation } from '@/game/effects/presentation/types';

function withResolvedImpactAmounts(
	event: ImpactPhaseEvent,
	presentation: CombatPresentation,
): CombatPresentation {
	const { counter, ...withoutCounter } = presentation;
	const targetAmount = Math.max(0, event.damageToTarget);
	const counterAmount = Math.max(0, event.damageToAttacker);

	return {
		...withoutCounter,
		target: {
			...presentation.target,
			amount: targetAmount,
			level: impactLevelFor(targetAmount),
		},
		...(counter && counterAmount > 0 ? {
			counter: {
				...counter,
				amount: counterAmount,
				level: impactLevelFor(counterAmount),
			},
		} : {}),
	};
}

function presentationForImpact(
	event: ImpactPhaseEvent,
	targetIntent: ReturnType<typeof attackIntentsFromImpact>[number] | undefined,
	counterIntent: ReturnType<typeof attackIntentsFromImpact>[number] | undefined,
): CombatPresentation | undefined {
	if (event.resolvedAttack) {
		return buildCombatPresentationFromResolvedAttack(event.resolvedAttack);
	}
	if (event.presentation) return withResolvedImpactAmounts(event, event.presentation);
	if (!targetIntent) return undefined;

	const targetPresentation = buildCombatPresentationFromIntent({
		id: event.id,
		sourceId: targetIntent.source.entityId,
		targetId: targetIntent.target.entityId,
		damage: targetIntent.impact.amount,
		sourceIsHero: targetIntent.source.entityId.includes('hero'),
		targetIsHero: targetIntent.target.entityId.includes('hero'),
		attackerSide: targetIntent.source.entityId.includes('opponent') ? 'opponent' : 'player',
	});
	if (!counterIntent) return targetPresentation;

	return {
		...targetPresentation,
		counter: {
			source: targetPresentation.target.target,
			target: targetPresentation.source,
			amount: counterIntent.impact.amount,
			level: impactLevelFor(counterIntent.impact.amount),
			outcome: 'damage',
			lethal: null,
		},
	};
}

export function adaptCombatBusToVisual(): () => void {
	return CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', (event) => {
		const intents = attackIntentsFromImpact(event);
		const targetIntent = intents.find(intent => intent.id === `${event.id}:target`);
		const counterIntent = intents.find(intent => intent.id === `${event.id}:counter`);
		const presentation = presentationForImpact(event, targetIntent, counterIntent);
		if (targetIntent) {
			emitCombatImpact({
				attackerId: event.attackerId,
				targetId: event.targetId,
				damage: presentation?.target.amount ?? targetIntent.impact.amount,
				kind: 'hit',
				intent: targetIntent,
				presentation,
				resolvedAttack: event.resolvedAttack,
			});
		} else if (counterIntent) {
			// A counter belongs to the primary attack's visual sequence. Keep this
			// fallback for malformed/legacy events that contain no target impact.
			emitCombatImpact({
				attackerId: event.attackerId,
				targetId: event.attackerId,
				damage: counterIntent.impact.amount,
				kind: 'counter',
				intent: counterIntent,
				presentation,
				resolvedAttack: event.resolvedAttack,
			});
		}
	}, 75);
}

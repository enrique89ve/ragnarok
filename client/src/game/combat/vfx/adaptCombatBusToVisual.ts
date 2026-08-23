/**
 * Combat bus → visual adapter.
 *
 * Translates IMPACT_PHASE into VisualEvents. Never writes HP or game state.
 */
import { CombatEventBus, type ImpactPhaseEvent } from '../../services/CombatEventBus';
import { emitCombatImpact } from './events';
import { attackIntentsFromImpact } from '@/game/effects/poker/attackEffectAdapter';

export function adaptCombatBusToVisual(): () => void {
	return CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', (event) => {
		const intents = attackIntentsFromImpact(event);
		const targetIntent = intents.find(intent => intent.id === `${event.id}:target`);
		const counterIntent = intents.find(intent => intent.id === `${event.id}:counter`);
		if (targetIntent) {
			emitCombatImpact({
				targetId: event.targetId,
				damage: targetIntent.impact.amount,
				kind: 'hit',
				intent: targetIntent,
			});
		}
		if (counterIntent) {
			emitCombatImpact({
				targetId: event.attackerId,
				damage: counterIntent.impact.amount,
				kind: 'counter',
				intent: counterIntent,
			});
		}
	}, 75);
}

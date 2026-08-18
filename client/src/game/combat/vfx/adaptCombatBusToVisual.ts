/**
 * Combat bus → visual adapter.
 *
 * Translates IMPACT_PHASE into VisualEvents. Never writes HP or game state.
 */
import { CombatEventBus, type ImpactPhaseEvent } from '../../services/CombatEventBus';
import { emitCombatImpact } from './events';

export function adaptCombatBusToVisual(): () => void {
	return CombatEventBus.subscribe<ImpactPhaseEvent>('IMPACT_PHASE', (event) => {
		if (event.damageToTarget > 0) {
			emitCombatImpact({
				targetId: event.targetId,
				damage: event.damageToTarget,
				kind: 'hit',
			});
		}
		if (event.damageToAttacker > 0) {
			emitCombatImpact({
				targetId: event.attackerId,
				damage: event.damageToAttacker,
				kind: 'counter',
			});
		}
	}, 75);
}

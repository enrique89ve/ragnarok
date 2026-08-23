import type { ImpactPhaseEvent } from '@/game/services/CombatEventBus';
import {
	createAttackEffectIntent,
	type AttackEffectIntent,
} from '../core/effectIntentTypes';

/**
 * Pure combat-to-presentation mapping. The result is structured-clone safe,
 * so a future worker can produce it without importing the DOM or a renderer.
 */
export function attackIntentsFromImpact(event: ImpactPhaseEvent): readonly AttackEffectIntent[] {
	const intents: AttackEffectIntent[] = [];

	if (event.damageToTarget > 0) {
		intents.push(createAttackEffectIntent({
			id: `${event.id}:target`,
			domain: 'poker',
			sourceId: event.attackerId,
			targetId: event.targetId,
			damage: event.damageToTarget,
			sourceAnchor: 'center',
			targetAnchor: 'center',
			motion: 'melee',
			timestamp: event.timestamp,
		}));
	}

	if (event.damageToAttacker > 0) {
		intents.push(createAttackEffectIntent({
			id: `${event.id}:counter`,
			domain: 'poker',
			sourceId: event.targetId,
			targetId: event.attackerId,
			damage: event.damageToAttacker,
			sourceAnchor: 'center',
			targetAnchor: 'center',
			motion: 'melee',
			timestamp: event.timestamp,
			priority: 'high',
		}));
	}

	return intents;
}

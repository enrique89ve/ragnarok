import { useEffect, useRef } from 'react';
import { useAIAttackAnimationStore } from '../stores/aiAttackAnimationStore';
import { publishAIAttackImpact } from '../combat/aiAttackPresentation';
import { useMatchStore } from '../match/store';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
} from '@/game/effects/core/gameEffectCoordinator';
import { COMBAT_LETHAL_TIMELINE_MS } from '../combat/vfx/combatVisualLifetime';

const AI_ATTACK_CADENCE_MS = COMBAT_LETHAL_TIMELINE_MS.travel + COMBAT_LETHAL_TIMELINE_MS.impact;

/** Spaces resolved AI attacks while the shared combat impact handler plays their effects. */
export default function AIAttackAnimationProcessor() {
	const pendingCount = useAIAttackAnimationStore(state => state.pendingAttacks.length);
	const currentAttack = useAIAttackAnimationStore(state => state.currentAttack);
	const startAnimation = useAIAttackAnimationStore(state => state.startAnimation);
	const completeAnimation = useAIAttackAnimationStore(state => state.completeAnimation);
	const cadenceHandleRef = useRef<GameEffectHandle | null>(null);

	useEffect(() => () => cadenceHandleRef.current?.cancel(), []);

	useEffect(() => {
		if (pendingCount === 0 || currentAttack) return;

		const event = startAnimation(useMatchStore.getState().activeMatch);
		if (!event) return;

		const attack = event.resolvedAttack;
		publishAIAttackImpact(attack);

		const cadenceMs = attack.counterAttackOccurred
			? AI_ATTACK_CADENCE_MS + COMBAT_LETHAL_TIMELINE_MS.counterImpact
			: AI_ATTACK_CADENCE_MS;
		const handle = gameEffectCoordinator.schedule({
			owner: 'ai-attack-cadence',
			lane: 'queue',
			key: attack.id,
			priority: 'normal',
			delayMs: cadenceMs,
			run: () => completeAnimation(event),
		});
		cadenceHandleRef.current = handle;
		void handle.onComplete?.then(() => {
			if (cadenceHandleRef.current === handle) cadenceHandleRef.current = null;
			completeAnimation(event);
		});
	}, [pendingCount, currentAttack, startAnimation, completeAnimation]);

	return null;
}
